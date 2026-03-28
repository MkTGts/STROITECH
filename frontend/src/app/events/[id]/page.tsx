"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { EventDetail, EventRsvpStatus } from "shared";
import { toast } from "sonner";

function formatStarts(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      weekday: "long",
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

function AttendeeBlock({
  title,
  users,
}: {
  title: string;
  users: { id: string; name: string; avatarUrl: string | null }[];
}) {
  if (users.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {users.map((u) => (
          <li key={u.id}>
            <Link
              href={`/profiles/${u.id}`}
              className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1 text-sm transition-colors hover:bg-muted/60"
            >
              <Avatar className="h-7 w-7">
                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xs">{u.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="max-w-[10rem] truncate">{u.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const eventId = typeof id === "string" ? id : "";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [data, setData] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api<{ success: boolean; data: EventDetail }>(`/events/${eventId}`);
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Событие не найдено");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setRsvp(status: EventRsvpStatus) {
    if (!isAuthenticated || !eventId) return;
    setRsvpBusy(true);
    try {
      await api(`/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      toast.success("Ответ сохранён");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setRsvpBusy(false);
    }
  }

  async function confirmDelete() {
    if (!eventId) return;
    setDeleting(true);
    try {
      await api(`/events/${eventId}`, { method: "DELETE" });
      toast.success("Событие удалено");
      router.replace("/events");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось удалить");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (!eventId) return null;

  if (loading && !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-muted-foreground">
        Событие не найдено.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/events">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Все события
        </Button>
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <CalendarDays className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{data.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{formatStarts(data.startsAt)}</p>
            <p className="mt-1 text-sm">
              {data.isOnline ? "Онлайн" : data.venue || "Место уточняется"}
            </p>
            {data.community ? (
              <Link
                href={`/communities/${data.community.id}`}
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                {data.community.title}
              </Link>
            ) : null}
          </div>
        </div>
        {data.canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/events/${data.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Изменить
              </Link>
            </Button>
            <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Удалить
            </Button>
          </div>
        )}
      </div>

      {data.description ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="whitespace-pre-wrap text-sm">{data.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Участие</CardTitle>
          <p className="text-sm text-muted-foreground">
            Иду: {data.counts.going} · Возможно: {data.counts.maybe} · Не иду: {data.counts.notGoing}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!authLoading && !isAuthenticated && (
            <p className="text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary underline">
                Войдите
              </Link>
              , чтобы отметить участие.
            </p>
          )}
          {isAuthenticated && data.communityId && (
            <p className="text-xs text-muted-foreground">
              Для событий сообщества нужно быть участником группы.
            </p>
          )}
          {isAuthenticated && (
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["going", "Иду"],
                  ["maybe", "Возможно"],
                  ["not_going", "Не иду"],
                ] as const
              ).map(([status, label]) => (
                <Button
                  key={status}
                  variant={data.myRsvp === status ? "default" : "outline"}
                  size="sm"
                  disabled={rsvpBusy}
                  onClick={() => void setRsvp(status)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Участники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AttendeeBlock title="Иду" users={data.attendees.going} />
          <AttendeeBlock title="Возможно" users={data.attendees.maybe} />
          <AttendeeBlock title="Не иду" users={data.attendees.notGoing} />
          {data.attendees.going.length === 0 &&
          data.attendees.maybe.length === 0 &&
          data.attendees.notGoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока никто не отметился.</p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить событие?</DialogTitle>
            <DialogDescription>Это действие нельзя отменить.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
