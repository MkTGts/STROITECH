import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getUserId, getUserRole } from "../lib/auth";
import { sendToUser } from "../ws/handler";

const createListingSchema = z.object({
  categoryId: z.number().int().positive(),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  region: z.string().min(2).optional(),
  photos: z.array(z.string().url()).default([]),
  price: z.number().positive().optional(),
});

const updateListingSchema = createListingSchema.partial();

/**
 * Listing CRUD routes with filtering and pagination.
 */
export async function listingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request: FastifyRequest) => {
    const query = request.query as Record<string, string>;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
    const where = _buildListingWhere(query);

    const orderBy: any = {};
    if (query.sortBy === "price") {
      orderBy.price = query.sortOrder === "desc" ? "desc" : "asc";
    } else {
      orderBy.createdAt = "desc";
    }

    const isPromotedFirst = [{ isPromoted: "desc" as const }, orderBy];

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, companyName: true, avatarUrl: true, role: true } },
          category: { select: { id: true, name: true, type: true, parent: { select: { id: true, name: true, type: true } } } },
        },
        orderBy: isPromotedFirst,
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  });

  app.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, companyName: true, avatarUrl: true, role: true, description: true } },
        category: { include: { parent: true } },
      },
    });

    if (!listing) {
      return reply.status(404).send({ success: false, message: "Объявление не найдено" });
    }
    return { success: true, data: listing };
  });

  app.post(
    "/",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = createListingSchema.parse(request.body);

      const userListingsCount = await prisma.listing.count({ where: { userId } });
      const subscription = await prisma.subscription.findFirst({
        where: { userId, status: "active" },
        orderBy: { startedAt: "desc" },
      });

      const freeLimit = 1;
      const paidLimit = subscription?.plan === "premium" ? 100 : subscription?.plan === "basic" ? 10 : freeLimit;

      if (userListingsCount >= paidLimit) {
        return reply.status(403).send({
          success: false,
          message: "Достигнут лимит объявлений. Оформите подписку для размещения дополнительных.",
        });
      }

      const listing = await prisma.listing.create({
        data: { ...body, userId },
        include: {
          user: { select: { id: true, name: true, companyName: true, avatarUrl: true, role: true } },
          category: { include: { parent: true } },
        },
      });

      // создаём системное уведомление автору объявления
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: "system",
          content: "Ваше объявление успешно размещено.",
          metadata: { listingId: listing.id },
        },
      });

      // realtime: отправляем уведомление автору
      sendToUser(userId, { type: "notification", payload: notification });

      return reply.status(201).send({ success: true, data: listing });
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
      const body = updateListingSchema.parse(request.body);

      const where: any = isModerator ? { id } : { id, userId };
      const existing = await prisma.listing.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Объявление не найдено" });
      }

      const listing = await prisma.listing.update({ where: { id }, data: body });
      return { success: true, data: listing };
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
      const existing = await prisma.listing.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Объявление не найдено" });
      }

      await prisma.listing.delete({ where: { id } });
      return { success: true, data: null };
    },
  );
}

function _buildListingWhere(query: Record<string, string>): Record<string, unknown> {
  const where: any = { status: "active" };

  if (query.categoryId) where.categoryId = Number(query.categoryId);
  if (query.categoryType) where.category = { type: query.categoryType };
  if (query.region) where.region = query.region;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.userId) where.userId = query.userId;

  return where;
}
