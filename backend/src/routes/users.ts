import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getUserId, getUserRole } from "../lib/auth";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  region: z.string().min(2).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  description: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  region: z.union([z.string().min(2), z.null()]).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  avatarUrl: z.string().url().nullable().optional(),
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
  app.get("/", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const { role, search, region, page = "1", limit = "20" } = request.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    const isAuthenticated = Boolean(request.user);
    const requesterRole = (request.user as { role?: string } | undefined)?.role;
    const isModerator = requesterRole === "moderator";

    if (role) {
      if (!isModerator && (role === "moderator" || role === "client")) {
        where.role = { in: ["supplier", "builder", "equipment"] };
      } else {
        where.role = role;
      }
    } else if (!isModerator) {
      where.role = { in: ["supplier", "builder", "equipment"] };
    }
    if (region) where.region = region;
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
          email: true,
          phone: true,
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
        items: isAuthenticated
          ? items
          : items.map(({ email: _email, phone: _phone, ...safe }) => safe),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  });

  app.get("/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
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

    const isAuthenticated = Boolean(request.user);
    const { passwordHash, ...safe } = user;
    if (!isAuthenticated) {
      const { email: _email, phone: _phone, ...publicSafe } = safe;
      return { success: true, data: publicSafe };
    }
    return { success: true, data: safe };
  });

  app.put(
    "/profile",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const userId = getUserId(request);
      const parsed = updateProfileSchema.parse(request.body);
      const data = { ...parsed };
      if (parsed.companyName !== undefined) {
        data.companyName =
          parsed.companyName === null || String(parsed.companyName).trim() === ""
            ? null
            : String(parsed.companyName).trim();
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
      });

      const { passwordHash, ...safe } = user;
      return { success: true, data: safe };
    },
  );

  app.put(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = getUserRole(request);
      if (role !== "moderator") {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      const { id } = request.params as { id: string };
      const parsed = adminUpdateUserSchema.parse(request.body);
      const data: Record<string, unknown> = { ...parsed };
      if (parsed.companyName !== undefined) {
        data.companyName =
          parsed.companyName === null || String(parsed.companyName).trim() === ""
            ? null
            : String(parsed.companyName).trim();
      }
      if (parsed.description !== undefined) {
        data.description =
          parsed.description === null || String(parsed.description).trim() === ""
            ? null
            : String(parsed.description).trim();
      }
      if (parsed.region !== undefined) {
        data.region =
          parsed.region === null || String(parsed.region).trim() === ""
            ? null
            : String(parsed.region).trim();
      }

      try {
        const updated = await prisma.user.update({
          where: { id },
          data,
        });
        const { passwordHash, ...safe } = updated;
        return { success: true, data: safe };
      } catch {
        return reply.status(404).send({ success: false, message: "Пользователь не найден" });
      }
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
