"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, LayoutList, MessageCircle, Newspaper, Share2, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { FeedLikeButton } from "@/components/features/feed-like-button";
import { FeedShareCard } from "@/components/features/feed-share-card";
import { FeedPlainSocialText, FeedTagChips } from "@/components/features/feed-social-body";
import { toast } from "sonner";
import type { FeedPostListItem } from "shared";

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

type CursorResponse = {
  items: FeedPostListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export function MyFeedClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [homeItems, setHomeItems] = useState<FeedPostListItem[]>([]);
  const [homeCursor, setHomeCursor] = useState<string | null>(null);
  const [homeHasMore, setHomeHasMore] = useState(false);
  const [recItems, setRecItems] = useState<FeedPostListItem[]>([]);
  const [recCursor, setRecCursor] = useState<string | null>(null);
  const [recHasMore, setRecHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [homeRes, recRes] = await Promise.all([
        api<{ success: boolean; data: CursorResponse }>("/feed/home", { params: { limit: 15 } }),
        api<{ success: boolean; data: CursorResponse }>("/feed/recommended", { params: { limit: 6 } }),
      ]);
      setHomeItems(homeRes.data.items);
      setHomeCursor(homeRes.data.nextCursor);
      setHomeHasMore(homeRes.data.hasMore);
      setRecItems(recRes.data.items);
      setRecCursor(recRes.data.nextCursor);
      setRecHasMore(recRes.data.hasMore);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Не удалось загрузить ленту. Попробуйте обновить страницу.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      void fetchInitial();
    }
  }, [authLoading, isAuthenticated, fetchInitial]);

  async function loadMoreHome(): Promise<void> {
    if (!homeCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api<{ success: boolean; data: CursorResponse }>("/feed/home", {
        params: { limit: 15, cursor: homeCursor },
      });
      setHomeItems((prev) => [...prev, ...res.data.items]);
      setHomeCursor(res.data.nextCursor);
      setHomeHasMore(res.data.hasMore);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось подгрузить");
    } finally {
      setLoadingMore(false);
    }
  }

  function patchHomeLike(postId: string, next: { likeCount: number; likedByMe: boolean }) {
    setHomeItems((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likeCount: next.likeCount, likedByMe: next.likedByMe } : p)),
    );
  }

  function patchRecLike(postId: string, next: { likeCount: number; likedByMe: boolean }) {
    setRecItems((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likeCount: next.likeCount, likedByMe: next.likedByMe } : p)),
    );
  }

  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold md:text-3xl">
          <Sparkles className="h-7 w-7 text-primary" aria-hidden />
          Моя лента
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Публикации участников, на которых вы подписаны. Статьи и записи со стен — в одной хронологии.
        </p>
      </div>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-8 w-40 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      )}

      {!loading && error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {homeItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                  <UserPlus className="h-12 w-12 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-lg font-medium">Пока пусто</p>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Подпишитесь на участников в разделе «Участники» — их статьи и записи со стен появятся здесь.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/profiles">Найти участников</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <ul className="space-y-4">
                  {homeItems.map((post) => (
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
                              <Link
                                href={`/profiles/${post.author.id}`}
                                className="flex min-w-0 items-center gap-2 text-sm font-medium hover:text-primary"
                              >
                                <Avatar className="h-8 w-8 shrink-0">
                                  {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
                                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                    {post.author.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{post.author.name}</span>
                              </Link>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <FeedLikeButton
                                  postId={post.id}
                                  likeCount={post.likeCount}
                                  likedByMe={post.likedByMe}
                                  isAuthenticated={isAuthenticated}
                                  compact
                                  onSync={(next) => patchHomeLike(post.id, next)}
                                />
                                <Link href={`/lenta/${post.id}`} className="text-primary hover:underline">
                                  Обсудить
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        ) : post.kind === "wall" ? (
                          <CardContent className="p-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <LayoutList className="h-3.5 w-3.5" />
                                Запись на стене
                              </span>
                              <time dateTime={post.publishedAt}>{formatFeedDate(post.publishedAt)}</time>
                            </div>
                            <Link href={`/lenta/${post.id}`} className="block">
                              <h2 className="text-base font-semibold hover:text-primary">{post.title.trim() || "Запись"}</h2>
                              <FeedTagChips tags={post.tags ?? []} className="mt-2" />
                              {post.body ? (
                                <div className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                                  <FeedPlainSocialText
                                    text={post.body}
                                    mentionUsers={post.mentionUsers ?? []}
                                    className="whitespace-pre-wrap"
                                  />
                                </div>
                              ) : null}
                            </Link>
                            {(post.attachments?.length ?? 0) > 0 && (
                              <div className="mt-3 flex gap-2 overflow-x-auto">
                                {post.attachments!.slice(0, 4).map((url) => (
                                  <Link key={url} href={`/lenta/${post.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-md border">
                                    <img src={url} alt="" className="h-full w-full object-cover" />
                                  </Link>
                                ))}
                              </div>
                            )}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                              <Link
                                href={`/profiles/${post.author.id}`}
                                className="flex min-w-0 items-center gap-2 text-sm font-medium hover:text-primary"
                              >
                                <Avatar className="h-8 w-8 shrink-0">
                                  {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
                                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                    {post.author.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{post.author.name}</span>
                              </Link>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <FeedLikeButton
                                  postId={post.id}
                                  likeCount={post.likeCount}
                                  likedByMe={post.likedByMe}
                                  isAuthenticated={isAuthenticated}
                                  compact
                                  onSync={(next) => patchHomeLike(post.id, next)}
                                />
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  {post.commentCount}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        ) : (
                          <CardContent className="p-0">
                            <Link href={`/lenta/${post.id}`} className="relative block aspect-[16/9] overflow-hidden bg-muted sm:aspect-[16/8]">
                              {post.coverImageUrl ? (
                                <img src={post.coverImageUrl} alt="" className="h-full w-full object-cover transition-transform hover:scale-[1.02]" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <Newspaper className="h-12 w-12 opacity-35" aria-hidden />
                                </div>
                              )}
                            </Link>
                            <div className="space-y-3 p-4">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Newspaper className="h-3.5 w-3.5" />
                                Статья
                              </div>
                              <Link href={`/lenta/${post.id}`}>
                                <h2 className="line-clamp-2 text-lg font-semibold hover:text-primary">{post.title}</h2>
                              </Link>
                              {post.excerpt ? <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p> : null}
                              <FeedTagChips tags={post.tags ?? []} />
                              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                <div className="flex flex-wrap items-center gap-3">
                                  <FeedLikeButton
                                    postId={post.id}
                                    likeCount={post.likeCount}
                                    likedByMe={post.likedByMe}
                                    isAuthenticated={isAuthenticated}
                                    compact
                                    onSync={(next) => patchHomeLike(post.id, next)}
                                  />
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    {post.commentCount}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3.5 w-3.5" />
                                    {post.uniqueViewCount}
                                  </span>
                                </div>
                                <time dateTime={post.publishedAt}>{formatFeedDate(post.publishedAt)}</time>
                              </div>
                              <Link
                                href={`/profiles/${post.author.id}`}
                                className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary"
                              >
                                <Avatar className="h-7 w-7">
                                  {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
                                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                    {post.author.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {post.author.name}
                              </Link>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    </li>
                  ))}
                </ul>
                {homeHasMore && (
                  <Button type="button" variant="outline" className="w-full" disabled={loadingMore} onClick={() => void loadMoreHome()}>
                    {loadingMore ? "Загрузка…" : "Загрузить ещё"}
                  </Button>
                )}
              </>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Рекомендуем</h2>
            <p className="text-xs text-muted-foreground">
              Материалы участников из вашего региона (или той же роли, если регион не указан), кроме уже подписанных.
            </p>
            {recItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">Пока нет подходящих публикаций</CardContent>
              </Card>
            ) : (
              <ul className="space-y-3">
                {recItems.map((post) => (
                  <li key={post.id}>
                    <Card>
                      <CardContent className="p-3">
                        <Link href={`/lenta/${post.id}`} className="block">
                          <p className="line-clamp-2 text-sm font-medium hover:text-primary">{post.title}</p>
                        </Link>
                        {post.kind === "wall" && post.body ? (
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            <FeedPlainSocialText text={post.body} mentionUsers={post.mentionUsers ?? []} />
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Link href={`/profiles/${post.author.id}`} className="truncate text-xs text-muted-foreground hover:text-primary">
                            {post.author.name}
                          </Link>
                          <FeedLikeButton
                            postId={post.id}
                            likeCount={post.likeCount}
                            likedByMe={post.likedByMe}
                            isAuthenticated={isAuthenticated}
                            compact
                            onSync={(next) => patchRecLike(post.id, next)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            {recHasMore && recCursor && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    const res = await api<{ success: boolean; data: CursorResponse }>("/feed/recommended", {
                      params: { limit: 6, cursor: recCursor },
                    });
                    setRecItems((prev) => [...prev, ...res.data.items]);
                    setRecCursor(res.data.nextCursor);
                    setRecHasMore(res.data.hasMore);
                  } catch (err) {
                    toast.error(err instanceof ApiError ? err.message : "Ошибка");
                  }
                }}
              >
                Ещё рекомендации
              </Button>
            )}
          </aside>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Публичная лента статей по-прежнему в разделе{" "}
        <Link href="/lenta" className="font-medium text-primary hover:underline">
          Лента
        </Link>
        .
      </p>
    </div>
  );
}
