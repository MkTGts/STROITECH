import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { FeedPostKind, UserRole, type Prisma, type ShareTargetType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getOptionalUserId, getUserId, getUserRole } from "../lib/auth";
import { canModerateCommunityContent } from "../lib/community-permissions";
import { normalizeFeedTagSlug, syncFeedPostSocial } from "../lib/feed-social";

const MAX_WALL_BODY = 10_000;
const MAX_WALL_ATTACHMENTS = 10;
const MAX_SHARE_COMMENT = 2000;

function parseAttachments(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.length > 0) out.push(x);
  }
  return out.slice(0, MAX_WALL_ATTACHMENTS);
}

function parseMentionsJson(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && z.string().uuid().safeParse(x).success) out.push(x);
  }
  return out;
}

/** Нормализованный slug тега из query (# необязателен); `undefined` если фильтр не задан или слишком короткий. */
function parseTagFilter(raw: string | undefined): string | undefined {
  if (raw === undefined || !String(raw).trim()) return undefined;
  const slug = normalizeFeedTagSlug(String(raw).replace(/^#/, ""));
  return slug.length >= 2 ? slug : undefined;
}

function feedPostTagWhere(slug: string | undefined): Prisma.FeedPostWhereInput {
  if (!slug) return {};
  return { postTags: { some: { tag: { slug } } } };
}

async function mentionUsersForIds(mentionIds: string[]): Promise<{ id: string; name: string }[]> {
  if (mentionIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: mentionIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return mentionIds.map((id) => ({ id, name: nameById.get(id) ?? "Участник" }));
}

async function attachMentionUsersToFeedListItems<
  T extends { id: string; mentions: string[] },
>(items: T[]): Promise<(T & { mentionUsers: { id: string; name: string }[] })[]> {
  const allIds = [...new Set(items.flatMap((i) => i.mentions))];
  if (allIds.length === 0) {
    return items.map((i) => ({ ...i, mentionUsers: [] as { id: string; name: string }[] }));
  }
  const users = await prisma.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return items.map((i) => ({
    ...i,
    mentionUsers: i.mentions.map((id) => ({ id, name: nameById.get(id) ?? "Участник" })),
  }));
}

type SharePreviewDto = {
  available: boolean;
  targetType: ShareTargetType;
  targetId: string;
  title: string;
  imageUrl: string | null;
  path: string;
};

async function loadShareTargetPreview(
  targetType: ShareTargetType,
  targetId: string,
): Promise<{ title: string; imageUrl: string | null; path: string } | null> {
  if (targetType === "feed_post") {
    const p = await prisma.feedPost.findFirst({
      where: { id: targetId, status: "published" },
      select: { title: true, coverImageUrl: true, attachments: true },
    });
    if (!p) return null;
    const atts = parseAttachments(p.attachments);
    const img = p.coverImageUrl ?? atts[0] ?? null;
    return { title: (p.title || "Пост").trim() || "Пост", imageUrl: img, path: `/lenta/${targetId}` };
  }
  if (targetType === "listing") {
    const l = await prisma.listing.findFirst({
      where: { id: targetId, status: "active" },
      select: { title: true, photos: true },
    });
    if (!l) return null;
    let img: string | null = null;
    if (Array.isArray(l.photos) && l.photos.length > 0 && typeof (l.photos as unknown[])[0] === "string") {
      img = (l.photos as string[])[0];
    }
    return { title: l.title, imageUrl: img, path: `/listings/${targetId}` };
  }
  if (targetType === "construction_object") {
    const o = await prisma.constructionObject.findFirst({
      where: {
        id: targetId,
        isVisible: true,
        status: { in: ["active", "completed"] },
      },
      select: { title: true },
    });
    if (!o) return null;
    return { title: o.title, imageUrl: null, path: `/objects/${targetId}` };
  }
  return null;
}

async function buildSharePreviewsMap(
  rows: { id: string; kind: string; shareTarget: ShareTargetType | null; shareTargetId: string | null }[],
): Promise<Map<string, SharePreviewDto>> {
  const map = new Map<string, SharePreviewDto>();
  const shareRows = rows.filter((r) => r.kind === "share" && r.shareTarget && r.shareTargetId);
  if (shareRows.length === 0) return map;

  const postIds = [...new Set(shareRows.filter((r) => r.shareTarget === "feed_post").map((r) => r.shareTargetId!))];
  const listingIds = [...new Set(shareRows.filter((r) => r.shareTarget === "listing").map((r) => r.shareTargetId!))];
  const objectIds = [
    ...new Set(shareRows.filter((r) => r.shareTarget === "construction_object").map((r) => r.shareTargetId!)),
  ];

  const [posts, listings, objects] = await Promise.all([
    postIds.length
      ? prisma.feedPost.findMany({
          where: { id: { in: postIds }, status: "published" },
          select: { id: true, title: true, coverImageUrl: true, attachments: true },
        })
      : [],
    listingIds.length
      ? prisma.listing.findMany({
          where: { id: { in: listingIds }, status: "active" },
          select: { id: true, title: true, photos: true },
        })
      : [],
    objectIds.length
      ? prisma.constructionObject.findMany({
          where: { id: { in: objectIds }, isVisible: true, status: { in: ["active", "completed"] } },
          select: { id: true, title: true },
        })
      : [],
  ]);

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const listingMap = new Map(listings.map((l) => [l.id, l]));
  const objectMap = new Map(objects.map((o) => [o.id, o]));

  for (const r of shareRows) {
    const tt = r.shareTarget!;
    const tid = r.shareTargetId!;
    let preview: { title: string; imageUrl: string | null; path: string } | null = null;
    if (tt === "feed_post") {
      const p = postMap.get(tid);
      if (p) {
        const atts = parseAttachments(p.attachments);
        preview = {
          title: (p.title || "Пост").trim() || "Пост",
          imageUrl: p.coverImageUrl ?? atts[0] ?? null,
          path: `/lenta/${tid}`,
        };
      }
    } else if (tt === "listing") {
      const l = listingMap.get(tid);
      if (l) {
        let img: string | null = null;
        if (Array.isArray(l.photos) && l.photos.length > 0 && typeof (l.photos as unknown[])[0] === "string") {
          img = (l.photos as string[])[0];
        }
        preview = { title: l.title, imageUrl: img, path: `/listings/${tid}` };
      }
    } else if (tt === "construction_object") {
      const o = objectMap.get(tid);
      if (o) preview = { title: o.title, imageUrl: null, path: `/objects/${tid}` };
    }

    map.set(r.id, {
      available: Boolean(preview),
      targetType: tt,
      targetId: tid,
      title: preview?.title ?? "Контент недоступен",
      imageUrl: preview?.imageUrl ?? null,
      path: preview?.path ?? "#",
    });
  }
  return map;
}

const authorSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  companyName: true,
} as const;

const feedPostListInclude = {
  author: { select: authorSelect },
  community: { select: { id: true, title: true } },
  _count: { select: { likes: true, views: true, comments: true } },
  postTags: { select: { tag: { select: { slug: true } } } },
} satisfies Prisma.FeedPostInclude;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  authorId: z.string().uuid().optional(),
  communityId: z.string().uuid().optional(),
  /** Без параметра по умолчанию только статьи (обратная совместимость общей ленты). `wall` включает и репосты (share). */
  kind: z.enum(["article", "wall", "share"]).optional(),
  /** Фильтр по нормалized slug хэштега (`tag` или `tag=#slug`). */
  tag: z.string().max(120).optional(),
});

const cursorFeedQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tag: z.string().max(120).optional(),
});

function encodeFeedCursor(publishedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: publishedAt.getTime(), i: id }), "utf8").toString("base64url");
}

function decodeFeedCursor(cursor: string): { t: number; i: string } | null {
  try {
    const o = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { t?: unknown; i?: unknown };
    if (typeof o.t !== "number" || typeof o.i !== "string" || !z.string().uuid().safeParse(o.i).success) {
      return null;
    }
    if (!Number.isFinite(o.t)) return null;
    return { t: o.t, i: o.i };
  } catch {
    return null;
  }
}

function cursorPublishedBefore(decoded: { t: number; i: string }): Prisma.FeedPostWhereInput {
  const d = new Date(decoded.t);
  if (Number.isNaN(d.getTime())) return {};
  return {
    OR: [{ publishedAt: { lt: d } }, { AND: [{ publishedAt: d }, { id: { lt: decoded.i } }] }],
  };
}

type FeedListRow = {
  id: string;
  kind: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  attachments: unknown;
  shareTarget: ShareTargetType | null;
  shareTargetId: string | null;
  mentions: unknown;
  postTags: { tag: { slug: string } }[];
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  community?: { id: string; title: string } | null;
  _count: { likes: number; views: number; comments: number };
};

function mapRowsToFeedListItems(
  rows: FeedListRow[],
  optionalUserId: string | undefined,
  likedSet: Set<string>,
  sharePreviewMap?: Map<string, SharePreviewDto>,
) {
  return rows.map((p) => {
    const fallbackSharePreview: SharePreviewDto = {
      available: false,
      targetType: p.shareTarget ?? "feed_post",
      targetId: p.shareTargetId ?? "",
      title: "Контент недоступен или удалён",
      imageUrl: null,
      path: "#",
    };
    return {
      id: p.id,
      kind: p.kind,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      coverImageUrl: p.coverImageUrl,
      attachments: parseAttachments(p.attachments),
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      author: p.author,
      likeCount: p._count.likes,
      uniqueViewCount: p._count.views,
      commentCount: p._count.comments,
      tags: p.postTags.map((pt) => pt.tag.slug),
      mentions: parseMentionsJson(p.mentions),
      ...(p.kind === "wall" || p.kind === "share" ? { body: p.body } : {}),
      ...(p.kind === "share" && p.shareTarget && p.shareTargetId
        ? {
            shareTarget: p.shareTarget,
            shareTargetId: p.shareTargetId,
            sharePreview: sharePreviewMap?.get(p.id) ?? fallbackSharePreview,
          }
        : {}),
      ...(p.community ? { community: { id: p.community.id, title: p.community.title } } : {}),
      ...(optionalUserId ? { likedByMe: likedSet.has(p.id) } : {}),
    };
  });
}

const postIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const commentIdParamsSchema = z.object({
  commentId: z.string().uuid(),
});

const createCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.union([z.string().uuid(), z.null()]).optional(),
});

const updateCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

/** Пагинация комментариев внутри GET /posts/:id (общее число — в commentCount). */
const postDetailCommentsQuerySchema = z.object({
  commentsPage: z.coerce.number().int().min(1).default(1),
  commentsLimit: z.coerce.number().int().min(1).max(200).default(200),
});

async function canModifyComment(
  authorId: string,
  userId: string,
  role: string,
  postCommunityId: string | null,
): Promise<boolean> {
  if (authorId === userId) return true;
  if (role === UserRole.moderator) return true;
  return canModerateCommunityContent(userId, role, postCommunityId);
}

async function canModifyFeedPost(
  userId: string,
  role: string,
  post: { authorId: string; communityId: string | null },
): Promise<boolean> {
  if (role === UserRole.moderator) return true;
  if (post.authorId === userId) return true;
  return canModerateCommunityContent(userId, role, post.communityId);
}

type CommentWithMeta = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  _count: { likes: number };
};

/** Дерево комментариев в ответе GET /posts/:id (рекурсивный тип). */
type SerializedCommentBranch = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  likeCount: number;
  likedByMe: boolean;
  replies: SerializedCommentBranch[];
};

function buildCommentsByParentId(rows: CommentWithMeta[]): Map<string | null, CommentWithMeta[]> {
  const map = new Map<string | null, CommentWithMeta[]>();
  for (const row of rows) {
    const key = row.parentId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  return map;
}

function serializeCommentBranch(
  row: CommentWithMeta,
  byParentId: Map<string | null, CommentWithMeta[]>,
  likedIds: Set<string>,
): SerializedCommentBranch {
  const kids = byParentId.get(row.id) ?? [];
  return {
    id: row.id,
    parentId: row.parentId,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: row.author,
    likeCount: row._count.likes,
    likedByMe: likedIds.has(row.id),
    replies: kids.map((k) => serializeCommentBranch(k, byParentId, likedIds)),
  };
}

const createFeedPostBodySchema = z
  .object({
    kind: z.enum(["article", "wall", "share"]).default("article"),
    /** Публикация в ленте сообщества (нужно быть участником). */
    communityId: z.string().uuid().optional(),
    title: z.string().trim().max(200).optional(),
    body: z.string().optional().default(""),
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
    attachments: z.array(z.string().url()).max(MAX_WALL_ATTACHMENTS).optional().default([]),
    share: z
      .object({
        targetType: z.enum(["feed_post", "listing", "construction_object"]),
        targetId: z.string().uuid(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "share") {
      if (!data.share) {
        ctx.addIssue({ code: "custom", message: "Укажите объект репоста", path: ["share"] });
        return;
      }
      if (data.body.length > MAX_SHARE_COMMENT) {
        ctx.addIssue({
          code: "custom",
          message: `Комментарий к репосту не длиннее ${MAX_SHARE_COMMENT} символов`,
          path: ["body"],
        });
      }
      return;
    }
    if (data.kind === "article") {
      if (!data.title || data.title.length < 1) {
        ctx.addIssue({ code: "custom", message: "Укажите заголовок", path: ["title"] });
      }
      if (data.body.length < 1) {
        ctx.addIssue({ code: "custom", message: "Укажите текст", path: ["body"] });
      }
      if (data.body.length > 100_000) {
        ctx.addIssue({ code: "custom", message: "Текст слишком длинный", path: ["body"] });
      }
    } else {
      if (data.body.trim().length < 1) {
        ctx.addIssue({ code: "custom", message: "Укажите текст записи", path: ["body"] });
      }
      if (data.body.length > MAX_WALL_BODY) {
        ctx.addIssue({ code: "custom", message: "Текст записи слишком длинный", path: ["body"] });
      }
    }
  });

const updateFeedPostSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    /** Для репоста (share) допускается пустая строка; для статей и стены проверка в обработчике. */
    body: z.string().max(100_000).optional(),
    excerpt: z
      .union([z.string().trim().max(500), z.literal(""), z.null()])
      .optional()
      .transform((s) => (s === undefined ? undefined : s === "" ? null : s)),
    coverImageUrl: z
      .union([z.string().url(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
    attachments: z.array(z.string().url()).max(MAX_WALL_ATTACHMENTS).optional(),
  })
  .refine((o) => Object.values(o).some((v) => v !== undefined), {
    message: "Укажите хотя бы одно поле",
  });

type SerializedFeedPostRow = {
  id: string;
  kind: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  attachments: string[];
  status: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  likeCount: number;
  uniqueViewCount: number;
  commentCount: number;
  tags: string[];
  mentions: string[];
  mentionUsers: { id: string; name: string }[];
  shareTarget?: ShareTargetType;
  shareTargetId?: string;
  community?: { id: string; title: string };
};

async function serializeFeedPostRow(p: {
  id: string;
  kind: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  attachments: unknown;
  mentions?: unknown;
  status: string;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; companyName: string | null };
  community?: { id: string; title: string } | null;
  _count: { likes: number; views: number; comments: number };
  shareTarget?: ShareTargetType | null;
  shareTargetId?: string | null;
  postTags?: { tag: { slug: string } }[];
}): Promise<SerializedFeedPostRow> {
  const mentions = parseMentionsJson(p.mentions);
  const tags = p.postTags?.map((pt) => pt.tag.slug) ?? [];
  const mentionUsers = await mentionUsersForIds(mentions);
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    coverImageUrl: p.coverImageUrl,
    attachments: parseAttachments(p.attachments),
    status: p.status,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    author: p.author,
    likeCount: p._count.likes,
    uniqueViewCount: p._count.views,
    commentCount: p._count.comments,
    tags,
    mentions,
    mentionUsers,
    ...(p.shareTarget != null && p.shareTargetId != null
      ? { shareTarget: p.shareTarget, shareTargetId: p.shareTargetId }
      : {}),
    ...(p.community ? { community: { id: p.community.id, title: p.community.title } } : {}),
  };
}

/**
 * Public feed (blog) list and post detail with optional JWT for likedByMe and view tracking.
 */
export async function feedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/home", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const q = cursorFeedQuerySchema.parse(request.query);
    const decoded = q.cursor ? decodeFeedCursor(q.cursor) : null;
    if (q.cursor && !decoded) {
      return reply.status(400).send({ success: false, message: "Некорректный курсор" });
    }

    const tagSlug = parseTagFilter(q.tag);
    const baseWhere: Prisma.FeedPostWhereInput = {
      status: "published",
      communityId: null,
      ...feedPostTagWhere(tagSlug),
      author: {
        incomingFollows: {
          some: { followerId: userId },
        },
      },
    };

    const where: Prisma.FeedPostWhereInput =
      decoded ? { AND: [baseWhere, cursorPublishedBefore(decoded)] } : baseWhere;

    const take = q.limit + 1;
    const rows = await prisma.feedPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take,
      include: feedPostListInclude,
    });

    const hasMore = rows.length > q.limit;
    const pageRows = (hasMore ? rows.slice(0, q.limit) : rows) as FeedListRow[];
    const postIds = pageRows.map((p) => p.id);
    let likedSet = new Set<string>();
    if (postIds.length > 0) {
      const likes = await prisma.feedPostLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      });
      likedSet = new Set(likes.map((l) => l.postId));
    }

    const shareMap = await buildSharePreviewsMap(pageRows);

    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last ? encodeFeedCursor(last.publishedAt, last.id) : null;

    const items = await attachMentionUsersToFeedListItems(
      mapRowsToFeedListItems(pageRows, userId, likedSet, shareMap),
    );

    return {
      success: true,
      data: {
        items,
        nextCursor,
        hasMore,
      },
    };
  });

  app.get("/recommended", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const q = cursorFeedQuerySchema.parse(request.query);
    const decoded = q.cursor ? decodeFeedCursor(q.cursor) : null;
    if (q.cursor && !decoded) {
      return reply.status(400).send({ success: false, message: "Некорректный курсор" });
    }

    const viewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { region: true, role: true },
    });

    const followingRows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const excludeIds = [userId, ...followingRows.map((f) => f.followingId)];

    const authorWhere: Prisma.UserWhereInput = {
      id: { notIn: excludeIds },
    };
    if (viewer?.region && String(viewer.region).trim().length > 0) {
      authorWhere.region = viewer.region;
    } else {
      authorWhere.role = viewer?.role ?? UserRole.client;
    }

    const tagSlug = parseTagFilter(q.tag);
    const baseWhere: Prisma.FeedPostWhereInput = {
      status: "published",
      communityId: null,
      ...feedPostTagWhere(tagSlug),
      author: authorWhere,
    };

    const where: Prisma.FeedPostWhereInput =
      decoded ? { AND: [baseWhere, cursorPublishedBefore(decoded)] } : baseWhere;

    const take = q.limit + 1;
    const rows = await prisma.feedPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take,
      include: feedPostListInclude,
    });

    const hasMore = rows.length > q.limit;
    const pageRows = (hasMore ? rows.slice(0, q.limit) : rows) as FeedListRow[];
    const postIds = pageRows.map((p) => p.id);
    let likedSet = new Set<string>();
    if (postIds.length > 0) {
      const likes = await prisma.feedPostLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      });
      likedSet = new Set(likes.map((l) => l.postId));
    }

    const shareMap = await buildSharePreviewsMap(pageRows);

    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && last ? encodeFeedCursor(last.publishedAt, last.id) : null;

    const items = await attachMentionUsersToFeedListItems(
      mapRowsToFeedListItems(pageRows, userId, likedSet, shareMap),
    );

    return {
      success: true,
      data: {
        items,
        nextCursor,
        hasMore,
      },
    };
  });

  app.get("/tags/popular", async () => {
    const rows = await prisma.feedTag.findMany({
      take: 30,
      orderBy: { postTags: { _count: "desc" } },
      select: { slug: true, _count: { select: { postTags: true } } },
    });
    return {
      success: true,
      data: rows.map((r) => ({ slug: r.slug, postCount: r._count.postTags })),
    };
  });

  app.get("/posts", { preHandler: [app.optionalAuthenticate] }, async (request: FastifyRequest) => {
    const q = listQuerySchema.parse(request.query);
    const skip = (q.page - 1) * q.limit;
    const optionalUserId = getOptionalUserId(request);
    const tagSlug = parseTagFilter(q.tag);

    const where: Prisma.FeedPostWhereInput = {
      status: "published",
      ...feedPostTagWhere(tagSlug),
      ...(q.kind === "wall"
        ? { kind: { in: [FeedPostKind.wall, FeedPostKind.share] } }
        : q.kind === "share"
          ? { kind: FeedPostKind.share }
          : { kind: q.kind ?? FeedPostKind.article }),
    };
    if (q.authorId) where.authorId = q.authorId;
    if (q.communityId) where.communityId = q.communityId;

    const [rows, total] = await Promise.all([
      prisma.feedPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: q.limit,
        include: feedPostListInclude,
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

    const pageRows = rows as FeedListRow[];
    const shareMap = await buildSharePreviewsMap(pageRows);
    const items = await attachMentionUsersToFeedListItems(
      mapRowsToFeedListItems(pageRows, optionalUserId ?? undefined, likedSet, shareMap),
    );

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
      const input = createFeedPostBodySchema.parse(request.body);

      let resolvedCommunityId: string | null = input.communityId ?? null;
      if (resolvedCommunityId) {
        const comm = await prisma.community.findUnique({
          where: { id: resolvedCommunityId },
          select: { id: true },
        });
        if (!comm) {
          return reply.status(400).send({ success: false, message: "Сообщество не найдено" });
        }
        const mem = await prisma.communityMember.findUnique({
          where: { communityId_userId: { communityId: resolvedCommunityId, userId } },
        });
        if (!mem) {
          return reply.status(403).send({
            success: false,
            message: "Вступите в сообщество, чтобы публиковать в его ленте",
          });
        }
      }

      const publishedAt = new Date();

      if (input.kind === "article") {
        const row = await prisma.feedPost.create({
          data: {
            authorId: userId,
            kind: "article",
            title: input.title!,
            body: input.body,
            excerpt: input.excerpt,
            coverImageUrl: input.coverImageUrl,
            attachments: [],
            status: "published",
            publishedAt,
            communityId: resolvedCommunityId,
          },
          include: feedPostListInclude,
        });
        await syncFeedPostSocial(row.id, [row.body, row.excerpt ?? ""]);
        const fresh = await prisma.feedPost.findUniqueOrThrow({
          where: { id: row.id },
          include: feedPostListInclude,
        });
        return reply.status(201).send({
          success: true,
          data: await serializeFeedPostRow(fresh),
        });
      }

      if (input.kind === "share") {
        const st = input.share!.targetType as ShareTargetType;
        const tid = input.share!.targetId;
        const preview = await loadShareTargetPreview(st, tid);
        if (!preview) {
          return reply.status(400).send({
            success: false,
            message: "Объект для репоста не найден или недоступен",
          });
        }
        const comment = input.body.trim();
        const title = `Репост: ${preview.title}`.slice(0, 200);
        const row = await prisma.feedPost.create({
          data: {
            authorId: userId,
            kind: "share",
            title,
            body: comment,
            excerpt: null,
            coverImageUrl: preview.imageUrl,
            attachments: [],
            shareTarget: st,
            shareTargetId: tid,
            status: "published",
            publishedAt,
            communityId: resolvedCommunityId,
          },
          include: feedPostListInclude,
        });
        await syncFeedPostSocial(row.id, [row.body]);
        const fresh = await prisma.feedPost.findUniqueOrThrow({
          where: { id: row.id },
          include: feedPostListInclude,
        });
        return reply.status(201).send({
          success: true,
          data: await serializeFeedPostRow(fresh),
        });
      }

      const attachments = input.attachments ?? [];
      const title =
        input.title && input.title.trim().length > 0
          ? input.title.trim().slice(0, 200)
          : input.body.trim().slice(0, 200) || " ";
      const coverImageUrl = input.coverImageUrl ?? attachments[0] ?? null;
      const row = await prisma.feedPost.create({
        data: {
          authorId: userId,
          kind: "wall",
          title,
          body: input.body.trim(),
          excerpt: null,
          coverImageUrl,
          attachments,
          status: "published",
          publishedAt,
          communityId: resolvedCommunityId,
        },
        include: feedPostListInclude,
      });
      await syncFeedPostSocial(row.id, [row.body]);
      const fresh = await prisma.feedPost.findUniqueOrThrow({
        where: { id: row.id },
        include: feedPostListInclude,
      });
      return reply.status(201).send({
        success: true,
        data: await serializeFeedPostRow(fresh),
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
      const patch = updateFeedPostSchema.parse(request.body);

      const existing = await prisma.feedPost.findFirst({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }
      if (!(await canModifyFeedPost(userId, role, existing))) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      const data: {
        title?: string;
        body?: string;
        excerpt?: string | null;
        coverImageUrl?: string | null;
        attachments?: string[];
      } = {};

      if (existing.kind === "share") {
        if (
          patch.attachments !== undefined ||
          patch.title !== undefined ||
          patch.coverImageUrl !== undefined ||
          patch.excerpt !== undefined
        ) {
          return reply
            .status(400)
            .send({ success: false, message: "У репоста можно изменить только комментарий к публикации" });
        }
        if (patch.body !== undefined) {
          if (patch.body.length > MAX_SHARE_COMMENT) {
            return reply.status(400).send({
              success: false,
              message: `Комментарий не длиннее ${MAX_SHARE_COMMENT} символов`,
            });
          }
          data.body = patch.body;
        }
      } else if (existing.kind === "wall") {
        if (patch.attachments !== undefined) {
          data.attachments = patch.attachments;
          if (patch.coverImageUrl === undefined && patch.attachments[0]) {
            data.coverImageUrl = patch.attachments[0];
          }
        }
        if (patch.title !== undefined) data.title = patch.title;
        if (patch.body !== undefined) {
          if (patch.body.trim().length < 1) {
            return reply.status(400).send({ success: false, message: "Текст записи не может быть пустым" });
          }
          if (patch.body.length > MAX_WALL_BODY) {
            return reply.status(400).send({ success: false, message: "Текст записи слишком длинный" });
          }
          data.body = patch.body;
        }
        if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl;
        if (patch.excerpt !== undefined) {
          return reply.status(400).send({ success: false, message: "Анонс задаётся только для статей" });
        }
      } else {
        if (patch.attachments !== undefined) {
          return reply.status(400).send({ success: false, message: "Вложения доступны только для записей стены" });
        }
        if (patch.title !== undefined) data.title = patch.title;
        if (patch.body !== undefined) {
          if (patch.body.trim().length < 1) {
            return reply.status(400).send({ success: false, message: "Текст статьи не может быть пустым" });
          }
          if (patch.body.length > 100_000) {
            return reply.status(400).send({ success: false, message: "Текст слишком длинный" });
          }
          data.body = patch.body;
        }
        if (patch.excerpt !== undefined) data.excerpt = patch.excerpt;
        if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl;
      }

      const row = await prisma.feedPost.update({
        where: { id },
        data,
        include: feedPostListInclude,
      });

      const socialFragments = row.kind === "article" ? [row.body, row.excerpt ?? ""] : [row.body];
      await syncFeedPostSocial(row.id, socialFragments);
      const fresh = await prisma.feedPost.findUniqueOrThrow({
        where: { id: row.id },
        include: feedPostListInclude,
      });

      return reply.send({ success: true, data: await serializeFeedPostRow(fresh) });
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

      const existing = await prisma.feedPost.findFirst({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }
      if (!(await canModifyFeedPost(userId, role, existing))) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
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
      const parsedBody = createCommentBodySchema.parse(request.body);
      const text = parsedBody.body;
      const parentIdRaw = parsedBody.parentId;
      const parentId = parentIdRaw === undefined || parentIdRaw === null ? null : parentIdRaw;

      const post = await prisma.feedPost.findFirst({
        where: { id: postId, status: "published" },
        select: { id: true, communityId: true },
      });
      if (!post) {
        return reply.status(404).send({ success: false, message: "Статья не найдена" });
      }

      if (parentId) {
        const parent = await prisma.feedComment.findFirst({
          where: { id: parentId, postId },
        });
        if (!parent) {
          return reply.status(400).send({ success: false, message: "Комментарий для ответа не найден" });
        }
      }

      const comment = await prisma.feedComment.create({
        data: { postId, authorId: userId, body: text, parentId },
        include: { author: { select: authorSelect }, _count: { select: { likes: true } } },
      });

      return reply.status(201).send({
        success: true,
        data: {
          id: comment.id,
          parentId: comment.parentId,
          body: comment.body,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: comment.author,
          likeCount: comment._count.likes,
          likedByMe: false,
          replies: [],
        },
      });
    },
  );

  app.post(
    "/comments/:commentId/like",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = commentIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { commentId } = parsed.data;
      const userId = getUserId(request);

      const comment = await prisma.feedComment.findUnique({
        where: { id: commentId },
        include: { post: { select: { status: true, communityId: true } } },
      });
      if (!comment || comment.post.status !== "published") {
        return reply.status(404).send({ success: false, message: "Комментарий не найден" });
      }

      await prisma.feedCommentLike.createMany({
        data: [{ commentId, userId }],
        skipDuplicates: true,
      });

      const likeCount = await prisma.feedCommentLike.count({ where: { commentId } });
      return reply.send({
        success: true,
        data: { likeCount, likedByMe: true },
      });
    },
  );

  app.delete(
    "/comments/:commentId/like",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = commentIdParamsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, message: "Некорректный идентификатор" });
      }
      const { commentId } = parsed.data;
      const userId = getUserId(request);

      const comment = await prisma.feedComment.findUnique({
        where: { id: commentId },
        include: { post: { select: { status: true, communityId: true } } },
      });
      if (!comment || comment.post.status !== "published") {
        return reply.status(404).send({ success: false, message: "Комментарий не найден" });
      }

      await prisma.feedCommentLike.deleteMany({
        where: { commentId, userId },
      });

      const likeCount = await prisma.feedCommentLike.count({ where: { commentId } });
      return reply.send({
        success: true,
        data: { likeCount, likedByMe: false },
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
        include: { post: { select: { status: true, communityId: true } } },
      });
      if (!comment || comment.post.status !== "published") {
        return reply.status(404).send({ success: false, message: "Комментарий не найден" });
      }
      if (!(await canModifyComment(comment.authorId, userId, role, comment.post.communityId))) {
        return reply.status(403).send({ success: false, message: "Недостаточно прав" });
      }

      const updated = await prisma.feedComment.update({
        where: { id: commentId },
        data: { body: text },
        include: { author: { select: authorSelect }, _count: { select: { likes: true } } },
      });

      const likedRow = await prisma.feedCommentLike.findUnique({
        where: { commentId_userId: { commentId: updated.id, userId } },
        select: { id: true },
      });

      return reply.send({
        success: true,
        data: {
          id: updated.id,
          parentId: updated.parentId,
          body: updated.body,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          author: updated.author,
          likeCount: updated._count.likes,
          likedByMe: Boolean(likedRow),
          replies: [],
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
        include: { post: { select: { status: true, communityId: true } } },
      });
      if (!comment || comment.post.status !== "published") {
        return reply.status(404).send({ success: false, message: "Комментарий не найден" });
      }
      if (!(await canModifyComment(comment.authorId, userId, role, comment.post.communityId))) {
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
      include: feedPostListInclude,
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

    const allPostComments = await prisma.feedComment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true } },
      },
    });

    const rows: CommentWithMeta[] = allPostComments.map((cm) => ({
      id: cm.id,
      parentId: cm.parentId,
      body: cm.body,
      createdAt: cm.createdAt,
      updatedAt: cm.updatedAt,
      author: cm.author,
      _count: cm._count,
    }));

    const byParentId = buildCommentsByParentId(rows);
    const rootsOrdered = byParentId.get(null) ?? [];
    const rootCommentsTotal = rootsOrdered.length;
    const pageRoots = rootsOrdered.slice(commentSkip, commentSkip + cq.commentsLimit);
    const commentsTotalPages = Math.max(1, Math.ceil(rootCommentsTotal / cq.commentsLimit));

    const allIds = rows.map((r) => r.id);
    let likedCommentIds = new Set<string>();
    if (optionalUserId && allIds.length > 0) {
      const commentLikes = await prisma.feedCommentLike.findMany({
        where: { userId: optionalUserId, commentId: { in: allIds } },
        select: { commentId: true },
      });
      likedCommentIds = new Set(commentLikes.map((l) => l.commentId));
    }

    const comments = pageRoots.map((root) => serializeCommentBranch(root, byParentId, likedCommentIds));

    let sharePreview: SharePreviewDto | undefined;
    if (post.kind === "share" && post.shareTarget && post.shareTargetId) {
      const m = await buildSharePreviewsMap([
        {
          id: post.id,
          kind: post.kind,
          shareTarget: post.shareTarget,
          shareTargetId: post.shareTargetId,
        },
      ]);
      sharePreview = m.get(post.id);
    }

    const detailMentions = parseMentionsJson(post.mentions);
    const detailTags = post.postTags.map((pt) => pt.tag.slug);
    const detailMentionUsers = await mentionUsersForIds(detailMentions);

    return {
      success: true,
      data: {
        id: post.id,
        kind: post.kind,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        coverImageUrl: post.coverImageUrl,
        attachments: parseAttachments(post.attachments),
        status: post.status,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: post.author,
        likeCount: c.likes,
        uniqueViewCount: c.views,
        commentCount: c.comments,
        tags: detailTags,
        mentions: detailMentions,
        mentionUsers: detailMentionUsers,
        rootCommentsTotal,
        likedByMe: Boolean(likedRow),
        commentsPage: cq.commentsPage,
        commentsLimit: cq.commentsLimit,
        commentsTotalPages,
        comments,
        ...(post.kind === "share" && post.shareTarget && post.shareTargetId
          ? {
              shareTarget: post.shareTarget,
              shareTargetId: post.shareTargetId,
              ...(sharePreview ? { sharePreview } : {}),
            }
          : {}),
        ...(post.community ? { community: { id: post.community.id, title: post.community.title } } : {}),
      },
    };
  });
}
