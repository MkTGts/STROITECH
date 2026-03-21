"use client";

/**
 * Загрузка только на клиенте. Первый заход — GET /feed/posts/:id.
 * Смена страницы комментариев — повторный GET с commentsPage.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
import { MarkdownBody } from "@/components/features/markdown-body";
import { FeedLikeButton } from "@/components/features/feed-like-button";
import type { FeedPostDetail } from "shared";
import { canManageFeedPost } from "../lenta-client";

const COMMENTS_LIMIT = 50;

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

export function LentaPostClient({ id }: { id: string }) {
  return <LentaPostInner key={id} id={id} />;
}

function LentaPostInner({ id }: { id: string }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [post, setPost] = useState<FeedPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeedPostDetail["comments"][number] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const isModerator = user?.role === "moderator";
  const canManagePost = post ? canManageFeedPost(post, user) : false;

  const fetchPostDetail = useCallback(
    async (page: number): Promise<FeedPostDetail> => {
      const res = await api<{ success: boolean; data: FeedPostDetail }>(`/feed/posts/${id}`, {
        params: { commentsPage: page, commentsLimit: COMMENTS_LIMIT },
      });
      return res.data;
    },
    [id],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);

    fetchPostDetail(commentsPage)
      .then((data) => {
        if (!cancelled) setPost(data);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            const message = err instanceof ApiError ? err.message : "Не удалось загрузить статью";
            setLoadError(message);
            toast.error(message);
          }
          setPost(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, commentsPage, fetchPostDetail]);

  async function refetchCommentsPage(page: number) {
    try {
      const data = await fetchPostDetail(page);
      let next = data;
      if (next.comments.length === 0 && page > 1 && next.commentCount > 0) {
        const prevPage = page - 1;
        setCommentsPage(prevPage);
        next = await fetchPostDetail(prevPage);
      }
      setPost(next);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось обновить комментарии";
      toast.error(message);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!post || !newCommentBody.trim() || postingComment) return;
    setPostingComment(true);
    try {
      await api(`/feed/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: newCommentBody.trim() }),
      });
      toast.success("Комментарий опубликован");
      setNewCommentBody("");
      const nextCount = post.commentCount + 1;
      const lastPage = Math.max(1, Math.ceil(nextCount / COMMENTS_LIMIT));
      setCommentsPage(lastPage);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось отправить комментарий";
      toast.error(message);
    } finally {
      setPostingComment(false);
    }
  }

  function startEdit(c: FeedPostDetail["comments"][number]) {
    setEditingCommentId(c.id);
    setEditDraft(c.body);
  }

  function cancelEdit() {
    setEditingCommentId(null);
    setEditDraft("");
  }

  async function saveEdit(commentId: string) {
    const text = editDraft.trim();
    if (!text || savingEdit) return;
    setSavingEdit(true);
    try {
      await api(`/feed/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ body: text }),
      });
      toast.success("Комментарий сохранён");
      cancelEdit();
      await refetchCommentsPage(commentsPage);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось сохранить";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api(`/feed/comments/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Комментарий удалён");
      setDeleteTarget(null);
      const wasOnly = post?.comments.length === 1;
      const page = commentsPage;
      if (wasOnly && page > 1) {
        setCommentsPage(page - 1);
      } else {
        await refetchCommentsPage(page);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось удалить";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  function canModifyComment(c: FeedPostDetail["comments"][number]): boolean {
    if (!user) return false;
    return c.author.id === user.id || isModerator;
  }

  async function confirmDeletePost() {
    if (!post || deletingPost) return;
    setDeletingPost(true);
    try {
      await api(`/feed/posts/${post.id}`, { method: "DELETE" });
      toast.success("Статья удалена");
      setDeletePostOpen(false);
      router.push("/lenta");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось удалить статью";
      toast.error(message);
    } finally {
      setDeletingPost(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
        <div className="mt-8 space-y-3">
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError && !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-6 gap-2" asChild>
          <Link href="/lenta">
            <ArrowLeft className="h-4 w-4" />
            К ленте
          </Link>
        </Button>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center text-sm text-destructive">{loadError}</CardContent>
        </Card>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-6 gap-2" asChild>
          <Link href="/lenta">
            <ArrowLeft className="h-4 w-4" />
            К ленте
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <h1 className="text-xl font-semibold">Статья не найдена</h1>
            <p className="max-w-md text-sm text-muted-foreground">
              Возможно, она удалена или ещё не опубликована.
            </p>
            <Button asChild>
              <Link href="/lenta">К ленте</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-6 gap-2" asChild>
        <Link href="/lenta">
          <ArrowLeft className="h-4 w-4" />
          К ленте
        </Link>
      </Button>

      {canManagePost && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href={`/lenta/${post.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Редактировать
            </Link>
          </Button>
          <Button type="button" variant="destructive" size="sm" className="gap-1" onClick={() => setDeletePostOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Удалить статью
          </Button>
        </div>
      )}

      {post.coverImageUrl && (
        <div className="mb-8 overflow-hidden rounded-xl border bg-muted">
          <img src={post.coverImageUrl} alt="" className="aspect-video w-full object-cover" />
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link
            href={isAuthenticated ? `/profiles/${post.author.id}` : "/auth/login"}
            className="flex items-center gap-2 text-foreground hover:text-primary"
          >
            <Avatar className="h-9 w-9">
              {post.author.avatarUrl ? <AvatarImage src={post.author.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary/10 text-primary">{post.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>
              <span className="font-medium">{post.author.name}</span>
              {post.author.companyName && (
                <span className="block text-xs text-muted-foreground">{post.author.companyName}</span>
              )}
            </span>
          </Link>
          <time dateTime={post.publishedAt}>{formatFeedDate(post.publishedAt)}</time>
          <FeedLikeButton
            postId={post.id}
            likeCount={post.likeCount}
            likedByMe={post.likedByMe}
            isAuthenticated={isAuthenticated}
            onSync={(next) =>
              setPost((p) => (p ? { ...p, likeCount: next.likeCount, likedByMe: next.likedByMe } : p))
            }
          />
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" />
            {post.commentCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {post.uniqueViewCount}
          </span>
        </div>
      </header>

      <MarkdownBody markdown={post.body} />

      <section className="mt-12 border-t pt-8">
        <h2 className="mb-4 text-lg font-semibold">Комментарии ({post.commentCount})</h2>

        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-8 space-y-3">
            <Textarea
              placeholder="Написать комментарий…"
              value={newCommentBody}
              onChange={(e) => setNewCommentBody(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={postingComment}
              className="min-h-[100px] resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{newCommentBody.length} / 2000</span>
              <Button type="submit" disabled={postingComment || !newCommentBody.trim()}>
                {postingComment ? "Отправка…" : "Отправить"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mb-8 rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center text-sm">
            <p className="text-muted-foreground">
              <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Войдите
              </Link>
              , чтобы оставить комментарий.
            </p>
          </div>
        )}

        {post.commentsTotalPages > 1 && (
          <p className="mb-2 text-sm text-muted-foreground">
            Страница {post.commentsPage} из {post.commentsTotalPages}. Всего комментариев: {post.commentCount}.
          </p>
        )}
        {post.commentsTotalPages === 1 && post.comments.length < post.commentCount && (
          <p className="mb-2 text-sm text-muted-foreground">
            Показано {post.comments.length} из {post.commentCount}.
          </p>
        )}
        {post.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет комментариев.</p>
        ) : (
          <ul className="space-y-4">
            {post.comments.map((c) => (
              <li key={c.id} className="rounded-lg border bg-card/50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {c.author.avatarUrl ? <AvatarImage src={c.author.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-xs">{c.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{c.author.name}</span>
                    <time className="text-xs text-muted-foreground" dateTime={c.createdAt}>
                      {formatFeedDate(c.createdAt)}
                    </time>
                  </div>
                  {canModifyComment(c) && editingCommentId !== c.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(c)}
                        aria-label="Редактировать комментарий"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                        aria-label="Удалить комментарий"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                {editingCommentId === c.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      disabled={savingEdit}
                      className="min-h-[80px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => saveEdit(c.id)} disabled={savingEdit || !editDraft.trim()}>
                        {savingEdit ? "Сохранение…" : "Сохранить"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={savingEdit}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {post.commentsTotalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={post.commentsPage <= 1}
              onClick={() => setCommentsPage((p) => Math.max(1, p - 1))}
            >
              Ранее
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={post.commentsPage >= post.commentsTotalPages}
              onClick={() => setCommentsPage((p) => Math.min(post.commentsTotalPages, p + 1))}
            >
              Далее
            </Button>
          </div>
        )}
      </section>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Удалить комментарий?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Текст комментария будет удалён навсегда.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePostOpen} onOpenChange={(open) => !open && !deletingPost && setDeletePostOpen(false)}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Удалить статью?</DialogTitle>
            <DialogDescription>
              Статья «{post.title}» будет удалена вместе с комментариями и лайками. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setDeletePostOpen(false)} disabled={deletingPost}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={confirmDeletePost} disabled={deletingPost}>
              {deletingPost ? "Удаление…" : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
