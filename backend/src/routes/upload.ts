import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

/**
 * File upload routes. Stores files locally for development; swap to S3 in production.
 */
export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.post("/image", async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: "Файл не найден" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.status(400).send({ success: false, message: "Допустимые форматы: JPEG, PNG, WebP, GIF" });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = file.filename.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    const buffer = await file.toBuffer();
    await writeFile(filepath, buffer);

    const url = `${process.env.BACKEND_URL || "http://localhost:4000"}/uploads/${filename}`;
    return { success: true, data: { url, filename } };
  });
}
