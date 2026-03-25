"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { FeedMentionUser } from "shared";

const MENTION_TOKEN_RE =
  /\[\[mention:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi;

const HASHTAG_RE = /(^|[\s,.:;!?()[\]{}"""«»])#([\p{L}\p{N}_]{2,50})(?=[\s,.:;!?()[\]{}"""«»]|$)/gu;

function normalizeTagSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

type PlainSeg =
  | { t: "text"; text: string }
  | { t: "men"; id: string }
  | { t: "hash"; lead: string; slug: string; label: string };

function segmentsFromPlainText(text: string): PlainSeg[] {
  type RM = { s: number; e: number; seg: PlainSeg };
  const raw: RM[] = [];

  let m: RegExpExecArray | null;
  const mr = new RegExp(MENTION_TOKEN_RE.source, MENTION_TOKEN_RE.flags);
  while ((m = mr.exec(text)) !== null) {
    raw.push({ s: m.index, e: m.index + m[0].length, seg: { t: "men", id: m[1] } });
  }
  const hr = new RegExp(HASHTAG_RE.source, HASHTAG_RE.flags);
  while ((m = hr.exec(text)) !== null) {
    const slug = normalizeTagSlug(m[2]);
    if (slug.length < 2) continue;
    raw.push({
      s: m.index,
      e: m.index + m[0].length,
      seg: { t: "hash", lead: m[1], slug, label: m[2] },
    });
  }

  raw.sort((a, b) => a.s - b.s || a.e - b.e);
  const merged: RM[] = [];
  let lastEnd = -1;
  for (const x of raw) {
    if (x.s < lastEnd) continue;
    merged.push(x);
    lastEnd = x.e;
  }

  const out: PlainSeg[] = [];
  let cur = 0;
  for (const x of merged) {
    if (x.s > cur) out.push({ t: "text", text: text.slice(cur, x.s) });
    out.push(x.seg);
    cur = x.e;
  }
  if (cur < text.length) out.push({ t: "text", text: text.slice(cur) });
  return out;
}

export function FeedTagChips({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((slug) => (
        <Link
          key={slug}
          href={`/lenta/tag/${encodeURIComponent(slug)}`}
          className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
        >
          #{slug}
        </Link>
      ))}
    </div>
  );
}

/** Плоский текст стены / репоста: ссылки на #тег и @упоминание (токен скрыт). */
export function FeedPlainSocialText({
  text,
  mentionUsers,
  className = "",
}: {
  text: string;
  mentionUsers: FeedMentionUser[];
  className?: string;
}) {
  const nameById = useMemo(() => new Map(mentionUsers.map((u) => [u.id, u.name])), [mentionUsers]);
  const segments = useMemo(() => segmentsFromPlainText(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.t === "text") {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.t === "men") {
          const name = nameById.get(seg.id) ?? "Участник";
          return (
            <Link key={i} href={`/profiles/${seg.id}`} className="font-medium text-primary hover:underline">
              @{name}
            </Link>
          );
        }
        return (
          <span key={i}>
            {seg.lead}
            <Link href={`/lenta/tag/${encodeURIComponent(seg.slug)}`} className="font-medium text-primary hover:underline">
              #{seg.label}
            </Link>
          </span>
        );
      })}
    </span>
  );
}

/** Подстановка токенов упоминания в markdown-ссылки перед рендером статьи. */
export function articleMarkdownWithMentions(markdown: string, mentionUsers: FeedMentionUser[]): string {
  const map = new Map(mentionUsers.map((u) => [u.id, u.name]));
  const re = new RegExp(MENTION_TOKEN_RE.source, MENTION_TOKEN_RE.flags);
  return markdown.replace(re, (_match, id: string) => {
    const name = (map.get(id) ?? "Участник").replace(/[\[\]]/g, "");
    return `[${name}](/profiles/${id})`;
  });
}
