import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { CommunityMemberRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getOptionalUserId, getUserId, getUserRole } from "../lib/auth";
import { assertCommunityMember, canModerateCommunityContent, getCommunityMembership } from "../lib/community-permissions";

const listQuerySchema = z.object({
  search: z.string().optional(),
  region: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createCommunitySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().max(8000).optional().nullable(),
  region: z.string().max(200).optional().nullable(),
});

const updateCommunitySchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.union([z.string().max(8000), z.null()]).optional(),
  region: z.union([z.string().max(200), z.null()]).optional(),
});

const memberRolePatchSchema = z.object({
  role: z.enum(["moderator", "member"]),
});

const membersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const albumsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function communityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const q = listQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const search = q.search?.trim();
    const where: {
      region?: string;
      OR?: Array<Record<string, unknown>>;
    } = {};
    if (q.region?.trim()) where.region = q.region.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.community.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          region: true,
          creatorId: true,
          createdAt: true,
          _count: { select: { members: true, feedPosts: true } },
        },
      }),
      prisma.community.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          region: r.region,
          creatorId: r.creatorId,
          memberCount: r._count.members,
          postCount: r._count.feedPosts,
          createdAt: r.createdAt.toISOString(),
        })),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = createCommunitySchema.parse(request.body);
    const title = body.title.trim();
    const description =
      body.description === undefined || body.description === null
        ? null
        : String(body.description).trim() || null;
    const region =
      body.region === undefined || body.region === null
        ? null
        : String(body.region).trim() || null;

    const community = await prisma.community.create({
      data: {
        title,
        description,
        region,
        creatorId: userId,
        members: { create: { userId, role: "admin" } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        region: true,
        creatorId: true,
        createdAt: true,
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        ...community,
        createdAt: community.createdAt.toISOString(),
      },
    });
  });

  app.get("/:id/members", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const exists = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
    if (!exists) {
      return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
    }
    const q = membersQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      prisma.communityMember.findMany({
        where: { communityId },
        skip,
        take: q.limit,
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              companyName: true,
              role: true,
              isVerified: true,
            },
          },
        },
      }),
      prisma.communityMember.count({ where: { communityId } }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          role: r.role,
          joinedAt: r.createdAt.toISOString(),
          user: r.user,
        })),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.get("/:id/albums", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const exists = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
    if (!exists) {
      return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
    }
    const q = albumsQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      prisma.photoAlbum.findMany({
        where: { communityId },
        orderBy: { createdAt: "desc" },
        skip,
        take: q.limit,
        select: {
          id: true,
          ownerId: true,
          title: true,
          description: true,
          coverUrl: true,
          objectId: true,
          communityId: true,
          createdAt: true,
          _count: { select: { photos: true } },
          object: { select: { id: true, title: true } },
        },
      }),
      prisma.photoAlbum.count({ where: { communityId } }),
    ]);

    return {
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          ownerId: r.ownerId,
          title: r.title,
          description: r.description,
          coverUrl: r.coverUrl,
          objectId: r.objectId,
          communityId: r.communityId,
          photoCount: r._count.photos,
          createdAt: r.createdAt.toISOString(),
          object: r.object,
        })),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.patch("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userId = getUserId(request);
    const globalRole = getUserRole(request);
    const body = updateCommunitySchema.parse(request.body);

    const comm = await prisma.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    });
    if (!comm) {
      return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
    }

    const membership = await getCommunityMembership(userId, communityId);
    const canEdit =
      globalRole === "moderator" || (membership !== null && membership.role === "admin");
    if (!canEdit) {
      return reply.status(403).send({ success: false, message: "Недостаточно прав" });
    }

    const data: { title?: string; description?: string | null; region?: string | null } = {};
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description).trim() || null;
    }
    if (body.region !== undefined) data.region = body.region === null ? null : String(body.region).trim() || null;

    const updated = await prisma.community.update({
      where: { id: communityId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        region: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });

  app.delete("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userId = getUserId(request);
    const globalRole = getUserRole(request);

    const comm = await prisma.community.findUnique({
      where: { id: communityId },
      select: { creatorId: true },
    });
    if (!comm) {
      return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
    }
    if (globalRole !== "moderator" && comm.creatorId !== userId) {
      return reply.status(403).send({ success: false, message: "Недостаточно прав" });
    }

    await prisma.community.delete({ where: { id: communityId } });
    return { success: true, data: { deleted: true } };
  });

  app.get("/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userIdOpt = getOptionalUserId(request);

    const row = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        title: true,
        description: true,
        region: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true, feedPosts: true, albums: true } },
      },
    });
    if (!row) {
      return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
    }

    let myRole: CommunityMemberRole | null = null;
    if (userIdOpt) {
      const m = await getCommunityMembership(userIdOpt, communityId);
      myRole = m?.role ?? null;
    }

    return {
      success: true,
      data: {
        id: row.id,
        title: row.title,
        description: row.description,
        region: row.region,
        creatorId: row.creatorId,
        memberCount: row._count.members,
        postCount: row._count.feedPosts,
        albumCount: row._count.albums,
        myRole,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  });

  app.post("/:id/join", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userId = getUserId(request);
    const exists = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } });
    if (!exists) {
      return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
    }
    await prisma.communityMember.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId, role: "member" },
      update: {},
    });
    return { success: true, data: { joined: true } };
  });

  app.post("/:id/leave", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: communityId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(communityId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userId = getUserId(request);
    const membership = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!membership) {
      return reply.status(400).send({ success: false, message: "Вы не состоите в этом сообществе" });
    }
    if (membership.role === "admin") {
      const adminCount = await prisma.communityMember.count({
        where: { communityId, role: "admin" },
      });
      if (adminCount <= 1) {
        return reply.status(400).send({
          success: false,
          message:
            "Вы единственный администратор. Назначьте другого администратора или удалите сообщество.",
        });
      }
    }
    await prisma.communityMember.delete({ where: { id: membership.id } });
    return { success: true, data: { left: true } };
  });

  app.delete(
    "/:id/members/:userId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: communityId, userId: targetUserId } = request.params as { id: string; userId: string };
      if (!z.string().uuid().safeParse(communityId).success || !z.string().uuid().safeParse(targetUserId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const actorId = getUserId(request);
      const globalRole = getUserRole(request);

      const comm = await prisma.community.findUnique({
        where: { id: communityId },
        select: { creatorId: true },
      });
      if (!comm) {
        return reply.status(404).send({ success: false, message: "Сообщество не найдено" });
      }

      if (targetUserId === comm.creatorId && globalRole !== "moderator") {
        return reply.status(403).send({ success: false, message: "Нельзя исключить создателя сообщества" });
      }

      const canKick = await canModerateCommunityContent(actorId, globalRole, communityId);
      if (!canKick) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      const targetMembership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: targetUserId } },
      });
      if (!targetMembership) {
        return reply.status(404).send({ success: false, message: "Участник не найден" });
      }
      if (targetMembership.role === "admin" && globalRole !== "moderator") {
        const adminCount = await prisma.communityMember.count({ where: { communityId, role: "admin" } });
        if (adminCount <= 1) {
          return reply.status(400).send({ success: false, message: "Нельзя исключить единственного администратора" });
        }
      }

      await prisma.communityMember.delete({ where: { id: targetMembership.id } });
      return { success: true, data: { removed: true } };
    },
  );

  app.patch(
    "/:id/members/:userId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: communityId, userId: targetUserId } = request.params as { id: string; userId: string };
      if (!z.string().uuid().safeParse(communityId).success || !z.string().uuid().safeParse(targetUserId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const actorId = getUserId(request);
      const globalRole = getUserRole(request);
      const body = memberRolePatchSchema.parse(request.body);

      const actorMembership = await assertCommunityMember(actorId, communityId);
      const isGlobal = globalRole === "moderator";
      if (!isGlobal && (!actorMembership || actorMembership.role !== "admin")) {
        return reply.status(403).send({ success: false, message: "Только администратор сообщества может менять роли" });
      }

      const targetMembership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: targetUserId } },
      });
      if (!targetMembership) {
        return reply.status(404).send({ success: false, message: "Участник не найден" });
      }
      if (targetMembership.role === "admin") {
        return reply.status(400).send({ success: false, message: "Роль администратора здесь не назначается через API v1" });
      }

      const updated = await prisma.communityMember.update({
        where: { id: targetMembership.id },
        data: { role: body.role },
        select: { userId: true, role: true },
      });
      return { success: true, data: updated };
    },
  );
}
