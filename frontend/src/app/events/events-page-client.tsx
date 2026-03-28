"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { EventListItem } from "shared";
import { toast } from "sonner";

function formatStarts(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function EventsPageClient() {
  const searchParams = useSearchParams();
  const filterCommunityId = searchParams.get("communityId") || undefined;

  const { isAuthenticated } = useAuthStore();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [items, setItems] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (w: "upcoming" | "past") => {
      setLoading(true);
      try {
        const res = await api<{ success: boolean; data: { items: EventListItem[] } }>("/events", {
          params: {
            when: w,
            limit: 40,
            page: 1,
            communityId: filterCommunityId,
          },
        });
        setItems(res.data.items);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Не удалось загрузить события");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [filterCommunityId],
  );

  useEffect(() => {
    void load(when);
  }, [when, load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">События</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Встречи, выставки и другие мероприятия. Отметьте, пойдёте ли вы.
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild className="gap-2 shrink-0">
            <Link href={filterCommunityId ? `/events/new?communityId=${filterCommunityId}` : "/events/new"}>
              <Plus className="h-4 w-4" />
              Новое событие
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={when} onValueChange={(v) => setWhen(v as "upcoming" | "past")} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Предстоящие</TabsTrigger>
          <TabsTrigger value="past">Прошедшие</TabsTrigger>
        </TabsList>
        <TabsContent value={when} className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {when === "upcoming" ? "Нет предстоящих событий." : "Прошедших событий пока нет."}
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {items.map((ev) => (
                <li key={ev.id}>
                  <Link href={`/events/${ev.id}`}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{ev.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatStarts(ev.startsAt)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ev.isOnline ? "Онлайн" : ev.venue || "Место уточняется"}
                          </p>
                          {ev.community ? (
                            <p className="mt-1 text-xs text-muted-foreground">{ev.community.title}</p>
                          ) : null}
                          {ev.myRsvp ? (
                            <p className="mt-2 text-xs font-medium text-primary">
                              Ваш ответ:{" "}
                              {ev.myRsvp === "going"
                                ? "иду"
                                : ev.myRsvp === "maybe"
                                  ? "возможно"
                                  : "не иду"}
                            </p>
                          ) : null}
                        </div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
