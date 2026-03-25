import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const MENTION_TOKEN_RE =
  /\[\[mention:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi;

/** Хэштег: #слово из букв/цифр/подчёркивания, длина 2–50. */
const HASHTAG_RE = /(^|[\s,.:;!?()[\]{}"""«»])#([\p{L}\p{N}_]{2,50})(?=[\s,.:;!?()[\]{}"""«»]|$)/gu;

const MAX_MENTIONS = 20;
const MAX_TAGS = 30;

export function normalizeFeedTagSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export function extractMentionIdsFromText(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_TOKEN_RE.source, MENTION_TOKEN_RE.flags);
  while ((m = re.exec(text)) !== null) {
    out.push(m[1]);
  }
  return [...new Set(out)];
}

export function extractHashtagSlugsFromText(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(HASHTAG_RE.source, HASHTAG_RE.flags);
  while ((m = re.exec(text)) !== null) {
    const slug = normalizeFeedTagSlug(m[2]);
    if (slug.length >= 2) out.push(slug);
  }
  return [...new Set(out)];
}

/**
 * Собирает UUID упоминаний и нормализованные slug тегов из фрагментов текста поста, валидирует пользователей,
 * обновляет JSON mentions и связи post ↔ tag.
 */
export async function syncFeedPostSocial(
  postId: string,
  textFragments: string[],
): Promise<{ mentionIds: string[]; tagSlugs: string[] }> {
  const combined = textFragments.filter(Boolean).join("\n");
  const rawMentions = extractMentionIdsFromText(combined).slice(0, MAX_MENTIONS);
  const tagSlugs = extractHashtagSlugsFromText(combined).slice(0, MAX_TAGS);

  let mentionIds: string[] = [];
  if (rawMentions.length > 0) {
    const found = await prisma.user.findMany({
      where: { id: { in: rawMentions } },
      select: { id: true },
    });
    const ok = new Set(found.map((u) => u.id));
    mentionIds = rawMentions.filter((id) => ok.has(id));
  }

  await prisma.$transaction(async (tx) => {
    await tx.feedPostTag.deleteMany({ where: { postId } });

    await tx.feedPost.update({
      where: { id: postId },
      data: { mentions: mentionIds as unknown as Prisma.InputJsonValue },
    });

    if (tagSlugs.length === 0) return;

    const tagRows: { id: string }[] = [];
    for (const slug of tagSlugs) {
      const row = await tx.feedTag.upsert({
        where: { slug },
        create: { slug },
        update: {},
        select: { id: true },
      });
      tagRows.push(row);
    }

    await tx.feedPostTag.createMany({
      data: tagRows.map((t) => ({ postId, tagId: t.id })),
      skipDuplicates: true,
    });
  });

  return { mentionIds, tagSlugs };
}
