import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { listingRoutes } from "./routes/listings";
import { categoryRoutes } from "./routes/categories";
import { chatRoutes } from "./routes/chat";
import { objectRoutes } from "./routes/objects";
import { subscriptionRoutes } from "./routes/subscriptions";
import { notificationRoutes } from "./routes/notifications";
import { uploadRoutes } from "./routes/upload";
import { wsHandler } from "./ws/handler";

/**
 * Build and configure the Fastify application with all plugins and routes.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  await app.register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    sign: { expiresIn: "15m" },
  });

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  await app.register(websocket);

  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ success: false, message: "Unauthorized" });
    }
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(listingRoutes, { prefix: "/api/listings" });
  await app.register(categoryRoutes, { prefix: "/api/categories" });
  await app.register(chatRoutes, { prefix: "/api/chat" });
  await app.register(objectRoutes, { prefix: "/api/objects" });
  await app.register(subscriptionRoutes, { prefix: "/api/subscriptions" });
  await app.register(notificationRoutes, { prefix: "/api/notifications" });
  await app.register(uploadRoutes, { prefix: "/api/upload" });
  await app.register(wsHandler, { prefix: "/ws" });

  app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
