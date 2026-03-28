import { prisma } from "./prisma";

const FETCH_CAP = 300;

function firstListingPhoto(raw: unknown): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const u = raw[0];
  return typeof u === "string" ? u : null;
}

export type ProfileActivityItemDto = {
  id: string;
  type: "listing" | "album" | "object_stage";
  occurredAt: string;
  title: string;
  subtitle: string | null;
  path: string;
  imageUrl: string | null;
};

const STAGE_TYPE_RU: Record<string, string> = {
  foundation: "Фундамент",
  walls: "Стены",
  roof: "Кровля",
  engineering: "Инженерия",
  finish: "Отделка",
  furniture: "Мебель",
};

const STAGE_STATUS_RU: Record<string, string> = {
  pending: "ожидание",
  in_progress: "в работе",
  completed: "завершён",
};

/**
 * Хронология активности профиля v1: объявления, альбомы и прогресс этапов объекта (без дублей стены/статей).
 */
export async function getProfileActivityPage(
  userId: string,
  page: number,
  limit: number,
): Promise<{ items: ProfileActivityItemDto[]; total: number; totalPages: number }> {
  const [listings, albums, stages] = await Promise.all([
    prisma.listing.findMany({
      where: { userId, status: "active" },
      select: { id: true, title: true, photos: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: FETCH_CAP,
    }),
    prisma.photoAlbum.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, coverUrl: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: FETCH_CAP,
    }),
    prisma.objectStage.findMany({
      where: {
        status: { not: "pending" },
        object: {
          userId,
          isVisible: true,
          status: { in: ["active", "completed"] },
        },
      },
      select: {
        id: true,
        stageType: true,
        status: true,
        updatedAt: true,
        object: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: FETCH_CAP,
    }),
  ]);

  const rows: ProfileActivityItemDto[] = [];

  for (const l of listings) {
    rows.push({
      id: `listing:${l.id}`,
      type: "listing",
      occurredAt: l.createdAt.toISOString(),
      title: l.title,
      subtitle: "Новое объявление",
      path: `/listings/${l.id}`,
      imageUrl: firstListingPhoto(l.photos),
    });
  }

  for (const a of albums) {
    rows.push({
      id: `album:${a.id}`,
      type: "album",
      occurredAt: a.createdAt.toISOString(),
      title: a.title,
      subtitle: "Новый альбом",
      path: `/albums/${a.id}`,
      imageUrl: a.coverUrl,
    });
  }

  for (const s of stages) {
    const stLabel = STAGE_TYPE_RU[s.stageType] ?? s.stageType;
    const stStatus = STAGE_STATUS_RU[s.status] ?? s.status;
    rows.push({
      id: `stage:${s.id}`,
      type: "object_stage",
      occurredAt: s.updatedAt.toISOString(),
      title: s.object.title,
      subtitle: `Этап «${stLabel}»: ${stStatus}`,
      path: `/objects/${s.object.id}`,
      imageUrl: null,
    });
  }

  rows.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;
  const items = rows.slice(skip, skip + limit);

  return { items, total, totalPages };
}
