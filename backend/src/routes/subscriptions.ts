import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma";
import { getUserId } from "../lib/auth";

/**
 * Subscription management routes (payment stubs for now).
 */
export async function subscriptionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/current", async (request: FastifyRequest) => {
    const userId = getUserId(request);
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
    });
    return { success: true, data: subscription };
  });

  app.get("/plans", async () => {
    return {
      success: true,
      data: [
        {
          plan: "premium",
          name: "Премиум",
          price: 0,
          features: [
            "100 объявлений",
            "Создание объектов",
            "Просмотр объектов",
            "Приоритет уведомлений",
            "Продвижение профиля",
            "Продвижение объявлений",
          ],
        },
      ],
    };
  });

  app.post("/subscribe", async (request: FastifyRequest, reply: FastifyReply) => {
    // временно отключаем смену/выбор тарифа: всем выдаётся premium по умолчанию при регистрации
    return reply.status(403).send({ success: false, message: "Управление тарифами временно отключено" });
  });
}
