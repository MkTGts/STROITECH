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
          plan: "free",
          name: "Бесплатный",
          price: 0,
          features: [
            "1 объявление",
            "Просмотр профилей",
            "Чат с участниками",
          ],
        },
        {
          plan: "basic",
          name: "Базовый",
          price: 990,
          features: [
            "10 объявлений",
            "Создание объектов",
            "Просмотр объектов",
            "Уведомления о тендерах",
          ],
        },
        {
          plan: "premium",
          name: "Премиум",
          price: 2490,
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
    const userId = getUserId(request);
    const { plan } = request.body as { plan: string };

    if (!["basic", "premium"].includes(plan)) {
      return reply.status(400).send({ success: false, message: "Неверный тариф" });
    }

    // TODO: интеграция с платёжной системой
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await prisma.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "expired" },
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: plan as any,
        status: "active",
        expiresAt,
        autoRenew: true,
      },
    });

    return { success: true, data: subscription, message: "Подписка оформлена (тестовый режим)" };
  });
}
