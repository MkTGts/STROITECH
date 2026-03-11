import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { getUserId } from "../lib/auth";

/**
 * Notification routes for reading and marking notifications.
 */
export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request: FastifyRequest) => {
    const userId = getUserId(request);
    const { page = "1", limit = "20" } = request.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        unreadCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  });

  app.put("/:id/read", async (request: FastifyRequest) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    const notification = await prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });

    return { success: true, data: notification };
  });

  app.put("/read-all", async (request: FastifyRequest) => {
    const userId = getUserId(request);
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, data: null };
  });
}
