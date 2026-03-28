"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, MessageCircle, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { FeedLikeButton } from "@/components/features/feed-like-button";
import { toast } from "sonner";
import type { FeedPostListItem } from "shared";

export type { FeedAuthor, FeedPostListItem } from "shared";

export function canManageFeedPost(
  post: { author: { id: string }; community?: { id: string } },
  user: { id: string; role: string } | null | undefined,
  opts?: { communityStaff?: boolean; communityId?: string },
): boolean {
  if (!user) return false;
  if (post.author.id === user.id || user.role === "moderator") return true;
  if (
    opts?.communityStaff &&
    opts.communityId &&
    post.community?.id === opts.communityId
  ) {
    return true;
  }
  return false;
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

export function LentaPageClient() {
  const { isAuthenticated, user } = useAuthStore();
  const [items, setItems] = useState<FeedPostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [postToDelete, setPostToDelete] = useState<FeedPostListItem | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ success: boolean; data: { items: FeedPostListItem[]; totalPages: number } }>(
        "/feed/posts",
        { params: { page, limit: 12 } },
      );
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Не удалось загрузить ленту. Попробуйте обновить страницу.";
      setError(message);
      toast.error(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  async function confirmDeletePost() {
    if (!postToDelete) return;
    setDeletingPost(true);
    try {
      await api(`/feed/posts/${postToDelete.id}`, { method: "DELETE" });
      toast.success("Статья удалена");
      setPostToDelete(null);
      await fetchPosts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось удалить статью";
      toast.error(message);
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Лента</h1>
          <p className="mt-1 text-sm text-muted-foreground">Статьи и материалы от участников платформы</p>
        </div>
        {isAuthenticated && (
          <Button className="gap-2" asChild>
            <Link href="/lenta/new">
              <Plus className="h-4 w-4" />
              Написать статью
            </Link>
          </Button>
        )}
      </div>

      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Newspaper className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Пока нет статей</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Когда появятся опубликованные материалы, они отобразятся здесь.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((post) => (
              <Card
                key={post.id}
                className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg"
              >
                <Link href={`/lenta/${post.id}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Newspaper className="h-12 w-12 opacity-40" />
                    </div>
                  )}
                </Link>
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <Link href={`/lenta/${post.id}`}>
                    <h2 className="line-clamp-2 text-lg font-semibold leading-snug hover:text-primary">{post.title}</h2>
                  </Link>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <FeedLikeButton
                      postId={post.id}
                      likeCount={post.likeCount}
                      likedByMe={post.likedByMe}
                      isAuthenticated={isAuthenticated}
                      compact
                      onSync={(next) =>
                        setItems((prev) =>
                          prev.map((p) =>
                            p.id === post.id ? { ...p, likeCount: next.likeCount, likedByMe: next.likedByMe } : p,
                          ),
                        )
                      }
                    />
                    <span className="flex items-center gap-1" title="Комментарии">
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      {post.commentCount}
                    </span>
                    <span className="flex items-center gap-1" title="Уникальные просмотры">
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      {post.uniqueViewCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Link
                      href={isAuthenticated ? `/profiles/${post.author.id}` : "/auth/login"}
                      className="flex min-w-0 flex-1 items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {post.author.avatarUrl ? (
                          <AvatarImage src={post.author.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">
                          {post.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-medium">{post.author.name}</p>
                      </div>
                    </Link>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={post.publishedAt}>
                      {formatFeedDate(post.publishedAt)}
                    </time>
                  </div>
                  {canManageFeedPost(post, user) && (
                    <div
                      className="flex flex-wrap gap-2 border-t border-border pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href={`/lenta/${post.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Редактировать
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1"
                        onClick={() => setPostToDelete(post)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Удалить
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(postToDelete)} onOpenChange={(open) => !open && !deletingPost && setPostToDelete(null)}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Удалить статью?</DialogTitle>
            <DialogDescription>
              Статья «{postToDelete?.title}» будет удалена вместе с комментариями и лайками. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setPostToDelete(null)} disabled={deletingPost}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={confirmDeletePost} disabled={deletingPost}>
              {deletingPost ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
