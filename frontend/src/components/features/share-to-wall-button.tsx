"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Share2 } from "lucide-react";
import type { ShareTargetType } from "shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { FeedMentionPicker } from "@/components/features/feed-mention-picker";

type ShareToWallButtonProps = {
  targetType: ShareTargetType;
  targetId: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  label?: string;
  "aria-label"?: string;
};

export function ShareToWallButton({
  targetType,
  targetId,
  variant = "outline",
  size = "sm",
  className,
  label = "На стену",
  "aria-label": ariaLabel,
}: ShareToWallButtonProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button variant={variant} size={size} className={className} asChild>
        <Link href="/auth/login">Войти, чтобы поделиться</Link>
      </Button>
    );
  }

  async function submit(): Promise<void> {
    setSubmitting(true);
    try {
      await api("/feed/posts", {
        method: "POST",
        body: JSON.stringify({
          kind: "share",
          body: comment.trim(),
          share: { targetType, targetId },
        }),
      });
      toast.success("Запись опубликована на вашей стене");
      setOpen(false);
      setComment("");
      if (user?.id) router.push(`/profiles/${user.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось опубликовать");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={`gap-2 ${className ?? ""}`}
        aria-label={ariaLabel ?? (label ? undefined : "Поделиться на стене")}
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Поделиться на стене</DialogTitle>
            <DialogDescription>
              Комментарий необязателен. Запись появится в вашем профиле во вкладке «Стена».
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <FeedMentionPicker onInsert={(snippet) => setComment((c) => c + snippet)} />
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Ваш комментарий…"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void submit()}>
              {submitting ? "Публикация…" : "Опубликовать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
