"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LikeApiResponse = { success: boolean; data: { likeCount: number; likedByMe: boolean } };

type FeedLikeButtonProps = {
  postId: string;
  likeCount: number;
  /** Для гостя не передаётся / false — только просмотр счётчика */
  likedByMe?: boolean;
  isAuthenticated: boolean;
  /** После успешного ответа API — синхронизация с сервером (счётчик из БД) */
  onSync?: (next: { likeCount: number; likedByMe: boolean }) => void;
  /** Компактный вид для карточки в сетке */
  compact?: boolean;
};

/**
 * Лайк только для авторизованных; гость видит счётчик и ссылку «Войти».
 * Оптимистичный UI, затем ответ POST/DELETE подставляет актуальные likeCount / likedByMe.
 */
export function FeedLikeButton({
  postId,
  likeCount: initialCount,
  likedByMe: initialLiked = false,
  isAuthenticated,
  onSync,
  compact,
}: FeedLikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCount(initialCount);
    setLiked(initialLiked);
  }, [postId, initialCount, initialLiked]);

  if (!isAuthenticated) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground",
          compact ? "text-xs" : "text-sm",
        )}
      >
        <span className="inline-flex items-center gap-1" title="Лайки">
          <Heart className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
          {initialCount}
        </span>
        <Button variant="link" size="sm" className={cn("h-auto p-0", compact && "text-xs")} asChild>
          <Link href="/auth/login">
            {compact ? "Войти" : "Войти, чтобы лайкнуть"}
          </Link>
        </Button>
      </div>
    );
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const wasLiked = liked;
    const prevCount = count;
    const nextLiked = !wasLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setCount(nextCount);
    setPending(true);

    try {
      const res = wasLiked
        ? await api<LikeApiResponse>(`/feed/posts/${postId}/like`, { method: "DELETE" })
        : await api<LikeApiResponse>(`/feed/posts/${postId}/like`, { method: "POST" });

      const { likeCount, likedByMe } = res.data;
      setCount(likeCount);
      setLiked(likedByMe);
      onSync?.({ likeCount, likedByMe });
    } catch (err: unknown) {
      setLiked(wasLiked);
      setCount(prevCount);
      const message = err instanceof ApiError ? err.message : "Не удалось обновить лайк";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60",
        compact ? "text-xs" : "text-sm",
      )}
      title={liked ? "Снять лайк" : "Нравится"}
    >
      <Heart
        className={cn(iconClass, liked && "fill-primary text-primary")}
        aria-hidden
      />
      {count}
    </button>
  );
}
