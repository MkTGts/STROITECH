"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { EventDetail } from "shared";
import { toast } from "sonner";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();
  const eventId = typeof id === "string" ? id : "";
  const { isAuthenticated, isLoading } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [venue, setVenue] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api<{ success: boolean; data: EventDetail }>(`/events/${eventId}`);
      const d = res.data;
      if (!d.canManage) {
        toast.error("Нет прав на редактирование");
        setLoading(false);
        router.replace(`/events/${eventId}`);
        return;
      }
      setAllowed(true);
      setTitle(d.title);
      setDescription(d.description ?? "");
      setStartsLocal(toDatetimeLocalValue(d.startsAt));
      setIsOnline(d.isOnline);
      setVenue(d.venue ?? "");
      setCommunityId(d.communityId ?? "");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось загрузить");
      router.replace("/events");
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (t.length < 2) {
      toast.error("Укажите название");
      return;
    }
    if (!startsLocal) {
      toast.error("Укажите дату и время начала");
      return;
    }
    const startsAt = new Date(startsLocal).toISOString();

    setSaving(true);
    try {
      await api(`/events/${eventId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          startsAt,
          isOnline,
          venue: isOnline ? null : venue.trim() || null,
          communityId: communityId.trim() || null,
        }),
      });
      toast.success("Сохранено");
      router.replace(`/events/${eventId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  if (!isLoading && !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href={`/events/${eventId}`}>
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          К событию
        </Button>
      </Link>
      <h1 className="text-2xl font-bold">Редактирование события</h1>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="ee-title">Название</Label>
          <Input
            id="ee-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor="ee-desc">Описание</Label>
          <Textarea
            id="ee-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={4}
            maxLength={16000}
          />
        </div>
        <div>
          <Label htmlFor="ee-start">Начало</Label>
          <Input
            id="ee-start"
            type="datetime-local"
            value={startsLocal}
            onChange={(e) => setStartsLocal(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ee-online" checked={isOnline} onCheckedChange={(v) => setIsOnline(!!v)} />
          <Label htmlFor="ee-online" className="font-normal">
            Онлайн
          </Label>
        </div>
        {!isOnline && (
          <div>
            <Label htmlFor="ee-venue">Место</Label>
            <Input
              id="ee-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="mt-1"
              maxLength={500}
            />
          </div>
        )}
        <div>
          <Label htmlFor="ee-community">ID сообщества (необязательно)</Label>
          <Input
            id="ee-community"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="mt-1 font-mono text-sm"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
        </Button>
      </form>
    </div>
  );
}
