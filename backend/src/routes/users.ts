import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { UserRole, type Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generateTemporaryPassword, getUserId, getUserRole, hashPassword } from "../lib/auth";
import { sendToUser } from "../ws/handler";
import { getProfileActivityPage } from "../lib/profile-activity";
import { getContactRecommendations } from "../lib/contact-recommendations";

const followListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const activityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

const moderationVerificationCandidatesQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unverifiedOnly: z
    .union([z.literal("true"), z.literal("false"), z.enum(["0", "1"])])
    .optional()
    .transform((v) => v === undefined || v === "true" || v === "1"),
});

const verificationPatchSchema = z.object({
  granted: z.boolean(),
  note: z.string().max(500).optional(),
});

const followUserCardSelect = {
  id: true,
  name: true,
  companyName: true,
  role: true,
  region: true,
  avatarUrl: true,
  isVerified: true,
} as const;

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  region: z.string().min(2).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  description: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  region: z.union([z.string().min(2), z.null()]).optional(),
  companyName: z.union([z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const managerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  position: z.string().optional(),
});

/** Роли исполнителей в каталоге участников для гостей и не-модераторов. */
const DIRECTORY_EXECUTOR_ROLES: UserRole[] = [UserRole.supplier, UserRole.builder, UserRole.equipment];

/** Кандидаты на верификацию (без модераторов). */
const VERIFICATION_CANDIDATE_ROLES: UserRole[] = [
  UserRole.supplier,
  UserRole.builder,
  UserRole.equipment,
  UserRole.client,
];

/**
 * User and profile management routes.
 */
export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const { role, search, region, page = "1", limit = "20" } = request.query as Record<string, string>;
    const skip = (Number(page) - 1) * Number(limit);
    const where: Prisma.UserWhereInput = {};
    const isAuthenticated = Boolean(request.user);
    const requesterRole = (request.user as { role?: string } | undefined)?.role;
    const isModerator = requesterRole === "moderator";

    if (role) {
      if (!isModerator && (role === "moderator" || role === "client")) {
        where.role = { in: DIRECTORY_EXECUTOR_ROLES };
      } else {
        const parsed = z.nativeEnum(UserRole).safeParse(role);
        if (parsed.success) {
          where.role = parsed.data;
        }
      }
    } else if (!isModerator) {
      where.role = { in: DIRECTORY_EXECUTOR_ROLES };
    }
    if (region) where.region = region;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, companyName: true, role: true,
          region: true,
          email: true,
          phone: true,
          description: true, avatarUrl: true, isVerified: true, verifiedAt: true, createdAt: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: isAuthenticated
          ? items
          : items.map(({ email: _email, phone: _phone, ...safe }) => safe),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  });

  app.get("/recommendations", { preHandler: [app.authenticate] }, async (request: FastifyRequest) => {
    const viewerId = getUserId(request);
    const q = recommendationsQuerySchema.parse(request.query);
    const items = await getContactRecommendations(viewerId, q.limit);
    return { success: true, data: { items } };
  });

  app.get(
    "/moderation/verification-candidates",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (getUserRole(request) !== "moderator") {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }
      const q = moderationVerificationCandidatesQuerySchema.parse(request.query);
      const skip = (q.page - 1) * q.limit;
      const search = q.search?.trim();
      const where: Prisma.UserWhereInput = {
        role: { in: VERIFICATION_CANDIDATE_ROLES },
      };
      if (q.unverifiedOnly) {
        where.isVerified = false;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { companyName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }

      const [rows, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            companyName: true,
            role: true,
            region: true,
            avatarUrl: true,
            isVerified: true,
            verifiedAt: true,
            email: true,
          },
          skip,
          take: q.limit,
          orderBy: [{ isVerified: "asc" }, { createdAt: "desc" }],
        }),
        prisma.user.count({ where }),
      ]);

      return {
        success: true,
        data: {
          items: rows.map((u) => ({
            id: u.id,
            name: u.name,
            companyName: u.companyName,
            role: u.role,
            region: u.region,
            avatarUrl: u.avatarUrl,
            isVerified: u.isVerified,
            verifiedAt: u.verifiedAt ? u.verifiedAt.toISOString() : null,
            email: u.email,
          })),
          total,
          page: q.page,
          limit: q.limit,
          totalPages: Math.ceil(total / q.limit),
        },
      };
    },
  );

  app.patch(
    "/:id/verification",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (getUserRole(request) !== "moderator") {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }
      const { id: targetId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(targetId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const actorId = getUserId(request);
      if (actorId === targetId) {
        return reply.status(400).send({ success: false, message: "Нельзя менять верификацию самому себе" });
      }

      const body = verificationPatchSchema.parse(request.body);
      const noteTrim =
        body.note !== undefined && String(body.note).trim() !== "" ? String(body.note).trim() : null;

      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
      if (!target) {
        return reply.status(404).send({ success: false, message: "Пользователь не найден" });
      }
      if (target.role === "moderator") {
        return reply.status(400).send({ success: false, message: "Верификация для роли модератора не применяется" });
      }

      const grant = body.granted;
      const auditNote = grant ? noteTrim : noteTrim;

      await prisma.$transaction([
        prisma.verificationAudit.create({
          data: {
            targetId,
            actorId,
            action: grant ? "grant" : "revoke",
            note: auditNote,
          },
        }),
        prisma.user.update({
          where: { id: targetId },
          data: grant
            ? {
                isVerified: true,
                verifiedAt: new Date(),
                verifiedById: actorId,
                verificationNote: auditNote,
              }
            : {
                isVerified: false,
                verifiedAt: null,
                verifiedById: null,
                verificationNote: null,
              },
        }),
      ]);

      const updated = await prisma.user.findUnique({
        where: { id: targetId },
        include: {
          verifiedBy: { select: { id: true, name: true } },
          managers: true,
          listings: { where: { status: "active" }, take: 10, orderBy: { createdAt: "desc" } },
          _count: {
            select: {
              listings: true,
              incomingFollows: true,
              outgoingFollows: true,
            },
          },
        },
      });
      if (!updated) {
        return reply.status(404).send({ success: false, message: "Пользователь не найден" });
      }

      const { passwordHash, _count, verifiedBy, verificationNote, verifiedById, verifiedAt, ...rest } = updated;
      const counts = {
        listingsCount: _count.listings,
        followerCount: _count.incomingFollows,
        followingCount: _count.outgoingFollows,
      };
      return {
        success: true,
        data: {
          ...rest,
          verifiedAt: verifiedAt ? verifiedAt.toISOString() : null,
          verifiedById,
          verificationNote,
          verifiedBy,
          ...counts,
        },
      };
    },
  );

  app.post(
    "/:id/reset-password",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (getUserRole(request) !== UserRole.moderator) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }
      const { id: targetId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(targetId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const actorId = getUserId(request);
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!target) {
        return reply.status(404).send({ success: false, message: "Пользователь не найден" });
      }

      const temporaryPassword = generateTemporaryPassword(14);
      const passwordHash = await hashPassword(temporaryPassword);

      await prisma.$transaction([
        prisma.verificationAudit.create({
          data: {
            targetId,
            actorId,
            action: "password_reset",
            note: null,
          },
        }),
        prisma.user.update({
          where: { id: targetId },
          data: { passwordHash },
        }),
      ]);

      return {
        success: true,
        data: { temporaryPassword },
      };
    },
  );

  app.get(
    "/:id/follow-status",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: targetId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(targetId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const me = getUserId(request);
      if (me === targetId) {
        return { success: true, data: { following: false, isSelf: true } };
      }
      const row = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: me, followingId: targetId } },
      });
      return { success: true, data: { following: Boolean(row), isSelf: false } };
    },
  );

  app.get("/:id/followers", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: targetId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(targetId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userExists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!userExists) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }
    const q = followListQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followingId: targetId },
        orderBy: { createdAt: "desc" },
        skip,
        take: q.limit,
        include: { follower: { select: followUserCardSelect } },
      }),
      prisma.userFollow.count({ where: { followingId: targetId } }),
    ]);
    return {
      success: true,
      data: {
        items: rows.map((r) => r.follower),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.get("/:id/following", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: targetId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(targetId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userExists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!userExists) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }
    const q = followListQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followerId: targetId },
        orderBy: { createdAt: "desc" },
        skip,
        take: q.limit,
        include: { following: { select: followUserCardSelect } },
      }),
      prisma.userFollow.count({ where: { followerId: targetId } }),
    ]);
    return {
      success: true,
      data: {
        items: rows.map((r) => r.following),
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.post(
    "/:id/follow",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: targetId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(targetId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const me = getUserId(request);
      if (me === targetId) {
        return reply.status(400).send({ success: false, message: "Нельзя подписаться на самого себя" });
      }
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!target) {
        return reply.status(404).send({ success: false, message: "Пользователь не найден" });
      }

      const existing = await prisma.userFollow.findUnique({
        where: { followerId_followingId: { followerId: me, followingId: targetId } },
      });
      if (existing) {
        return { success: true, data: { following: true, created: false } };
      }

      await prisma.userFollow.create({
        data: { followerId: me, followingId: targetId },
      });

      const follower = await prisma.user.findUnique({
        where: { id: me },
        select: { name: true },
      });
      const name = follower?.name?.trim() || "Участник";

      const notification = await prisma.notification.create({
        data: {
          userId: targetId,
          type: "new_follower",
          content: `${name} подписался на ваш профиль`,
          metadata: { followerId: me },
        },
      });
      sendToUser(targetId, { type: "notification", payload: notification });

      return reply.status(201).send({
        success: true,
        data: { following: true, created: true },
      });
    },
  );

  app.delete(
    "/:id/follow",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id: targetId } = request.params as { id: string };
      if (!z.string().uuid().safeParse(targetId).success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const me = getUserId(request);
      await prisma.userFollow.deleteMany({
        where: { followerId: me, followingId: targetId },
      });
      return { success: true, data: { following: false } };
    },
  );

  app.get("/:id/albums", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: targetId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(targetId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userExists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!userExists) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }
    const q = followListQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const [rows, total] = await Promise.all([
      prisma.photoAlbum.findMany({
        where: { ownerId: targetId },
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
      prisma.photoAlbum.count({ where: { ownerId: targetId } }),
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

  app.get("/:id/activity", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: targetId } = request.params as { id: string };
    if (!z.string().uuid().safeParse(targetId).success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const userExists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!userExists) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }
    const q = activityQuerySchema.parse(request.query);
    const { items, total, totalPages } = await getProfileActivityPage(targetId, q.page, q.limit);
    return {
      success: true,
      data: {
        items,
        total,
        page: q.page,
        limit: q.limit,
        totalPages,
      },
    };
  });

  app.get("/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        managers: true,
        listings: { where: { status: "active" }, take: 10, orderBy: { createdAt: "desc" } },
        verifiedBy: { select: { id: true, name: true } },
        _count: {
          select: {
            listings: true,
            incomingFollows: true,
            outgoingFollows: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, message: "Пользователь не найден" });
    }

    const isAuthenticated = Boolean(request.user);
    const requesterRole = (request.user as { role?: string } | undefined)?.role;
    const viewerIsModerator = requesterRole === "moderator";
    const { passwordHash, _count, verifiedBy, verifiedAt, verificationNote, verifiedById, ...safe } = user;
    const counts = {
      listingsCount: _count.listings,
      followerCount: _count.incomingFollows,
      followingCount: _count.outgoingFollows,
    };
    const verifiedAtIso = verifiedAt ? verifiedAt.toISOString() : null;
    const verificationPayload = viewerIsModerator
      ? { verificationNote, verifiedById, verifiedBy }
      : {};

    if (!isAuthenticated) {
      const { email: _email, phone: _phone, ...publicSafe } = safe;
      return {
        success: true,
        data: {
          ...publicSafe,
          verifiedAt: verifiedAtIso,
          ...verificationPayload,
          ...counts,
        },
      };
    }
    return {
      success: true,
      data: {
        ...safe,
        verifiedAt: verifiedAtIso,
        ...verificationPayload,
        ...counts,
      },
    };
  });

  app.put(
    "/profile",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const userId = getUserId(request);
      const parsed = updateProfileSchema.parse(request.body);
      const data = { ...parsed };
      if (parsed.companyName !== undefined) {
        data.companyName =
          parsed.companyName === null || String(parsed.companyName).trim() === ""
            ? null
            : String(parsed.companyName).trim();
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
      });

      const { passwordHash, verificationNote, verifiedById, ...rest } = user;
      return {
        success: true,
        data: {
          ...rest,
          verifiedAt: user.verifiedAt instanceof Date ? user.verifiedAt.toISOString() : user.verifiedAt ?? null,
        },
      };
    },
  );

  app.put(
    "/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const role = getUserRole(request);
      if (role !== "moderator") {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      const { id } = request.params as { id: string };
      const parsed = adminUpdateUserSchema.parse(request.body);
      const data: Record<string, unknown> = { ...parsed };
      if (parsed.companyName !== undefined) {
        data.companyName =
          parsed.companyName === null || String(parsed.companyName).trim() === ""
            ? null
            : String(parsed.companyName).trim();
      }
      if (parsed.description !== undefined) {
        data.description =
          parsed.description === null || String(parsed.description).trim() === ""
            ? null
            : String(parsed.description).trim();
      }
      if (parsed.region !== undefined) {
        data.region =
          parsed.region === null || String(parsed.region).trim() === ""
            ? null
            : String(parsed.region).trim();
      }

      try {
        const updated = await prisma.user.update({
          where: { id },
          data,
        });
        const { passwordHash, ...safe } = updated;
        return { success: true, data: safe };
      } catch {
        return reply.status(404).send({ success: false, message: "Пользователь не найден" });
      }
    },
  );

  app.post(
    "/managers",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest) => {
      const userId = getUserId(request);
      const body = managerSchema.parse(request.body);

      const manager = await prisma.manager.create({
        data: { ...body, userId },
      });

      return { success: true, data: manager };
    },
  );

  app.delete(
    "/managers/:managerId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { managerId } = request.params as { managerId: string };

      const manager = await prisma.manager.findFirst({ where: { id: managerId, userId } });
      if (!manager) {
        return reply.status(404).send({ success: false, message: "Менеджер не найден" });
      }

      await prisma.manager.delete({ where: { id: managerId } });
      return { success: true, data: null };
    },
  );
}
