import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getUserId } from "../lib/auth";
import { getCommunityMembership } from "../lib/community-permissions";

const MAX_PHOTOS_PER_ALBUM = 80;

const createAlbumSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  objectId: z.string().uuid().optional().nullable(),
  communityId: z.string().uuid().optional().nullable(),
});

const updateAlbumSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.union([z.string().max(5000), z.null()]).optional(),
  objectId: z.union([z.string().uuid(), z.null()]).optional(),
  communityId: z.union([z.string().uuid(), z.null()]).optional(),
});

const addPhotoSchema = z.object({
  url: z.string().url().max(2048),
  caption: z.string().max(500).optional().nullable(),
});

const reorderPhotosSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1),
});

function mapAlbumPhoto(p: {
  id: string;
  albumId: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
}) {
  return {
    id: p.id,
    albumId: p.albumId,
    url: p.url,
    caption: p.caption,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
  };
}

async function objectOwnedByUser(userId: string, objectId: string): Promise<boolean> {
  const o = await prisma.constructionObject.findFirst({
    where: { id: objectId, userId },
    select: { id: true },
  });
  return Boolean(o);
}

async function syncAlbumCover(albumId: string): Promise<void> {
  const first = await prisma.albumPhoto.findFirst({
    where: { albumId },
    orderBy: { sortOrder: "asc" },
    select: { url: true },
  });
  await prisma.photoAlbum.update({
    where: { id: albumId },
    data: { coverUrl: first?.url ?? null },
  });
}

function detailPayload(album: {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  objectId: string | null;
  communityId: string | null;
  createdAt: Date;
  photos: { id: string; albumId: string; url: string; caption: string | null; sortOrder: number; createdAt: Date }[];
  object: { id: string; title: string } | null;
}) {
  return {
    id: album.id,
    ownerId: album.ownerId,
    title: album.title,
    description: album.description,
    coverUrl: album.coverUrl,
    objectId: album.objectId,
    communityId: album.communityId,
    photoCount: album.photos.length,
    createdAt: album.createdAt.toISOString(),
    object: album.object,
    photos: album.photos.map(mapAlbumPhoto),
  };
}

/**
 * Photo albums: CRUD, photos, reorder. List by profile — GET /users/:id/albums.
 */
export async function albumRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = createAlbumSchema.parse(request.body);
    if (body.objectId && !(await objectOwnedByUser(userId, body.objectId))) {
      return reply.status(400).send({ success: false, message: "Объект не найден или не принадлежит вам" });
    }
    const communityId = body.communityId ?? null;
    if (communityId) {
      const comm = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
      if (!comm) {
        return reply.status(400).send({ success: false, message: "Сообщество не найдено" });
      }
      const m = await getCommunityMembership(userId, communityId);
      if (!m) {
        return reply.status(403).send({ success: false, message: "Нужно состоять в сообществе, чтобы привязать альбом" });
      }
    }
    const album = await prisma.photoAlbum.create({
      data: {
        ownerId: userId,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        objectId: body.objectId ?? null,
        communityId,
      },
    });
    return reply.status(201).send({
      success: true,
      data: detailPayload({ ...album, photos: [], object: null }),
    });
  });

  app.put(
    "/:id/photos/reorder",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: albumId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(albumId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const userId = getUserId(request);
      const body = reorderPhotosSchema.parse(request.body);
      const album = await prisma.photoAlbum.findUnique({
        where: { id: albumId },
        select: { ownerId: true, photos: { select: { id: true } } },
      });
      if (!album) {
        return reply.status(404).send({ success: false, message: "Альбом не найден" });
      }
      if (album.ownerId !== userId) {
        return reply.status(403).send({ success: false, message: "Нет прав на изменение альбома" });
      }
      const existingIds = new Set(album.photos.map((p) => p.id));
      if (body.photoIds.length !== existingIds.size) {
        return reply.status(400).send({
          success: false,
          message: "Список фото должен содержать все снимки альбома ровно один раз",
        });
      }
      for (const pid of body.photoIds) {
        if (!existingIds.has(pid)) {
          return reply.status(400).send({ success: false, message: "Неизвестный идентификатор фото" });
        }
      }
      await prisma.$transaction(
        body.photoIds.map((photoId, index) =>
          prisma.albumPhoto.updateMany({
            where: { id: photoId, albumId },
            data: { sortOrder: index },
          }),
        ),
      );
      await syncAlbumCover(albumId);
      const photos = await prisma.albumPhoto.findMany({ where: { albumId }, orderBy: { sortOrder: "asc" } });
      return { success: true, data: { photos: photos.map(mapAlbumPhoto) } };
    },
  );

  app.post(
    "/:id/photos",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: albumId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(albumId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const userId = getUserId(request);
      const body = addPhotoSchema.parse(request.body);
      const album = await prisma.photoAlbum.findUnique({ where: { id: albumId }, select: { ownerId: true } });
      if (!album) {
        return reply.status(404).send({ success: false, message: "Альбом не найден" });
      }
      if (album.ownerId !== userId) {
        return reply.status(403).send({ success: false, message: "Нет прав на изменение альбома" });
      }
      const count = await prisma.albumPhoto.count({ where: { albumId } });
      if (count >= MAX_PHOTOS_PER_ALBUM) {
        return reply.status(400).send({
          success: false,
          message: `В альбоме не больше ${MAX_PHOTOS_PER_ALBUM} фото`,
        });
      }
      const agg = await prisma.albumPhoto.aggregate({ where: { albumId }, _max: { sortOrder: true } });
      const nextOrder = (agg._max.sortOrder ?? -1) + 1;
      const photo = await prisma.albumPhoto.create({
        data: {
          albumId,
          url: body.url.trim(),
          caption: body.caption?.trim() || null,
          sortOrder: nextOrder,
        },
      });
      await syncAlbumCover(albumId);
      return reply.status(201).send({ success: true, data: mapAlbumPhoto(photo) });
    },
  );

  app.delete(
    "/:id/photos/:photoId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: albumId, photoId } = request.params as { id: string; photoId: string };
      if (!z.string().uuid().safeParse(albumId).success || !z.string().uuid().safeParse(photoId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const userId = getUserId(request);
      const album = await prisma.photoAlbum.findUnique({ where: { id: albumId }, select: { ownerId: true } });
      if (!album) {
        return reply.status(404).send({ success: false, message: "Альбом не найден" });
      }
      if (album.ownerId !== userId) {
        return reply.status(403).send({ success: false, message: "Нет прав на изменение альбома" });
      }
      const del = await prisma.albumPhoto.deleteMany({ where: { id: photoId, albumId } });
      if (del.count === 0) {
        return reply.status(404).send({ success: false, message: "Фото не найдено" });
      }
      await syncAlbumCover(albumId);
      return { success: true, data: { deleted: true } };
    },
  );

  app.get("/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const album = await prisma.photoAlbum.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        object: { select: { id: true, title: true } },
      },
    });
    if (!album) {
      return reply.status(404).send({ success: false, message: "Альбом не найден" });
    }
    return { success: true, data: detailPayload(album) };
  });

  app.put("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userId = getUserId(request);
    const body = updateAlbumSchema.parse(request.body);
    const existing = await prisma.photoAlbum.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) {
      return reply.status(404).send({ success: false, message: "Альбом не найден" });
    }
    if (existing.ownerId !== userId) {
      return reply.status(403).send({ success: false, message: "Нет прав на изменение альбома" });
    }
    if (body.objectId !== undefined && body.objectId !== null) {
      if (!(await objectOwnedByUser(userId, body.objectId))) {
        return reply.status(400).send({ success: false, message: "Объект не найден или не принадлежит вам" });
      }
    }
    const data: {
      title?: string;
      description?: string | null;
      objectId?: string | null;
      communityId?: string | null;
    } = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) {
      data.description = body.description === null ? null : body.description.trim() || null;
    }
    if (body.objectId !== undefined) data.objectId = body.objectId;
    if (body.communityId !== undefined) {
      if (body.communityId === null) {
        data.communityId = null;
      } else {
        const comm = await prisma.community.findUnique({ where: { id: body.communityId }, select: { id: true } });
        if (!comm) {
          return reply.status(400).send({ success: false, message: "Сообщество не найдено" });
        }
        const m = await getCommunityMembership(userId, body.communityId);
        if (!m) {
          return reply.status(403).send({ success: false, message: "Нужно состоять в сообществе, чтобы привязать альбом" });
        }
        data.communityId = body.communityId;
      }
    }

    const album = await prisma.photoAlbum.update({
      where: { id },
      data,
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        object: { select: { id: true, title: true } },
      },
    });
    return { success: true, data: detailPayload(album) };
  });

  app.delete("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userId = getUserId(request);
    const existing = await prisma.photoAlbum.findUnique({ where: { id }, select: { ownerId: true } });
    if (!existing) {
      return reply.status(404).send({ success: false, message: "Альбом не найден" });
    }
    if (existing.ownerId !== userId) {
      return reply.status(403).send({ success: false, message: "Нет прав на удаление альбома" });
    }
    await prisma.photoAlbum.delete({ where: { id } });
    return { success: true, data: { deleted: true } };
  });
}
