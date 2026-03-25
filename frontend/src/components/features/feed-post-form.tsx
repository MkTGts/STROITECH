"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, ApiError, uploadFile } from "@/lib/api";
import { FeedMentionPicker } from "@/components/features/feed-mention-picker";

export type FeedPostFormInitial = {
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string | null;
};

type FeedPostFormProps = {
  mode: "create" | "edit";
  postId?: string;
  initial?: FeedPostFormInitial;
};

/**
 * Создание / правка статьи ленты: Markdown в поле body, обложка через POST /api/upload/image.
 */
export function FeedPostForm({ mode, postId, initial }: FeedPostFormProps) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setExcerpt(initial.excerpt ?? "");
      setBody(initial.body);
      setCoverImageUrl(initial.coverImageUrl);
    }
  }, [initial]);

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const { url } = await uploadFile(file);
      setCoverImageUrl(url);
      toast.success("Обложка загружена");
    } catch {
      toast.error("Не удалось загрузить изображение");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  function clearCover() {
    setCoverImageUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      toast.error("Заполните заголовок и текст статьи");
      return;
    }
    const ex = excerpt.trim();
    const payload = {
      title: t,
      body: b,
      excerpt: ex.length ? ex : null,
      coverImageUrl: coverImageUrl || null,
    };

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await api<{ success: boolean; data: { id: string } }>("/feed/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Статья опубликована");
        router.push(`/lenta/${res.data.id}`);
        return;
      }
      if (!postId) {
        toast.error("Не указан пост");
        return;
      }
      await api(`/feed/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Изменения сохранены");
      router.push(`/lenta/${postId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось сохранить";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" type="button" asChild>
        <Link href="/lenta">
          <ArrowLeft className="h-4 w-4" />
          К ленте
        </Link>
      </Button>

      <div className="space-y-2">
        <Label htmlFor="feed-title">Заголовок</Label>
        <Input
          id="feed-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Заголовок статьи"
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">{title.length} / 200</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="feed-excerpt">Краткое описание (необязательно)</Label>
          <FeedMentionPicker onInsert={(snippet) => setExcerpt((b) => b + snippet)} />
        </div>
        <Textarea
          id="feed-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Появится в списке статей; #теги здесь тоже попадут в разметку поста"
          disabled={saving}
          className="min-h-[72px] resize-y"
        />
        <p className="text-xs text-muted-foreground">{excerpt.length} / 500</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="feed-body">Текст (Markdown)</Label>
          <FeedMentionPicker onInsert={(snippet) => setBody((b) => b + snippet)} />
        </div>
        <Textarea
          id="feed-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          placeholder="Текст в формате Markdown. Хэштеги и упоминания учитываются и в кратком описании выше."
          disabled={saving}
          className="min-h-[320px] resize-y font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          {body.length.toLocaleString("ru-RU")} символов · Хэштег #слово · Упоминание — кнопка «Упомянуть»
        </p>
      </div>

      <div className="space-y-2">
        <Label>Обложка</Label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleCoverChange}
            disabled={saving || uploadingCover}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={saving || uploadingCover}
            onClick={() => coverInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploadingCover ? "Загрузка…" : "Загрузить изображение"}
          </Button>
          {coverImageUrl && (
            <Button type="button" variant="ghost" size="sm" className="gap-1 text-destructive" onClick={clearCover} disabled={saving}>
              <X className="h-4 w-4" />
              Убрать обложку
            </Button>
          )}
        </div>
        {coverImageUrl && (
          <div className="mt-2 overflow-hidden rounded-lg border bg-muted">
            <img src={coverImageUrl} alt="" className="aspect-video max-h-48 w-full object-cover" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохранение…" : mode === "create" ? "Опубликовать" : "Сохранить"}
        </Button>
        <Button type="button" variant="outline" asChild disabled={saving}>
          <Link href={mode === "edit" && postId ? `/lenta/${postId}` : "/lenta"}>Отмена</Link>
        </Button>
      </div>
    </form>
  );
}
