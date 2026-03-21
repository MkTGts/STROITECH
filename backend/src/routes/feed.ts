import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getOptionalUserId, getUserId, getUserRole } from "../lib/auth";

const authorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  companyName: true,
} as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const postIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const commentIdParamsSchema = z.object({
  commentId: z.string().uuid(),
});

const createCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

const updateCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

/** Пагинация комментариев внутри GET /posts/:id (общее число — в commentCount). */
const postDetailCommentsQuerySchema = z.object({
  commentsPage: z.coerce.number().int().min(1).default(1),
  commentsLimit: z.coerce.number().int().min(1).max(200).default(200),
});

function canModifyComment(authorId: string, userId: string, role: string): boolean {
  return authorId === userId || role === "moderator";
}

/** Тело статьи — Markdown (рендер и санитизация на фронте). */
const createFeedPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().min(1).max(100_000),
  excerpt: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s === undefined ? null : s.length === 0 ? null : s)),
  coverImageUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

const updateFeedPostSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.string().min(1).max(100_000).optional(),
    excerpt: z
      .union([z.string().trim().max(500), z.literal(""), z.null()])
      .optional()
      .transform((s) => (s === undefined ? undefined : s === "" ? null : s)),
    coverImageUrl: z
      .union([z.string().url(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), {
    message: "Укажите хотя бы одно поле",
  });

function serializeFeedPostRow(p: {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  status: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  _count: { likes: number; views: number; comments: number };
}) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    coverImageUrl: p.coverImageUrl,
    status: p.status,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    author: p.author,
    likeCount: p._count.likes,
    uniqueViewCount: p._count.views,
    commentCount: p._count.comments,
  };
}

/**
 * Public feed (blog) list and post detail with optional JWT for likedByMe and view tracking.
 */
export async function feedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/posts", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const q = listQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const optionalUserId = getOptionalUserId(request);

    const where = { status: "published" as const };

    const [rows, total] = await Promise.all([
      prisma.feedPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: q.limit,
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, views: true, comments: true } },
        },
      }),
      prisma.feedPost.count({ where }),
    ]);

    const postIds = rows.map((p) => p.id);
    let likedSet = new Set<string>();
    if (optionalUserId && postIds.length > 0) {
      const likes = await prisma.feedPostLike.findMany({
        where: { userId: optionalUserId, postId: { in: postIds } },
        select: { postId: true },
      });
      likedSet = new Set(likes.map((l) => l.postId));
    }

    const items = rows.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      coverImageUrl: p.coverImageUrl,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      author: p.author,
      likeCount: p._count.likes,
      uniqueViewCount: p._count.views,
      commentCount: p._count.comments,
      ...(optionalUserId ? { likedByMe: likedSet.has(p.id) } : {}),
    }));

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

  app.post(
    "/posts",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const input = createFeedPostSchema.parse(request.body);

      // v1: только published; publishedAt задаём явно при создании. При правках поста publishedAt не трогаем
      // (в v2 с черновиками можно обновлять в момент публикации).
      const publishedAt = new Date();

      const row = await prisma.feedPost.create({
        data: {
          authorId: userId,
          title: input.title,
          body: input.body,
          excerpt: input.excerpt,
          coverImageUrl: input.coverImageUrl,
          status: "published",
          publishedAt,
        },
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, views: true, comments: true } },
        },
      });

      return reply.status(201).send({
        success: true,
        data: serializeFeedPostRow(row),
      });
    },
  );

  app.put(
    "/posts/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = postIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { id } = parsed.data;
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";
      const patch = updateFeedPostSchema.parse(request.body);

      const where = isModerator ? { id } : { id, authorId: userId };
      const existing = await prisma.feedPost.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }

      const data: {
        title?: string;
        body?: string;
        excerpt?: string | null;
        coverImageUrl?: string | null;
      } = {};
      if (patch.title !== undefined) data.title = patch.title;
      if (patch.body !== undefined) data.body = patch.body;
      if (patch.excerpt !== undefined) data.excerpt = patch.excerpt;
      if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl;

      const row = await prisma.feedPost.update({
        where: { id },
        data,
        include: {
          author: { select: authorSelect },
          _count: { select: { likes: true, views: true, comments: true } },
        },
      });

      return reply.send({ success: true, data: serializeFeedPostRow(row) });
    },
  );

  app.delete(
    "/posts/:id",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = postIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { id } = parsed.data;
      const userId = getUserId(request);
      const role = getUserRole(request);
      const isModerator = role === "moderator";

      const where = isModerator ? { id } : { id, authorId: userId };
      const existing = await prisma.feedPost.findFirst({ where });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }

      await prisma.feedPost.delete({ where: { id } });

      return reply.send({ success: true, data: null });
    },
  );

  app.post(
    "/posts/:id/like",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = postIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { id: postId } = parsed.data;
      const userId = getUserId(request);

      const post = await prisma.feedPost.findFirst({
        where: { id: postId, status: "published" },
        select: { id: true },
      });
      if (!post) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }

      await prisma.feedPostLike.createMany({
        data: [{ postId, userId }],
        skipDuplicates: true,
      });

      const likeCount = await prisma.feedPostLike.count({ where: { postId } });
      return reply.send({
        success: true,
        data: { likeCount, likedByMe: true },
      });
    },
  );

  app.delete(
    "/posts/:id/like",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = postIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { id: postId } = parsed.data;
      const userId = getUserId(request);

      const post = await prisma.feedPost.findFirst({
        where: { id: postId, status: "published" },
        select: { id: true },
      });
      if (!post) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }

      await prisma.feedPostLike.deleteMany({
        where: { postId, userId },
      });

      const likeCount = await prisma.feedPostLike.count({ where: { postId } });
      return reply.send({
        success: true,
        data: { likeCount, likedByMe: false },
      });
    },
  );

  app.post(
    "/posts/:id/comments",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = postIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { id: postId } = parsed.data;
      const userId = getUserId(request);
      const { body: text } = createCommentBodySchema.parse(request.body);

      const post = await prisma.feedPost.findFirst({
        where: { id: postId, status: "published" },
        select: { id: true },
      });
      if (!post) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }

      const comment = await prisma.feedComment.create({
        data: { postId, authorId: userId, body: text },
        include: { author: { select: authorSelect } },
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: comment.author,
        },
      });
    },
  );

  app.put(
    "/comments/:commentId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = commentIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { commentId } = parsed.data;
      const userId = getUserId(request);
      const role = getUserRole(request);
      const { body: text } = updateCommentBodySchema.parse(request.body);

      const comment = await prisma.feedComment.findUnique({
        where: { id: commentId },
        include: { post: { select: { status: true } } },
      });
      if (!comment || comment.post.status !== "published") {
        return reply.status(404).send({ success: false, message: "Комментарий не найден" });
      }
      if (!canModifyComment(comment.authorId, userId, role)) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      const updated = await prisma.feedComment.update({
        where: { id: commentId },
        data: { body: text },
        include: { author: { select: authorSelect } },
      });

      return reply.send({
        success: true,
        data: {
          id: updated.id,
          body: updated.body,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          author: updated.author,
        },
      });
    },
  );

  app.delete(
    "/comments/:commentId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = commentIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { commentId } = parsed.data;
      const userId = getUserId(request);
      const role = getUserRole(request);

      const comment = await prisma.feedComment.findUnique({
        where: { id: commentId },
        include: { post: { select: { status: true } } },
      });
      if (!comment || comment.post.status !== "published") {
        return reply.status(404).send({ success: false, message: "Комментарий не найден" });
      }
      if (!canModifyComment(comment.authorId, userId, role)) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      await prisma.feedComment.delete({ where: { id: commentId } });

      return reply.send({ success: true, data: { id: commentId } });
    },
  );

  app.get("/posts/:id", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = postIdParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
    }
    const { id } = parsed.data;
    const optionalUserId = getOptionalUserId(request);
    const cq = postDetailCommentsQuerySchema.parse(request.query);

    const post = await prisma.feedPost.findFirst({
      where: { id, status: "published" },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true, views: true, comments: true } },
      },
    });

    if (!post) {
      return reply.status(404).send({ success: false, message: "Статья не найдена" });
    }

    if (optionalUserId) {
      await prisma.feedPostView.upsert({
        where: {
          postId_viewerId: { postId: id, viewerId: optionalUserId },
        },
        create: { postId: id, viewerId: optionalUserId },
        update: {},
      });
    }

    const [counts, likedRow] = await Promise.all([
      prisma.feedPost.findUnique({
        where: { id },
        select: {
          _count: { select: { likes: true, views: true, comments: true } },
        },
      }),
      optionalUserId
        ? prisma.feedPostLike.findUnique({
            where: { postId_userId: { postId: id, userId: optionalUserId } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    const c = counts?._count ?? post._count;
    const commentSkip = (cq.commentsPage - 1) * cq.commentsLimit;

    const commentsPageRows = await prisma.feedComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      skip: commentSkip,
      take: cq.commentsLimit,
      include: { author: { select: authorSelect } },
    });

    const commentsTotalPages = Math.max(1, Math.ceil(c.comments / cq.commentsLimit));

    return {
      success: true,
      data: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        coverImageUrl: post.coverImageUrl,
        status: post.status,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: post.author,
        likeCount: c.likes,
        uniqueViewCount: c.views,
        commentCount: c.comments,
        likedByMe: Boolean(likedRow),
        commentsPage: cq.commentsPage,
        commentsLimit: cq.commentsLimit,
        commentsTotalPages,
        comments: commentsPageRows.map((cm) => ({
          id: cm.id,
          body: cm.body,
          createdAt: cm.createdAt,
          updatedAt: cm.updatedAt,
          author: cm.author,
        })),
      },
    };
  });
}
