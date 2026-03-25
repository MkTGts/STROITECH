"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { FeedPostForm, type FeedPostFormInitial } from "@/components/features/feed-post-form";
import { WallPostForm } from "@/components/features/wall-post-form";
import { FeedShareCard } from "@/components/features/feed-share-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { FeedPostEditLoad, FeedSharePreview } from "shared";
import { canManageFeedPost } from "../../lenta-client";

export default function LentaEditPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [initial, setInitial] = useState<FeedPostFormInitial | null>(null);
  const [wallInitial, setWallInitial] = useState<{ title: string; body: string; attachments: string[] } | null>(null);
  const [shareEdit, setShareEdit] = useState<{ body: string; preview: FeedSharePreview } | null>(null);
  const [shareSaving, setShareSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (!id || !user) {
      setFetching(false);
      return;
    }

    let cancelled = false;
    setFetching(true);
    setLoadError(null);
    setForbidden(false);

    api<{ success: boolean; data: FeedPostEditLoad }>(`/feed/posts/${id}`, {
      params: { commentsPage: 1, commentsLimit: 1 },
    })
      .then((res) => {
        if (cancelled) return;
        const d = res.data;
        if (!canManageFeedPost(d, user)) {
          setForbidden(true);
          return;
        }
        const kind = d.kind ?? "article";
        if (kind === "share") {
          const preview =
            d.sharePreview ??
            ({
              available: false,
              targetType: d.shareTarget ?? "feed_post",
              targetId: d.shareTargetId ?? "",
              title: "Контент недоступен",
              imageUrl: null,
              path: "#",
            } satisfies FeedSharePreview);
          setShareEdit({ body: d.body, preview });
          setWallInitial(null);
          setInitial(null);
        } else if (kind === "wall") {
          setShareEdit(null);
          setWallInitial({
            title: d.title,
            body: d.body,
            attachments: d.attachments ?? [],
          });
          setInitial(null);
        } else {
          setShareEdit(null);
          setInitial({
            title: d.title,
            excerpt: d.excerpt ?? "",
            body: d.body,
            coverImageUrl: d.coverImageUrl,
          });
          setWallInitial(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadError("Статья не найдена");
        } else {
          const message = err instanceof ApiError ? err.message : "Не удалось загрузить статью";
          setLoadError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user, isAuthenticated, authLoading, router]);

  if (authLoading || (isAuthenticated && !user) || (!isAuthenticated && !forbidden)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">Некорректная ссылка</p>
            <Button asChild>
              <Link href="/lenta">К ленте</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <h1 className="text-xl font-semibold">Нет доступа</h1>
            <p className="max-w-md text-sm text-muted-foreground">Редактировать может автор или модератор.</p>
            <Button asChild>
              <Link href={`/lenta/${id}`}>К статье</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button asChild variant="outline">
              <Link href="/lenta">К ленте</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fetching || (initial === null && wallInitial === null && shareEdit === null)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  async function handleSaveShareComment(): Promise<void> {
    if (!shareEdit) return;
    setShareSaving(true);
    try {
      await api(`/feed/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify({ body: shareEdit.body }),
      });
      toast.success("Комментарий сохранён");
      router.push(`/lenta/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setShareSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">
        {shareEdit ? "Редактирование репоста" : wallInitial ? "Редактирование записи на стене" : "Редактирование статьи"}
      </h1>
      {shareEdit ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground">
              Можно изменить только ваш комментарий к репосту. Ссылка на оригинал не редактируется.
            </p>
            <FeedShareCard preview={shareEdit.preview} />
            <div>
              <Label htmlFor="share-comment">Комментарий</Label>
              <Textarea
                id="share-comment"
                className="mt-1.5"
                rows={4}
                maxLength={2000}
                value={shareEdit.body}
                onChange={(e) => setShareEdit((s) => (s ? { ...s, body: e.target.value } : s))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={shareSaving} onClick={() => void handleSaveShareComment()}>
                {shareSaving ? "Сохранение…" : "Сохранить"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/lenta/${id}`}>Отмена</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : wallInitial ? (
        <WallPostForm mode="edit" postId={id} initial={wallInitial} onSaved={() => router.push(`/lenta/${id}`)} />
      ) : initial ? (
        <FeedPostForm mode="edit" postId={id} initial={initial} />
      ) : null}
    </div>
  );
}
