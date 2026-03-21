"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { FeedPostForm, type FeedPostFormInitial } from "@/components/features/feed-post-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FeedPostEditLoad } from "shared";
import { canManageFeedPost } from "../../lenta-client";

export default function LentaEditPostPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [initial, setInitial] = useState<FeedPostFormInitial | null>(null);
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
        setInitial({
          title: d.title,
          excerpt: d.excerpt ?? "",
          body: d.body,
          coverImageUrl: d.coverImageUrl,
        });
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

  if (fetching || !initial) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold md:text-3xl">Редактирование статьи</h1>
      <FeedPostForm mode="edit" postId={id} initial={initial} />
    </div>
  );
}
