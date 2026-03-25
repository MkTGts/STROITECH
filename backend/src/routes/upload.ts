import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { s3Client, getS3PublicUrl, PutObjectCommand } from "../lib/s3";
import { getUserId } from "../lib/auth";

const UPLOAD_DIR = join(process.cwd(), "uploads");

/**
 * File upload routes. Stores files locally for development; uses S3 when configured (Timeweb Object Storage).
 */
export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.post("/avatar", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: "Файл не найден" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.status(400).send({ success: false, message: "Допустимые форматы: JPEG, PNG, WebP, GIF" });
    }

    const ext = file.filename.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = await file.toBuffer();

    if (s3Client) {
      const key = `avatars/${userId}/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = getS3PublicUrl(key);
      return { success: true, data: { url, filename: key } };
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `${process.env.BACKEND_URL || "http://localhost:4000"}/uploads/${filename}`;
    return { success: true, data: { url, filename } };
  });

  app.post("/image", async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: "Файл не найден" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.status(400).send({ success: false, message: "Допустимые форматы: JPEG, PNG, WebP, GIF" });
    }

    const ext = file.filename.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;

    const buffer = await file.toBuffer();

    if (s3Client) {
      const key = `listings/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = getS3PublicUrl(key);
      return { success: true, data: { url, filename: key } };
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `${process.env.BACKEND_URL || "http://localhost:4000"}/uploads/${filename}`;
    return { success: true, data: { url, filename } };
  });

  /** Изображения для записей стены (префикс S3 `wall/{userId}/`, как у аватарок по смыслу привязки к пользователю). */
  app.post("/wall", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: "Файл не найден" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.status(400).send({ success: false, message: "Допустимые форматы: JPEG, PNG, WebP, GIF" });
    }

    const ext = file.filename.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = await file.toBuffer();

    if (s3Client) {
      const key = `wall/${userId}/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = getS3PublicUrl(key);
      return { success: true, data: { url, filename: key } };
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `${process.env.BACKEND_URL || "http://localhost:4000"}/uploads/${filename}`;
    return { success: true, data: { url, filename } };
  });

  /** Изображения для фотоальбомов (префикс S3 `albums/{userId}/`). */
  app.post("/album", async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: "Файл не найден" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return reply.status(400).send({ success: false, message: "Допустимые форматы: JPEG, PNG, WebP, GIF" });
    }

    const ext = file.filename.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = await file.toBuffer();

    if (s3Client) {
      const key = `albums/${userId}/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = getS3PublicUrl(key);
      return { success: true, data: { url, filename: key } };
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `${process.env.BACKEND_URL || "http://localhost:4000"}/uploads/${filename}`;
    return { success: true, data: { url, filename } };
  });

  app.post("/file", async (request: FastifyRequest, reply: FastifyReply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, message: "Файл не найден" });
    }

    const ext = file.filename.split(".").pop() || "bin";
    const filename = `${randomUUID()}.${ext}`;

    const buffer = await file.toBuffer();

    if (s3Client) {
      const key = `chat/${filename}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype,
        }),
      );
      const url = getS3PublicUrl(key);
      return {
        success: true,
        data: { url, filename: key, originalName: file.filename, mimeType: file.mimetype },
      };
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filepath = join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);

    const url = `${process.env.BACKEND_URL || "http://localhost:4000"}/uploads/${filename}`;
    return {
      success: true,
      data: { url, filename, originalName: file.filename, mimeType: file.mimetype },
    };
  });
}
