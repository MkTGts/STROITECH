import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getUserId } from "../lib/auth";
import { sendToUser } from "../ws/handler";

const createObjectSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  region: z.string().min(2).optional(),
  stages: z.array(z.object({
    stageType: z.enum(["realty", "project", "foundation", "walls", "roof", "engineering", "finish", "furniture"]),
    materialsRequest: z.string().optional(),
    buildersRequest: z.string().optional(),
    equipmentRequest: z.string().optional(),
  })).min(1),
});

const updateObjectSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional().nullable(),
  region: z.string().min(2).optional().nullable(),
});

/**
 * Construction object management routes with subscription check.
 */
export async function objectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request: FastifyRequest) => {
    const { page = "1", limit = "20", status } = request.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { isVisible: true };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.constructionObject.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, companyName: true, avatarUrl: true } },
          stages: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.constructionObject.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  });

  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const obj = await prisma.constructionObject.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, companyName: true, avatarUrl: true, phone: true } },
        stages: { orderBy: { stageType: "asc" } },
      },
    });

    if (!obj) {
      return reply.status(404).send({ success: false, message: "Объект не найден" });
    }
    return { success: true, data: obj };
  });

  app.post(
    "/",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const hasActiveSubscription = await _checkSubscription(userId);
      if (!hasActiveSubscription) {
        return reply.status(403).send({
          success: false,
          message: "Для создания объекта необходима активная подписка",
        });
      }

      const body = createObjectSchema.parse(request.body);
      const obj = await prisma.constructionObject.create({
        data: {
          userId,
          title: body.title,
          description: body.description,
          region: body.region ?? null,
          currentStage: body.stages[0].stageType,
          stages: {
            create: body.stages.map((s) => ({
              stageType: s.stageType,
              materialsRequest: s.materialsRequest,
              buildersRequest: s.buildersRequest,
              equipmentRequest: s.equipmentRequest,
            })),
          },
        },
        include: { stages: true },
      });

      await _notifyExecutors(obj.id, body.stages);

      return reply.status(201).send({ success: true, data: obj });
    },
  );

  app.put(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { id } = request.params as { id: string };
      const body = updateObjectSchema.parse(request.body);

      const existing = await prisma.constructionObject.findFirst({ where: { id, userId } });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }

      const data: Record<string, unknown> = {};
      if (body.title !== undefined) data.title = body.title;
      if (body.description !== undefined) data.description = body.description;
      if (body.region !== undefined) data.region = body.region;

      const obj = await prisma.constructionObject.update({
        where: { id },
        data,
        include: { stages: true },
      });
      return { success: true, data: obj };
    },
  );

  app.put(
    "/:id/stages/:stageId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { id, stageId } = request.params as { id: string; stageId: string };

      const obj = await prisma.constructionObject.findFirst({
        where: { id, userId },
        include: { stages: { select: { id: true } } },
      });
      if (!obj) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }
      const stageBelongsToObject = obj.stages.some((s) => s.id === stageId);
      if (!stageBelongsToObject) {
        return reply.status(404).send({ success: false, message: "Этап не найден" });
      }

      const body = request.body as any;
      const stage = await prisma.objectStage.update({
        where: { id: stageId },
        data: {
          status: body.status,
          materialsRequest: body.materialsRequest ?? null,
          buildersRequest: body.buildersRequest ?? null,
          equipmentRequest: body.equipmentRequest ?? null,
        },
      });

      return { success: true, data: stage };
    },
  );
}

async function _checkSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      plan: { in: ["basic", "premium"] },
      expiresAt: { gt: new Date() },
    },
  });
  return subscription !== null;
}

async function _notifyExecutors(objectId: string, stages: any[]): Promise<void> {
  const hasBuilders = stages.some((s) => s.buildersRequest);
  const hasMaterials = stages.some((s) => s.materialsRequest);
  const hasEquipment = stages.some((s) => s.equipmentRequest);

  const roles: string[] = [];
  if (hasBuilders) roles.push("builder");
  if (hasMaterials) roles.push("supplier");
  if (hasEquipment) roles.push("equipment");

  if (roles.length === 0) return;

  const users = await prisma.user.findMany({
    where: { role: { in: roles as any } },
    select: { id: true },
    take: 100,
  });

  if (users.length === 0) return;

  for (const u of users) {
    const notification = await prisma.notification.create({
      data: {
        userId: u.id,
        type: "new_object",
        content: "Появился новый объект! Посмотрите и предложите свои услуги.",
        metadata: { objectId },
      },
    });

    sendToUser(u.id, { type: "notification", payload: notification });
  }
}
