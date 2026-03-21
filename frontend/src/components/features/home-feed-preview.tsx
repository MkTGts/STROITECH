"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { api } from "@/lib/api";
import type { FeedPostListItem } from "shared";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function formatShortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const PREVIEW_LIMIT = 4;

/**
 * Последние посты ленты для главной страницы.
 */
export function HomeFeedPreview() {
  const [items, setItems] = useState<FeedPostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ success: boolean; data: { items: FeedPostListItem[] } }>("/feed/posts", {
      params: { page: 1, limit: PREVIEW_LIMIT },
    })
      .then((res) => setItems((res.data.items ?? []).slice(0, PREVIEW_LIMIT)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: PREVIEW_LIMIT }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/80 px-6 py-10 text-center text-sm text-muted-foreground">
        В ленте пока нет опубликованных материалов.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((post) => (
        <Card key={post.id} className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
          <Link href={`/lenta/${post.id}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Newspaper className="h-12 w-12 opacity-35" aria-hidden />
              </div>
            )}
          </Link>
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            <Link href={`/lenta/${post.id}`}>
              <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground group-hover:text-primary">
                {post.title}
              </h3>
            </Link>
            {post.excerpt ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
            ) : null}
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
              <Link
                href={`/lenta/${post.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Читать
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link
                href={`/profiles/${post.author.id}`}
                aria-label={`Профиль: ${post.author.name}`}
                className="flex min-w-0 shrink items-center gap-2 rounded-md py-0.5 pl-1 -mr-1 text-right transition-colors hover:bg-muted/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {post.author.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 text-right">
                  <p className="truncate text-xs font-medium">{post.author.name}</p>
                  <time className="text-[10px] text-muted-foreground" dateTime={post.publishedAt}>
                    {formatShortDate(post.publishedAt)}
                  </time>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
