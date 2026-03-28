"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { FollowButton } from "@/components/features/follow-button";
import { profileCardActionButtonClassName } from "@/constants/profile-card";
import { VerifiedBadge } from "@/components/features/verified-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ContactRecommendationItem } from "shared";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
  moderator: "Модератор",
};

type Props = {
  limit?: number;
  className?: string;
};

/**
 * Рекомендации контактов (JWT): регион + роль, сеть подписок, пересечение категорий объявлений.
 */
export function ContactRecommendationsWidget({ limit = 8, className = "" }: Props) {
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<ContactRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecs = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ success: boolean; data: { items: ContactRecommendationItem[] } }>("/users/recommendations", {
        params: { limit },
      });
      setItems(res.data?.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, limit]);

  useEffect(() => {
    void fetchRecs();
  }, [fetchRecs]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {Array.from({ length: Math.min(limit, 4) }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold md:text-xl">Вам могут подойти</h2>
        </div>
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/profiles">Все участники</Link>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((u) => (
          <Card key={u.id} className="overflow-hidden">
            <CardContent className="flex flex-col gap-3 p-4">
              <Link href={`/profiles/${u.id}`} className="flex min-w-0 items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-primary/10 text-sm text-primary">{u.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <p className="truncate font-medium text-foreground">{u.name}</p>
                    {u.isVerified ? <VerifiedBadge compact className="shrink-0" /> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</p>
                  {u.hint ? <p className="mt-0.5 text-xs text-primary/80">{u.hint}</p> : null}
                </div>
              </Link>
              <FollowButton
                targetUserId={u.id}
                size="default"
                variant="default"
                className={profileCardActionButtonClassName}
                onFollowChange={() => void fetchRecs()}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
