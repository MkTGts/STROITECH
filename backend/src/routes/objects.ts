import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { SubscriptionPlan, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getUserId, getOptionalUserId, getUserRole } from "../lib/auth";
import { sendToUser } from "../ws/handler";

const stageTypeSchema = z.enum(["foundation", "walls", "roof", "engineering", "finish", "furniture"]);

const stageItemSchema = z.object({
  stageType: stageTypeSchema,
  materialsRequest: z.string().optional(),
  buildersRequest: z.string().optional(),
  equipmentRequest: z.string().optional(),
});

const createObjectSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().optional(),
    region: z.string().min(2).optional(),
    stages: z.array(stageItemSchema).default([]),
    isDraft: z.boolean().optional(),
  })
  .refine((d) => d.isDraft === true || d.stages.length >= 1, {
    message: "Укажите хотя бы один этап для публикации объекта",
    path: ["stages"],
  });

const updateObjectSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional().nullable(),
  region: z.string().min(2).optional().nullable(),
});

const setStatusSchema = z.object({
  status: z.enum(["active", "completed"]),
});

const createStageSchema = z.object({
  stageType: stageTypeSchema,
  materialsRequest: z.string().optional(),
  buildersRequest: z.string().optional(),
  equipmentRequest: z.string().optional(),
});

/**
 * Construction object management routes with subscription check.
 */
export async function objectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const { page = "1", limit = "20", status, region, userId: requestedUserId } = request.query as Record<string, string>;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const currentUserId = getOptionalUserId(request);
    const role = request.user ? getUserRole(request) : null;

    const baseWhere: Record<string, unknown> = {
      ...(region ? { region } : {}),
      ...(requestedUserId ? { userId: requestedUserId } : {}),
    };
    const isModerator = role === "moderator";
    const canSeeDraftsForRequested =
      isModerator || (currentUserId && (!requestedUserId || requestedUserId === currentUserId));
    const visibleWhere = isModerator
      ? { ...baseWhere }
      : { ...baseWhere, isVisible: true, status: { not: "draft" as const } };
    const draftWhere = isModerator
      ? { ...baseWhere }
      : canSeeDraftsForRequested && currentUserId
        ? { ...baseWhere, userId: currentUserId, status: "draft" as const }
        : null;

    if (status) {
      // Filter by status: then only apply status filter
      const where: any =
        status === "draft"
          ? isModerator
            ? { ...baseWhere, status: "draft" }
            : { ...baseWhere, userId: currentUserId || "", status: "draft" }
          : { ...visibleWhere, status };
      if (status === "draft" && !currentUserId && !isModerator) {
        return {
          success: true,
          data: { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
        };
      }
      const [items, total] = await Promise.all([
        prisma.constructionObject.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, companyName: true, avatarUrl: true } },
            stages: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.constructionObject.count({ where }),
      ]);
      return {
        success: true,
        data: { items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      };
    }

    if ((!currentUserId || !canSeeDraftsForRequested) && !isModerator) {
      const [items, total] = await Promise.all([
        prisma.constructionObject.findMany({
          where: visibleWhere,
          include: {
            user: { select: { id: true, name: true, companyName: true, avatarUrl: true } },
            stages: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.constructionObject.count({ where: visibleWhere }),
      ]);
      return {
        success: true,
        data: { items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      };
    }

    const [drafts, draftCount, otherCount] = isModerator
      ? await Promise.all([
          prisma.constructionObject.findMany({
            where: { ...baseWhere, status: "draft" },
            include: {
              user: { select: { id: true, name: true, companyName: true, avatarUrl: true } },
              stages: true,
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.constructionObject.count({ where: { ...baseWhere, status: "draft" } }),
          prisma.constructionObject.count({ where: { ...baseWhere, status: { not: "draft" } } }),
        ])
      : await Promise.all([
          prisma.constructionObject.findMany({
            where: draftWhere!,
            include: {
              user: { select: { id: true, name: true, companyName: true, avatarUrl: true } },
              stages: true,
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.constructionObject.count({ where: draftWhere ?? undefined }),
          prisma.constructionObject.count({ where: visibleWhere }),
        ]);

    const total = draftCount + otherCount;
    const totalPages = Math.ceil(total / limitNum);
    const includeUser = { user: { select: { id: true, name: true, companyName: true, avatarUrl: true } }, stages: true };

    let items: any[];
    if (pageNum === 1) {
      const restTake = Math.max(0, limitNum - drafts.length);
      const rest = restTake > 0
        ? await prisma.constructionObject.findMany({
            where: visibleWhere,
            include: includeUser,
            orderBy: { createdAt: "desc" },
            take: restTake,
          })
        : [];
      items = [...drafts, ...rest];
    } else {
      const restSkip = (pageNum - 1) * limitNum - drafts.length;
      items = await prisma.constructionObject.findMany({
        where: visibleWhere,
        include: includeUser,
        orderBy: { createdAt: "desc" },
        skip: Math.max(0, restSkip),
        take: limitNum,
      });
    }

    return {
      success: true,
      data: { items, total, page: pageNum, limit: limitNum, totalPages },
    };
  });

  app.get("/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const currentUserId = getOptionalUserId(request);
    const role = request.user ? getUserRole(request) : null;
    const isModerator = role === "moderator";

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
    if (!isModerator && obj.status === "draft" && obj.userId !== currentUserId) {
      return reply.status(404).send({ success: false, message: "Объект не найден" });
    }
    return { success: true, data: obj };
  });

  app.post(
    "/",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const body = createObjectSchema.parse(request.body);
      const isDraft = body.isDraft === true;

      if (!isDraft) {
        const hasActiveSubscription = await _checkSubscription(userId);
        if (!hasActiveSubscription) {
          return reply.status(403).send({
            success: false,
            message: "Для публикации объекта необходима активная подписка",
          });
        }
      }

      const status = isDraft ? "draft" : "active";
      const stages =
        body.stages.length > 0
          ? body.stages
          : [
              {
                stageType: "foundation" as const,
                materialsRequest: undefined,
                buildersRequest: undefined,
                equipmentRequest: undefined,
              },
            ];
      const currentStage = stages[0].stageType;

      const obj = await prisma.constructionObject.create({
        data: {
          userId,
          title: body.title,
          description: body.description ?? null,
          region: body.region ?? null,
          currentStage,
          status,
          stages: {
            create: stages.map((s) => ({
              stageType: s.stageType,
              materialsRequest: s.materialsRequest ?? null,
              buildersRequest: s.buildersRequest ?? null,
              equipmentRequest: s.equipmentRequest ?? null,
            })),
          },
        },
        include: { stages: true },
      });

      if (!isDraft) {
        await _notifyExecutors(obj.id, body.stages);
      }

      return reply.status(201).send({ success: true, data: obj });
    },
  );

  app.delete(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";
      const { id } = request.params as { id: string };

      const where: any = isModerator ? { id } : { id, userId };
      const existing = await prisma.constructionObject.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }
      if (!isModerator && existing.status !== "draft") {
        return reply.status(400).send({
          success: false,
          message: "Удалить можно только объект со статусом «Черновик»",
        });
      }

      await prisma.constructionObject.delete({ where: { id } });
      return reply.status(200).send({ success: true, message: "Объект удалён" });
    },
  );

  app.put(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";
      const { id } = request.params as { id: string };
      const body = updateObjectSchema.parse(request.body);

      const where: any = isModerator ? { id } : { id, userId };
      const existing = await prisma.constructionObject.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }
      if (!isModerator && existing.status === "completed") {
        return reply.status(400).send({ success: false, message: "Завершённый объект нельзя редактировать" });
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
    "/:id/status",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";
      const { id } = request.params as { id: string };
      const body = setStatusSchema.parse(request.body);

      const where: any = isModerator ? { id } : { id, userId };
      const existing = await prisma.constructionObject.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }

      if (body.status === "active") {
        if (existing.status !== "draft") {
          return reply.status(400).send({ success: false, message: "Опубликовать можно только черновик" });
        }
      } else if (body.status === "completed") {
        if (existing.status !== "active") {
          return reply.status(400).send({ success: false, message: "Завершить можно только активный объект" });
        }
      }

      const obj = await prisma.constructionObject.update({
        where: { id },
        data: { status: body.status },
        include: { stages: true },
      });
      return { success: true, data: obj };
    },
  );

  app.post(
    "/:id/stages",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";
      const { id } = request.params as { id: string };
      const body = createStageSchema.parse(request.body);

      const obj = await prisma.constructionObject.findFirst({
        where: isModerator ? { id } : { id, userId },
        include: { stages: { select: { stageType: true } } },
      });
      if (!obj) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }
      if (obj.status !== "draft" && obj.status !== "active") {
        return reply.status(400).send({
          success: false,
          message: "Добавлять этапы можно только у объектов со статусом «Черновик» или «Активный»",
        });
      }
      const hasStageType = obj.stages.some((s) => s.stageType === body.stageType);
      if (hasStageType) {
        return reply.status(400).send({
          success: false,
          message: "Этап с таким типом уже добавлен",
        });
      }

      const stage = await prisma.objectStage.create({
        data: {
          objectId: id,
          stageType: body.stageType,
          materialsRequest: body.materialsRequest ?? null,
          buildersRequest: body.buildersRequest ?? null,
          equipmentRequest: body.equipmentRequest ?? null,
        },
      });

      return reply.status(201).send({ success: true, data: stage });
    },
  );

  app.put(
    "/:id/stages/:stageId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";
      const { id, stageId } = request.params as { id: string; stageId: string };

      const obj = await prisma.constructionObject.findFirst({
        where: isModerator ? { id } : { id, userId },
        include: { stages: { select: { id: true } } },
      });
      if (!obj) {
        return reply.status(404).send({ success: false, message: "Объект не найден" });
      }
      if (obj.status === "completed") {
        return reply.status(400).send({
          success: false,
          message: "Редактировать этапы завершённого объекта нельзя",
        });
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
      plan: { in: [SubscriptionPlan.basic, SubscriptionPlan.premium] },
      expiresAt: { gt: new Date() },
    },
  });
  return subscription !== null;
}

async function _notifyExecutors(objectId: string, stages: any[]): Promise<void> {
  const hasBuilders = stages.some((s) => s.buildersRequest);
  const hasMaterials = stages.some((s) => s.materialsRequest);
  const hasEquipment = stages.some((s) => s.equipmentRequest);

  const roles: UserRole[] = [];
  if (hasBuilders) roles.push(UserRole.builder);
  if (hasMaterials) roles.push(UserRole.supplier);
  if (hasEquipment) roles.push(UserRole.equipment);

  if (roles.length === 0) return;

  const users = await prisma.user.findMany({
    where: { role: { in: roles } },
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
