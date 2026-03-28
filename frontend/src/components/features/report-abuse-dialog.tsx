"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
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
import { api, ApiError } from "@/lib/api";
import type { ContentReportTargetType } from "shared";
import { toast } from "sonner";

type Props = {
  targetType: ContentReportTargetType;
  targetId: string;
  disabled?: boolean;
  variant?: "ghost" | "outline";
  size?: "sm" | "default";
};

export function ReportAbuseDialog({ targetType, targetId, disabled, variant = "ghost", size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await api("/moderation/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          details: details.trim() || null,
        }),
      });
      toast.success("Жалоба отправлена модераторам");
      setDetails("");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  }

  const label = targetType === "feed_post" ? "Пожаловаться на пост" : "Пожаловаться";

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className="gap-1 text-muted-foreground"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5" />
        {size === "sm" ? "Жалоба" : label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              Модераторы увидят ссылку на контент и ваш комментарий. Повторная жалоба на тот же объект с этого аккаунта не
              принимается.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Почему считаете контент недопустимым (необязательно)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={submitting}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Отправка…" : "Отправить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
