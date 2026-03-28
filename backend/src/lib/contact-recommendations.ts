import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const PRO_ROLES = ["supplier", "builder", "equipment"] as const;

type ScoreEntry = { score: number; reasons: Set<string> };

function isProRole(role: string): boolean {
  return (PRO_ROLES as readonly string[]).includes(role);
}

function hintFrom(reasons: Set<string>): string | undefined {
  if (reasons.has("mutual")) return "Рядом в сети подписок";
  if (reasons.has("category")) return "Похожие категории объявлений";
  if (reasons.has("region_role")) return "Ваш регион";
  if (reasons.has("role_peers")) return "Ваша сфера";
  return undefined;
}

export type ContactRecommendationRow = {
  id: string;
  name: string;
  companyName: string | null;
  role: string;
  region: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  hint: string | undefined;
};

/**
 * Рекомендации «кого подписать»: пересечение подписок подписчиков, категории объявлений, регион/роль.
 * Уже подписанные и сам пользователь из выдачи исключаются.
 */
export async function getContactRecommendations(viewerId: string, limit: number): Promise<ContactRecommendationRow[]> {
  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { region: true, role: true },
  });
  if (!viewer) return [];

  const followingRows = await prisma.userFollow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = followingRows.map((f) => f.followingId);
  const exclude = new Set<string>([viewerId, ...followingIds]);

  const scores = new Map<string, ScoreEntry>();
  const bump = (userId: string, delta: number, reason: string) => {
    if (exclude.has(userId)) return;
    let e = scores.get(userId);
    if (!e) {
      e = { score: 0, reasons: new Set() };
      scores.set(userId, e);
    }
    e.score += delta;
    e.reasons.add(reason);
  };

  if (followingIds.length > 0) {
    const secondHop = await prisma.userFollow.findMany({
      where: { followerId: { in: followingIds } },
      select: { followingId: true },
    });
    for (const row of secondHop) {
      bump(row.followingId, 3, "mutual");
    }
  }

  const myCategories = await prisma.listing.findMany({
    where: { userId: viewerId, status: "active" },
    select: { categoryId: true },
    distinct: ["categoryId"],
    take: 40,
  });
  const categoryIds = myCategories.map((c) => c.categoryId);
  if (categoryIds.length > 0) {
    const peerRows = await prisma.listing.findMany({
      where: {
        status: "active",
        categoryId: { in: categoryIds },
        userId: { notIn: [...exclude] },
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 80,
    });
    for (const row of peerRows) {
      bump(row.userId, 4, "category");
    }
  }

  const excludeArr = [...exclude];
  const regionTrim = viewer.region && String(viewer.region).trim().length > 0 ? String(viewer.region).trim() : null;

  const roleWhere = (): Prisma.UserWhereInput["role"] => {
    if (viewer.role === "client" || viewer.role === "moderator") {
      return { in: [...PRO_ROLES] };
    }
    if (isProRole(viewer.role)) {
      return viewer.role as (typeof PRO_ROLES)[number];
    }
    return { in: [...PRO_ROLES] };
  };

  const regionalWhere: Prisma.UserWhereInput = {
    id: { notIn: excludeArr },
    role: roleWhere(),
    ...(regionTrim ? { region: regionTrim } : {}),
  };

  const regional = await prisma.user.findMany({
    where: regionalWhere,
    select: { id: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  for (const r of regional) {
    bump(r.id, regionTrim ? 5 : 2, regionTrim ? "region_role" : "role_peers");
  }

  const ranked = [...scores.entries()]
    .filter(([id]) => !exclude.has(id))
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit);

  const ids = ranked.map(([id]) => id);
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      companyName: true,
      role: true,
      region: true,
      avatarUrl: true,
      isVerified: true,
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const out: ContactRecommendationRow[] = [];
  for (const [id, meta] of ranked) {
    const u = byId.get(id);
    if (!u) continue;
    out.push({
      id: u.id,
      name: u.name,
      companyName: u.companyName,
      role: u.role,
      region: u.region,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
      hint: hintFrom(meta.reasons),
    });
  }
  return out;
}
