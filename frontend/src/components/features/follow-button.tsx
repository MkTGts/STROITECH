"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

type FollowButtonProps = {
  targetUserId: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  /** Вызвать после успешной подписки или отписки (например обновить счётчики на странице профиля). */
  onFollowChange?: () => void;
};

/**
 * Подписка на профиль участника (follow). Скрывается для гостей и для собственного профиля.
 */
export function FollowButton({
  targetUserId,
  className,
  size = "default",
  variant = "outline",
  onFollowChange,
}: FollowButtonProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const isSelf = isAuthenticated && user?.id === targetUserId;

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || isSelf) {
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const res = await api<{ success: boolean; data: { following: boolean; isSelf?: boolean } }>(
        `/users/${targetUserId}/follow-status`,
      );
      setFollowing(res.data.following);
    } catch {
      setFollowing(false);
    } finally {
      setFetching(false);
    }
  }, [isAuthenticated, isSelf, targetUserId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function toggleFollow(): Promise<void> {
    if (!following) {
      setLoading(true);
      try {
        await api(`/users/${targetUserId}/follow`, { method: "POST" });
        setFollowing(true);
        onFollowChange?.();
        toast.success("Вы подписались");
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Не удалось подписаться";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      await api(`/users/${targetUserId}/follow`, { method: "DELETE" });
      setFollowing(false);
      onFollowChange?.();
      toast.success("Подписка отменена");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Не удалось отписаться";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated || isSelf) return null;
  if (fetching || following === null) {
    return (
      <Button type="button" variant={variant} size={size} className={className} disabled>
        …
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={following ? "secondary" : variant}
      size={size}
      className={`gap-2 ${className ?? ""}`}
      disabled={loading}
      onClick={() => void toggleFollow()}
    >
      {following ? (
        <>
          <UserMinus className="h-4 w-4" />
          Отписаться
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Подписаться
        </>
      )}
    </Button>
  );
}
