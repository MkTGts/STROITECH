"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VerifiedBadgeProps = {
  className?: string;
  /** Компактный вариант — только иконка (например у имени в списке чатов). */
  compact?: boolean;
};

export function VerifiedBadge({ className, compact }: VerifiedBadgeProps) {
  if (compact) {
    return (
      <span
        className={cn("inline-flex shrink-0 text-emerald-600 dark:text-emerald-400", className)}
        title="Проверенный участник"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden />
        <span className="sr-only">Проверен</span>
      </span>
    );
  }
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-0.5 border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      Проверен
    </Badge>
  );
}
