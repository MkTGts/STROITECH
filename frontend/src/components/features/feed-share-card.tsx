"use client";

import Link from "next/link";
import { Building2, LayoutList, Newspaper } from "lucide-react";
import type { FeedSharePreview } from "shared";

const TARGET_LABEL: Record<string, string> = {
  feed_post: "Пост",
  listing: "Объявление",
  construction_object: "Объект",
};

export function FeedShareCard({ preview, className = "" }: { preview: FeedSharePreview; className?: string }) {
  const label = TARGET_LABEL[preview.targetType] ?? "Ссылка";

  return (
    <div className={`overflow-hidden rounded-xl border bg-card/80 ${className}`}>
      {preview.available ? (
        <Link href={preview.path} className="flex gap-3 p-3 transition-colors hover:bg-muted/50">
          <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
            {preview.imageUrl ? (
              <img src={preview.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {preview.targetType === "listing" ? (
                  <Newspaper className="h-8 w-8 opacity-40" aria-hidden />
                ) : preview.targetType === "construction_object" ? (
                  <Building2 className="h-8 w-8 opacity-40" aria-hidden />
                ) : (
                  <LayoutList className="h-8 w-8 opacity-40" aria-hidden />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 py-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 line-clamp-2 font-semibold text-foreground">{preview.title}</p>
            <p className="mt-1 text-xs text-primary">Открыть →</p>
          </div>
        </Link>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">Контент недоступен или удалён.</div>
      )}
    </div>
  );
}
