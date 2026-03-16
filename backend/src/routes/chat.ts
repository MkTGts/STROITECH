import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getUserId } from "../lib/auth";
import { sendToUser } from "../ws/handler";
import { callAssistant } from "../lib/ai";

const startConversationSchema = z.object({
  participantId: z.string().uuid(),
  contextType: z.enum(["listing", "object", "profile"]),
  contextId: z.string().uuid().optional(),
  initialMessage: z.string().min(1),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const chatBotSchema = z.object({
  content: z.string().min(1),
});

const supportSchema = z.object({
  content: z.string().min(1),
});

/**
 * Chat routes: conversations and messages.
 */
export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/conversations", async (request: FastifyRequest) => {
    const userId = getUserId(request);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: { select: { id: true, name: true, avatarUrl: true, companyName: true } },
        participant2: { select: { id: true, name: true, avatarUrl: true, companyName: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const enriched = await Promise.all(
      conversations.map(async (conv: (typeof conversations)[number]) => {
        const unreadCount = await prisma.message.count({
          where: { conversationId: conv.id, senderId: { not: userId }, isRead: false },
        });
        const participant = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
        return {
          id: conv.id,
          contextType: conv.contextType,
          contextId: conv.contextId,
          lastMessageAt: conv.lastMessageAt,
          lastMessage: conv.messages[0] || null,
          participant,
          unreadCount,
        };
      }),
    );

    const botConversation = {
      id: "assistant-bot",
      contextType: "profile" as const,
      contextId: null as string | null,
      lastMessageAt: null as Date | null,
      lastMessage: null as any,
      participant: {
        id: "assistant-bot",
        name: "Объекты-Ассистент",
        avatarUrl: "/bot-avatar.svg",
        companyName: null as string | null,
      },
      unreadCount: 0,
    };

    return { success: true, data: [botConversation, ...enriched] };
  });

  app.post("/conversations", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = startConversationSchema.parse(request.body);

    if (body.participantId === userId) {
      return reply.status(400).send({ success: false, message: "Нельзя написать самому себе" });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: userId, participant2Id: body.participantId, contextType: body.contextType, contextId: body.contextId || null },
          { participant1Id: body.participantId, participant2Id: userId, contextType: body.contextType, contextId: body.contextId || null },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participant1Id: userId,
          participant2Id: body.participantId,
          contextType: body.contextType,
          contextId: body.contextId || null,
          lastMessageAt: new Date(),
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content: body.initialMessage,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // realtime: уведомляем собеседника о новом сообщении
    const recipientId = conversation.participant1Id === userId ? conversation.participant2Id : conversation.participant1Id;
    sendToUser(recipientId, {
      type: "new_message",
      payload: {
        conversationId: conversation.id,
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
    });

    // создаём уведомление о новом сообщении
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    const notif = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "message",
        content: sender
          ? `Новое сообщение от ${sender.companyName || sender.name}`
          : "Новое сообщение в чате",
        metadata: { conversationId: conversation.id, messageId: message.id },
      },
    });

    // realtime: пушим уведомление получателю
    sendToUser(recipientId, { type: "notification", payload: notif });

    return reply.status(201).send({ success: true, data: conversation });
  });

  app.get("/conversations/:id/messages", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const { page = "1", limit = "50" } = request.query as Record<string, string>;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
    });

    if (!conversation) {
      return reply.status(404).send({ success: false, message: "Диалог не найден" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    await prisma.message.updateMany({
      where: { conversationId: id, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return {
      success: true,
      data: { items: messages.reverse(), total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
  });

  app.post("/conversations/:id/messages", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };
    const body = sendMessageSchema.parse(request.body);

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
    });

    if (!conversation) {
      return reply.status(404).send({ success: false, message: "Диалог не найден" });
    }

    const message = await prisma.message.create({
      data: { conversationId: id, senderId: userId, content: body.content },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    // realtime: уведомляем собеседника о новом сообщении
    const recipientId = conversation.participant1Id === userId ? conversation.participant2Id : conversation.participant1Id;
    sendToUser(recipientId, {
      type: "new_message",
      payload: {
        conversationId: conversation.id,
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
    });

    // создаём уведомление о новом сообщении
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    const notif = await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "message",
        content: sender
          ? `Новое сообщение от ${sender.companyName || sender.name}`
          : "Новое сообщение в чате",
        metadata: { conversationId: conversation.id, messageId: message.id },
      },
    });

    // realtime: пушим уведомление получателю
    sendToUser(recipientId, { type: "notification", payload: notif });

    return reply.status(201).send({ success: true, data: message });
  });

  app.delete("/conversations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const { id } = request.params as { id: string };

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
    });

    if (!conversation) {
      return reply.status(404).send({ success: false, message: "Диалог не найден" });
    }

    await prisma.conversation.delete({
      where: { id },
    });

    return reply.status(200).send({ success: true });
  });

  app.post("/support", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = supportSchema.parse(request.body);

    const sender = await prisma.user.findUnique({ where: { id: userId } });
    if (!sender) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }

    const moderators = await prisma.user.findMany({
      where: { role: "moderator" as any },
      select: { id: true },
    });

    if (moderators.length === 0) {
      return reply.status(200).send({
        success: true,
        data: { delivered: false },
      });
    }

    for (const mod of moderators) {
      const existingConv = await prisma.conversation.findFirst({
        where: {
          OR: [
            { participant1Id: userId, participant2Id: mod.id, contextType: "profile", contextId: userId },
            { participant1Id: mod.id, participant2Id: userId, contextType: "profile", contextId: userId },
          ],
        },
      });

      const conversation =
        existingConv ??
        (await prisma.conversation.create({
          data: {
            participant1Id: userId,
            participant2Id: mod.id,
            contextType: "profile",
            contextId: userId,
            lastMessageAt: new Date(),
          },
        }));

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: body.content,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      sendToUser(mod.id, {
        type: "new_message",
        payload: {
          conversationId: conversation.id,
          id: message.id,
          senderId: message.senderId,
          content: message.content,
          isRead: message.isRead,
          createdAt: message.createdAt,
        },
      });

      const notif = await prisma.notification.create({
        data: {
          userId: mod.id,
          type: "message",
          content: `ТП_${sender.companyName || sender.name}: новое сообщение в техподдержку`,
          metadata: { conversationId: conversation.id, messageId: message.id },
        },
      });

      sendToUser(mod.id, { type: "notification", payload: notif });
    }

    return reply.status(200).send({
      success: true,
      data: { delivered: true },
    });
  });

  app.post("/bot", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = chatBotSchema.parse(request.body);

    try {
      const answer = await callAssistant(userId, body.content);
      return reply.status(200).send({
        success: true,
        data: { reply: answer },
      });
    } catch (err: any) {
      request.log.error({ err }, "AI assistant error");
      return reply.status(500).send({
        success: false,
        message: "Ошибка ассистента. Попробуйте позже.",
      });
    }
  });
}
