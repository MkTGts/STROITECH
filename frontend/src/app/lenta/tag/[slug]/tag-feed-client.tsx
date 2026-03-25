"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, LayoutList, MessageCircle, Newspaper, Share2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedLikeButton } from "@/components/features/feed-like-button";
import { FeedShareCard } from "@/components/features/feed-share-card";
import { FeedPlainSocialText, FeedTagChips } from "@/components/features/feed-social-body";
import { toast } from "sonner";
import type { FeedPostListItem } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function normalizeItem(p: FeedPostListItem): FeedPostListItem {
  return {
    ...p,
    kind: p.kind ?? "article",
    attachments: p.attachments ?? [],
    tags: p.tags ?? [],
    mentions: p.mentions ?? [],
    mentionUsers: p.mentionUsers ?? [],
  };
}

function formatFeedDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function TagFeedClient({ slug }: { slug: string }) {
  const { isAuthenticated } = useAuthStore();
  const [articles, setArticles] = useState<FeedPostListItem[]>([]);
  const [wall, setWall] = useState<FeedPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageArticles, setPageArticles] = useState(1);
  const [pageWall, setPageWall] = useState(1);
  const [totalPagesArticles, setTotalPagesArticles] = useState(1);
  const [totalPagesWall, setTotalPagesWall] = useState(1);

  const fetchTab = useCallback(
    async (kind: "article" | "wall", page: number) => {
      const res = await api<{ success: boolean; data: { items: FeedPostListItem[]; totalPages: number } }>(
        "/feed/posts",
        { params: { tag: slug, kind, page, limit: 12 } },
      );
      return {
        items: res.data.items.map(normalizeItem),
        totalPages: res.data.totalPages,
      };
    },
    [slug],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchTab("article", 1), fetchTab("wall", 1)])
      .then(([a, w]) => {
        if (cancelled) return;
        setArticles(a.items);
        setTotalPagesArticles(a.totalPages);
        setWall(w.items);
        setTotalPagesWall(w.totalPages);
        setPageArticles(1);
        setPageWall(1);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof ApiError ? err.message : "Не удалось загрузить публикации";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchTab, slug]);

  const loadArticlesPage = useCallback(
    async (page: number) => {
      try {
        const { items, totalPages } = await fetchTab("article", page);
        setArticles(items);
        setPageArticles(page);
        setTotalPagesArticles(totalPages);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Ошибка загрузки");
      }
    },
    [fetchTab],
  );

  const loadWallPage = useCallback(
    async (page: number) => {
      try {
        const { items, totalPages } = await fetchTab("wall", page);
        setWall(items);
        setPageWall(page);
        setTotalPagesWall(totalPages);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Ошибка загрузки");
      }
    },
    [fetchTab],
  );

  function patchLike(list: FeedPostListItem[], postId: string, next: { likeCount: number; likedByMe: boolean }) {
    return list.map((p) => (p.id === postId ? { ...p, likeCount: next.likeCount, likedByMe: next.likedByMe } : p));
  }

  const displaySlug = slug || "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-6 gap-2" asChild>
        <Link href="/lenta">
          <ArrowLeft className="h-4 w-4" />
          К ленте
        </Link>
      </Button>

      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Публикации по тегу</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">#{displaySlug}</h1>
      </header>

      {loading && <div className="h-48 animate-pulse rounded-xl bg-muted" />}
      {!loading && error && (
        <Card className="border-destructive/40">
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {!loading && !error && (
        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="articles" className="gap-2">
              <Newspaper className="h-4 w-4" />
              Статьи
            </TabsTrigger>
            <TabsTrigger value="wall" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Стена и репосты
            </TabsTrigger>
          </TabsList>
          <TabsContent value="articles" className="space-y-4">
            {articles.length === 0 ? (
              <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                Статей с этим тегом пока нет.
              </p>
            ) : (
              <ul className="space-y-4">
                {articles.map((post) => (
                  <li key={post.id}>
                    <Card>
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
                        <Link href={`/lenta/${post.id}`} className="relative block shrink-0 overflow-hidden rounded-lg bg-muted sm:h-28 sm:w-40">
                          {post.coverImageUrl ? (
                            <img src={post.coverImageUrl} alt="" className="h-32 w-full object-cover sm:h-full sm:w-full" />
                          ) : (
                            <div className="flex h-32 items-center justify-center sm:h-full">
                              <Newspaper className="h-10 w-10 text-muted-foreground opacity-40" />
                            </div>
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/lenta/${post.id}`}>
                            <h2 className="text-lg font-semibold hover:text-primary">{post.title}</h2>
                          </Link>
                          {post.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p> : null}
                          <FeedTagChips tags={post.tags ?? []} className="mt-2" />
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <FeedLikeButton
                              postId={post.id}
                              likeCount={post.likeCount}
                              likedByMe={post.likedByMe}
                              isAuthenticated={isAuthenticated}
                              compact
                              onSync={(next) => setArticles((prev) => patchLike(prev, post.id, next))}
                            />
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                              {post.commentCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              {post.uniqueViewCount}
                            </span>
                            <time dateTime={post.publishedAt}>{formatFeedDate(post.publishedAt)}</time>
                          </div>
                          <Link
                            href={isAuthenticated ? `/profiles/${post.author.id}` : "/auth/login"}
                            className="mt-2 inline-flex items-center gap-2 text-sm font-medium hover:text-primary"
                          >
                            <Avatar className="h-7 w-7">
                              {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
                              <AvatarFallback className="bg-primary/10 text-xs text-primary">{post.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {post.author.name}
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            {totalPagesArticles > 1 && (
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {Array.from({ length: totalPagesArticles }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={p === pageArticles ? "default" : "outline"}
                    onClick={() => void loadArticlesPage(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="wall" className="space-y-4">
            {wall.length === 0 ? (
              <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                Записей со стены с этим тегом пока нет.
              </p>
            ) : (
              <ul className="space-y-4">
                {wall.map((post) => (
                  <li key={post.id}>
                    <Card className="overflow-hidden">
                      {post.kind === "share" && post.sharePreview ? (
                        <CardContent className="p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <Share2 className="h-3.5 w-3.5" />
                              Репост
                            </span>
                            <time dateTime={post.publishedAt}>{formatFeedDate(post.publishedAt)}</time>
                          </div>
                          {(post.body ?? "").trim() ? (
                            <FeedPlainSocialText
                              text={post.body ?? ""}
                              mentionUsers={post.mentionUsers ?? []}
                              className="mb-3 whitespace-pre-wrap text-sm text-foreground"
                            />
                          ) : null}
                          <FeedTagChips tags={post.tags ?? []} className="mb-2" />
                          <FeedShareCard preview={post.sharePreview} />
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                            <Link href={`/profiles/${post.author.id}`} className="text-sm font-medium hover:text-primary">
                              {post.author.name}
                            </Link>
                            <FeedLikeButton
                              postId={post.id}
                              likeCount={post.likeCount}
                              likedByMe={post.likedByMe}
                              isAuthenticated={isAuthenticated}
                              compact
                              onSync={(next) => setWall((prev) => patchLike(prev, post.id, next))}
                            />
                          </div>
                        </CardContent>
                      ) : (
                        <CardContent className="p-4">
                          <div className="mb-2 text-xs text-muted-foreground">
                            <time dateTime={post.publishedAt}>{formatFeedDate(post.publishedAt)}</time>
                          </div>
                          <Link href={`/lenta/${post.id}`}>
                            <h2 className="font-semibold hover:text-primary">{post.title.trim() || "Запись"}</h2>
                          </Link>
                          <FeedTagChips tags={post.tags ?? []} className="mt-2" />
                          <FeedPlainSocialText
                            text={post.body ?? ""}
                            mentionUsers={post.mentionUsers ?? []}
                            className="mt-2 whitespace-pre-wrap text-sm text-foreground"
                          />
                          <div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground">
                            <FeedLikeButton
                              postId={post.id}
                              likeCount={post.likeCount}
                              likedByMe={post.likedByMe}
                              isAuthenticated={isAuthenticated}
                              compact
                              onSync={(next) => setWall((prev) => patchLike(prev, post.id, next))}
                            />
                            <Link href={`/lenta/${post.id}`} className="text-primary hover:underline">
                              Открыть
                            </Link>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            {totalPagesWall > 1 && (
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                {Array.from({ length: totalPagesWall }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    size="sm"
                    variant={p === pageWall ? "default" : "outline"}
                    onClick={() => void loadWallPage(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
