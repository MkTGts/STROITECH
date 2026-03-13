import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, generateTokens, getUserId } from "../lib/auth";

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  role: z.enum(["supplier", "builder", "equipment", "client"]),
  name: z.string().min(2),
  region: z.string().min(2),
  companyName: z.string().optional(),
  description: z.string().min(10),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Authentication routes: register, login, refresh, and current user.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({ success: false, message: "Пользователь с таким email уже существует" });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: body.role,
        name: body.name,
        region: body.region,
        companyName: body.companyName || null,
        description: body.description,
      },
    });

    await _createDefaultSubscription(user.id);
    const tokens = generateTokens(app, { userId: user.id, role: user.role });

    return reply.status(201).send({
      success: true,
      data: { user: _sanitizeUser(user), tokens },
    });
  });

  app.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return reply.status(401).send({ success: false, message: "Неверный email или пароль" });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, message: "Неверный email или пароль" });
    }

    const tokens = generateTokens(app, { userId: user.id, role: user.role });
    return { success: true, data: { user: _sanitizeUser(user), tokens } };
  });

  app.post("/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      const decoded = app.jwt.verify<{ userId: string; role: string }>(refreshToken);
      const tokens = generateTokens(app, { userId: decoded.userId, role: decoded.role });
      return { success: true, data: { tokens } };
    } catch {
      return reply.status(401).send({ success: false, message: "Невалидный токен" });
    }
  });

  app.get("/me", { preHandler: [app.authenticate] }, async (request: FastifyRequest) => {
    const userId = getUserId(request);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { managers: true },
    });
    if (!user) {
      return { success: false, message: "Пользователь не найден" };
    }
    return { success: true, data: _sanitizeUser(user) };
  });
}

async function _createDefaultSubscription(userId: string): Promise<void> {
  const expiresAt = new Date();
  // временно: всем пользователям выдаём premium по умолчанию
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  await prisma.subscription.create({
    data: {
      userId,
      plan: "premium",
      status: "active",
      expiresAt,
      autoRenew: false,
    },
  });
}

function _sanitizeUser(user: any): Record<string, unknown> {
  const { passwordHash, ...safe } = user;
  return safe;
}
