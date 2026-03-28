"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RegionSelect } from "@/components/ui/region-select";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";

export default function NewCommunityPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (t.length < 2) {
      toast.error("Укажите название");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ success: boolean; data: { id: string } }>("/communities", {
        method: "POST",
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          region: region.trim() || null,
        }),
      });
      toast.success("Сообщество создано");
      router.replace(`/communities/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось создать");
    } finally {
      setSaving(false);
    }
  }

  if (!isLoading && !isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/communities">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          К сообществам
        </Button>
      </Link>
      <h1 className="text-2xl font-bold">Новое сообщество</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        После создания вы станете администратором; любой пользователь сможет вступить (открытая группа v1).
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="c-title">Название</Label>
          <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" maxLength={200} />
        </div>
        <div>
          <Label htmlFor="c-desc">Описание</Label>
          <Textarea id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={4} maxLength={8000} />
        </div>
        <RegionSelect
          id="c-region"
          label="Регион (необязательно)"
          value={region}
          onValueChange={setRegion}
          optional
          placeholder="Выберите регион из списка"
        />
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
        </Button>
      </form>
    </div>
  );
}
