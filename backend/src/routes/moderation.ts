import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getUserId, getUserRole } from "../lib/auth";

const createReportSchema = z.object({
  targetType: z.enum(["feed_post", "feed_comment"]),
  targetId: z.string().uuid(),
  details: z.string().max(2000).optional().nullable(),
});

const listReportsQuerySchema = z.object({
  status: z.enum(["pending", "closed", "all"]).default("pending"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const patchReportSchema = z.object({
  status: z.literal("closed"),
});

const metricsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

function assertModerator(request: FastifyRequest, reply: FastifyReply): boolean {
  if (getUserRole(request) !== "moderator") {
    reply.status(403).send({ success: false, message: "Только для модераторов" });
    return false;
  }
  return true;
}

async function resolveContentOwner(
  targetType: "feed_post" | "feed_comment",
  targetId: string,
): Promise<string | null> {
  if (targetType === "feed_post") {
    const p = await prisma.feedPost.findUnique({
      where: { id: targetId },
      select: { authorId: true },
    });
    return p?.authorId ?? null;
  }
  const c = await prisma.feedComment.findUnique({
    where: { id: targetId },
    select: { authorId: true },
  });
  return c?.authorId ?? null;
}

async function enrichReportsForModerator(
  rows: Array<{
    id: string;
    reporterId: string;
    targetType: "feed_post" | "feed_comment";
    targetId: string;
    details: string | null;
    status: "pending" | "closed";
    createdAt: Date;
    closedAt: Date | null;
    closedById: string | null;
    reporter: { id: string; name: string };
  }>,
) {
  const postIds = rows.filter((r) => r.targetType === "feed_post").map((r) => r.targetId);
  const commentIds = rows.filter((r) => r.targetType === "feed_comment").map((r) => r.targetId);

  const [posts, comments] = await Promise.all([
    postIds.length
      ? prisma.feedPost.findMany({
          where: { id: { in: postIds } },
          select: { id: true, title: true, kind: true },
        })
      : [],
    commentIds.length
      ? prisma.feedComment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, body: true, postId: true },
        })
      : [],
  ]);

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  return rows.map((r) => {
    let targetPreview: { label: string; postId?: string } | null = null;
    if (r.targetType === "feed_post") {
      const p = postMap.get(r.targetId);
      targetPreview = p
        ? { label: p.title.trim() || "Пост", postId: p.id }
        : { label: "(удалён или недоступен)" };
    } else {
      const c = commentMap.get(r.targetId);
      targetPreview = c
        ? {
            label: c.body.length > 120 ? `${c.body.slice(0, 117)}…` : c.body,
            postId: c.postId,
          }
        : { label: "(удалён или недоступен)" };
    }
    return {
      id: r.id,
      reporterId: r.reporterId,
      reporter: r.reporter,
      targetType: r.targetType,
      targetId: r.targetId,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      closedAt: r.closedAt?.toISOString() ?? null,
      closedById: r.closedById,
      targetPreview,
    };
  });
}

export async function moderationRoutes(app: FastifyInstance): Promise<void> {
  app.post("/reports", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = createReportSchema.parse(request.body);
    const ownerId = await resolveContentOwner(body.targetType, body.targetId);
    if (!ownerId) {
      return reply.status(404).send({ success: false, message: "Объект жалобы не найден" });
    }
    if (ownerId === userId) {
      return reply.status(400).send({ success: false, message: "Нельзя пожаловаться на свой контент" });
    }
    const details =
      body.details === undefined || body.details === null
        ? null
        : String(body.details).trim() || null;
    try {
      const row = await prisma.contentReport.create({
        data: {
          reporterId: userId,
          targetType: body.targetType,
          targetId: body.targetId,
          details,
        },
        select: { id: true, createdAt: true },
      });
      return {
        success: true,
        data: { id: row.id, createdAt: row.createdAt.toISOString() },
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return reply.status(409).send({
          success: false,
          message: "Вы уже отправляли жалобу на этот контент",
        });
      }
      throw e;
    }
  });

  app.get("/reports", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertModerator(request, reply)) return;
    const q = listReportsQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const where =
      q.status === "all"
        ? {}
        : {
            status: q.status as "pending" | "closed",
          };

    const [raw, total] = await Promise.all([
      prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: q.limit,
        select: {
          id: true,
          reporterId: true,
          targetType: true,
          targetId: true,
          details: true,
          status: true,
          createdAt: true,
          closedAt: true,
          closedById: true,
          reporter: { select: { id: true, name: true } },
        },
      }),
      prisma.contentReport.count({ where }),
    ]);

    const items = await enrichReportsForModerator(raw);

    return {
      success: true,
      data: {
        items,
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  });

  app.patch(
    "/reports/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!assertModerator(request, reply)) return;
      const modId = getUserId(request);
      const { id } = request.params as { id: string };
      const body = patchReportSchema.parse(request.body);

      const existing = await prisma.contentReport.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Жалоба не найдена" });
      }
      if (existing.status !== "pending") {
        return reply.status(400).send({ success: false, message: "Жалоба уже обработана" });
      }

      if (body.status === "closed") {
        await prisma.contentReport.update({
          where: { id },
          data: {
            status: "closed",
            closedAt: new Date(),
            closedById: modId,
          },
        });
      }

      return { success: true, data: null };
    },
  );

  app.get("/metrics", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    if (!assertModerator(request, reply)) return;
    const q = metricsQuerySchema.parse(request.query);
    const to = q.to ? new Date(q.to) : new Date();
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return reply.status(400).send({ success: false, message: "Некорректный период" });
    }

    const whereRange = { gte: from, lte: to };

    const [
      newUsers,
      newFeedPosts,
      newFollows,
      postAuthors,
      commentAuthors,
      feedViewers,
      feedLikers,
      messageSenders,
      publishedListings,
      publishedObjects,
      chatMessagesSent,
    ] = await Promise.all([
      prisma.user.count({ where: { createdAt: whereRange } }),
      prisma.feedPost.count({
        where: { publishedAt: whereRange },
      }),
      prisma.userFollow.count({ where: { createdAt: whereRange } }),
      prisma.feedPost.findMany({
        where: { publishedAt: whereRange },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.feedComment.findMany({
        where: { createdAt: whereRange },
        select: { authorId: true },
        distinct: ["authorId"],
      }),
      prisma.feedPostView.findMany({
        where: { firstViewedAt: whereRange },
        select: { viewerId: true },
        distinct: ["viewerId"],
      }),
      prisma.feedPostLike.findMany({
        where: { createdAt: whereRange },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.message.findMany({
        where: { createdAt: whereRange },
        select: { senderId: true },
        distinct: ["senderId"],
      }),
      prisma.listing.count({
        where: { status: "active", createdAt: whereRange },
      }),
      prisma.constructionObject.count({
        where: {
          status: { in: ["active", "completed"] },
          isVisible: true,
          createdAt: whereRange,
        },
      }),
      prisma.message.count({ where: { createdAt: whereRange } }),
    ]);

    const postAuthorSet = new Set(postAuthors.map((p) => p.authorId));
    const commentAuthorSet = new Set(commentAuthors.map((c) => c.authorId));
    const activeUnion = new Set([...postAuthorSet, ...commentAuthorSet]);

    const visitingUsers = new Set<string>([
      ...postAuthors.map((p) => p.authorId),
      ...commentAuthors.map((c) => c.authorId),
      ...feedViewers.map((v) => v.viewerId),
      ...feedLikers.map((l) => l.userId),
      ...messageSenders.map((m) => m.senderId),
    ]).size;

    const payload = {
      period: { from: from.toISOString(), to: to.toISOString() },
      visitingUsers,
      newUsers,
      newFeedPosts,
      newFollows,
      distinctPostAuthors: postAuthorSet.size,
      distinctCommentAuthors: commentAuthorSet.size,
      distinctActiveUsers: activeUnion.size,
      publishedListings,
      publishedObjects,
      chatMessagesSent,
    };

    if (q.format === "csv") {
      const lines = [
        "metric,value",
        `period_from,${payload.period.from}`,
        `period_to,${payload.period.to}`,
        `visiting_users,${visitingUsers}`,
        `new_users,${newUsers}`,
        `new_feed_posts,${newFeedPosts}`,
        `new_follows,${newFollows}`,
        `distinct_post_authors,${postAuthorSet.size}`,
        `distinct_comment_authors,${commentAuthorSet.size}`,
        `distinct_active_users_union,${activeUnion.size}`,
        `published_listings,${publishedListings}`,
        `published_objects,${publishedObjects}`,
        `chat_messages_sent,${chatMessagesSent}`,
      ];
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", "attachment; filename=\"metrics.csv\"");
      return lines.join("\n");
    }

    return { success: true, data: payload };
  });
}
