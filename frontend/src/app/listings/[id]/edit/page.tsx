"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RUSSIAN_REGIONS } from "@/constants/regions";
import { useAuthStore } from "@/lib/store";
import { api, uploadFile } from "@/lib/api";
import { toast } from "sonner";

type Category = { id: number; name: string; type: string; children?: Category[] };

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    region: "",
    price: "",
    photos: [] as string[],
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    setFormInitialized(false);
    Promise.all([
      api<any>("/categories").then((res) => setCategories(res.data)),
      api<any>(`/listings/${id}`).then((res) => setListing(res.data)),
    ]).catch(() => setListing(null)).finally(() => setLoading(false));
  }, [id, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isLoading || !listing) return;
    if (user?.id !== listing.userId) {
      router.replace(`/listings/${id}`);
      return;
    }
    if (formInitialized) return;
    const categoryId = listing.categoryId ?? listing.category?.id;
    const region = listing.region ?? "";
    setForm({
      title: listing.title ?? "",
      description: listing.description ?? "",
      categoryId: categoryId != null ? String(categoryId) : "",
      region: typeof region === "string" ? region : "",
      price: listing.price != null ? String(listing.price) : "",
      photos: Array.isArray(listing.photos) ? listing.photos : [],
    });
    setFormInitialized(true);
  }, [listing, id, user?.id, isLoading, formInitialized, router]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const result = await uploadFile(file);
        setForm((prev) => ({ ...prev, photos: [...prev.photos, result.url] }));
      } catch {
        toast.error("Ошибка загрузки изображения");
      }
    }
  }

  function removePhoto(index: number) {
    setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(`/listings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          categoryId: Number(form.categoryId),
          region: form.region || undefined,
          price: form.price ? Number(form.price) : undefined,
          photos: form.photos,
        }),
      });
      toast.success("Объявление обновлено");
      router.push(`/listings/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const allSubcategories = categories.flatMap((cat) =>
    (cat.children || []).map((child) => ({ ...child, parentName: cat.name })),
  );

  if (loading || !listing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (user?.id !== listing.userId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/listings/${id}`}>
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К объявлению
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Редактировать объявление</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Категория</Label>
              <Select value={form.categoryId} onValueChange={(v) => updateField("categoryId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
                  {allSubcategories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.parentName} → {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Регион</Label>
              <Select value={form.region} onValueChange={(v) => updateField("region", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите регион России" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
                  {RUSSIAN_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Заголовок</Label>
              <Input
                placeholder="Кратко опишите предложение"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div>
              <Label>Описание</Label>
              <Textarea
                placeholder="Подробное описание..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                required
                minLength={10}
                rows={5}
              />
            </div>

            <div>
              <Label>Цена (₽, опционально)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
              />
            </div>

            <div>
              <Label>Фотографии</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="group relative h-20 w-20 overflow-hidden rounded-lg border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
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
