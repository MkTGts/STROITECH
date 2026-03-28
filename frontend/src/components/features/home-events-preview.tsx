"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { EventListItem } from "shared";

function formatStarts(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HomeEventsPreview() {
  const [items, setItems] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ success: boolean; data: { items: EventListItem[] } }>("/events", {
      params: { when: "upcoming", limit: 5, page: 1 },
    })
      .then((res) => setItems(res.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <CalendarDays className="h-10 w-10 opacity-40" />
          <p>Пока нет запланированных событий. Создайте встречу или день открытых дверей.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/events/new">Создать событие</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
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
                  <p className="font-medium leading-tight">{ev.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatStarts(ev.startsAt)}</p>
                  {ev.community ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{ev.community.title}</p>
                  ) : null}
                  {ev.attendeeCount > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">Ответов: {ev.attendeeCount}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
