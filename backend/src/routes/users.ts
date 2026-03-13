import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getUserId } from "../lib/auth";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  region: z.string().min(2).optional(),
  companyName: z.string().optional(),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

const managerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  position: z.string().optional(),
});

/**
 * User and profile management routes.
 */
export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request: FastifyRequest) => {
    const { role, search, page = "1", limit = "20" } = request.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, companyName: true, role: true,
          region: true,
          description: true, avatarUrl: true, isVerified: true, createdAt: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  });

  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        managers: true,
        listings: { where: { status: "active" }, take: 10, orderBy: { createdAt: "desc" } },
        _count: { select: { listings: true } },
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }

    const { passwordHash, ...safe } = user;
    return { success: true, data: safe };
  });

  app.put(
    "/profile",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const userId = getUserId(request);
      const body = updateProfileSchema.parse(request.body);

      const user = await prisma.user.update({
        where: { id: userId },
        data: body,
      });

      const { passwordHash, ...safe } = user;
      return { success: true, data: safe };
    },
  );

  app.post(
    "/managers",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const userId = getUserId(request);
      const body = managerSchema.parse(request.body);

      const manager = await prisma.manager.create({
        data: { ...body, userId },
      });

      return { success: true, data: manager };
    },
  );

  app.delete(
    "/managers/:managerId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { managerId } = request.params as { managerId: string };

      const manager = await prisma.manager.findFirst({ where: { id: managerId, userId } });
      if (!manager) {
        return reply.status(404).send({ success: false, message: "Менеджер не найден" });
      }

      await prisma.manager.delete({ where: { id: managerId } });
      return { success: true, data: null };
    },
  );
}
