"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RUSSIAN_REGIONS } from "@/constants/regions";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function EditObjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [object, setObject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    region: "",
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    setFormInitialized(false);
    api<any>(`/objects/${id}`)
      .then((res) => setObject(res.data))
      .catch(() => setObject(null))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || !object) return;
    if (user?.id !== object.userId) {
      router.replace(`/objects/${id}`);
      return;
    }
    if (formInitialized) return;
    setForm({
      title: object.title ?? "",
      description: object.description ?? "",
      region: object.region ?? "",
    });
    setFormInitialized(true);
  }, [object, id, user?.id, isLoading, formInitialized, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/objects/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          region: form.region || null,
        }),
      });
      toast.success("Объект обновлён");
      router.push(`/objects/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !object) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (user?.id !== object.userId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/objects/${id}`}>
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К объекту
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать объект</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Название объекта</Label>
              <Input
                placeholder="Например: Строительство дома в Подмосковье"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                minLength={3}
              />
            </div>

            <div>
              <Label>Описание (опционально)</Label>
              <Textarea
                placeholder="Подробности о проекте..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Регион</Label>
              <Select
                value={form.region}
                onValueChange={(value) => setForm((p) => ({ ...p, region: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите регион России" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
                  {RUSSIAN_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
