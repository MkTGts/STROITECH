"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LikeApiResponse = { success: boolean; data: { likeCount: number; likedByMe: boolean } };

type FeedCommentLikeButtonProps = {
  commentId: string;
  likeCount: number;
  likedByMe?: boolean;
  isAuthenticated: boolean;
  onSync?: (next: { likeCount: number; likedByMe: boolean }) => void;
  className?: string;
};

export function FeedCommentLikeButton({
  commentId,
  likeCount: initialCount,
  likedByMe: initialLiked = false,
  isAuthenticated,
  onSync,
  className,
}: FeedCommentLikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCount(initialCount);
    setLiked(initialLiked);
  }, [commentId, initialCount, initialLiked]);

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
        ? await api<LikeApiResponse>(`/feed/comments/${commentId}/like`, { method: "DELETE" })
        : await api<LikeApiResponse>(`/feed/comments/${commentId}/like`, { method: "POST" });

      const { likeCount: next, likedByMe } = res.data;
      setCount(next);
      setLiked(likedByMe);
      onSync?.({ likeCount: next, likedByMe });
    } catch (err: unknown) {
      setLiked(wasLiked);
      setCount(prevCount);
      const message = err instanceof ApiError ? err.message : "Не удалось обновить лайк";
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Heart className="h-3.5 w-3.5" aria-hidden />
        {initialCount}
        <Button variant="link" className="h-auto min-h-0 p-0 text-xs" asChild>
          <Link href="/auth/login">Войти</Link>
        </Button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60",
        className,
      )}
      title={liked ? "Снять лайк" : "Нравится"}
    >
      <Heart className={cn("h-3.5 w-3.5", liked && "fill-primary text-primary")} aria-hidden />
      {count}
    </button>
  );
}
