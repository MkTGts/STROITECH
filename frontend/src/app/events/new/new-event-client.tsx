"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";

export function NewEventClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCommunityId = searchParams.get("communityId") || "";

  const { isAuthenticated, isLoading } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [venue, setVenue] = useState("");
  const [communityId, setCommunityId] = useState(presetCommunityId);
  const [saving, setSaving] = useState(false);

  const backHref = presetCommunityId ? `/events?communityId=${presetCommunityId}` : "/events";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (presetCommunityId) setCommunityId(presetCommunityId);
  }, [presetCommunityId]);

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
      const res = await api<{ success: boolean; data: { id: string } }>("/events", {
        method: "POST",
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          startsAt,
          isOnline,
          venue: isOnline ? null : venue.trim() || null,
          communityId: communityId.trim() || null,
        }),
      });
      toast.success("Событие создано");
      router.replace(`/events/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось создать");
    } finally {
      setSaving(false);
    }
  }

  if (!isLoading && !isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href={backHref}>
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          К событиям
        </Button>
      </Link>
      <h1 className="text-2xl font-bold">Новое событие</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Укажите время и место. Для события в сообществе вставьте UUID сообщества (или откройте эту форму со страницы сообщества).
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="ev-title">Название</Label>
          <Input
            id="ev-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor="ev-desc">Описание</Label>
          <Textarea
            id="ev-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={4}
            maxLength={16000}
          />
        </div>
        <div>
          <Label htmlFor="ev-start">Начало</Label>
          <Input
            id="ev-start"
            type="datetime-local"
            value={startsLocal}
            onChange={(e) => setStartsLocal(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ev-online" checked={isOnline} onCheckedChange={(v) => setIsOnline(!!v)} />
          <Label htmlFor="ev-online" className="font-normal">
            Онлайн
          </Label>
        </div>
        {!isOnline && (
          <div>
            <Label htmlFor="ev-venue">Место</Label>
            <Input
              id="ev-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="mt-1"
              maxLength={500}
              placeholder="Адрес или площадка"
            />
          </div>
        )}
        <div>
          <Label htmlFor="ev-community">ID сообщества (необязательно)</Label>
          <Input
            id="ev-community"
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="mt-1 font-mono text-sm"
            placeholder="uuid"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
        </Button>
      </form>
    </div>
  );
}
