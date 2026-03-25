"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api, ApiError, uploadWallImage } from "@/lib/api";
import { FeedMentionPicker } from "@/components/features/feed-mention-picker";

const MAX_ATTACHMENTS = 10;
const MAX_BODY = 10_000;

type WallPostFormCreateProps = {
  mode: "create";
  onPosted: () => void;
};

type WallPostFormEditProps = {
  mode: "edit";
  postId: string;
  initial: { title: string; body: string; attachments: string[] };
  onSaved: () => void;
};

type WallPostFormProps = WallPostFormCreateProps | WallPostFormEditProps;

/**
 * Создание или правка записи стены (kind=wall): текст и до 10 изображений через POST /upload/wall.
 */
export function WallPostForm(props: WallPostFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.mode === "edit") {
      setTitle(props.initial.title.trim() === "" || props.initial.title === " " ? "" : props.initial.title);
      setBody(props.initial.body);
      setAttachments(props.initial.attachments ?? []);
    }
  }, [props]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (attachments.length >= MAX_ATTACHMENTS) {
          toast.error(`Не более ${MAX_ATTACHMENTS} фото`);
          break;
        }
        const { url } = await uploadWallImage(file);
        setAttachments((prev) => [...prev, url]);
      }
    } catch {
      toast.error("Не удалось загрузить изображение");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((u) => u !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const b = body.trim();
    if (!b) {
      toast.error("Введите текст записи");
      return;
    }
    if (b.length > MAX_BODY) {
      toast.error("Текст слишком длинный");
      return;
    }
    const t = title.trim();
    const payload: Record<string, unknown> =
      props.mode === "create"
        ? {
            kind: "wall",
            body: b,
            attachments,
            ...(t ? { title: t.slice(0, 200) } : {}),
          }
        : {
            body: b,
            attachments,
            coverImageUrl: attachments[0] ?? null,
            ...(t ? { title: t.slice(0, 200) } : {}),
          };

    setSaving(true);
    try {
      if (props.mode === "create") {
        await api("/feed/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Запись опубликована");
        setBody("");
        setTitle("");
        setAttachments([]);
        props.onPosted();
        return;
      }
      await api(`/feed/posts/${props.postId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success("Запись сохранена");
      props.onSaved();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Не удалось сохранить";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <Label htmlFor="wall-title">Заголовок (необязательно)</Label>
        <Input
          id="wall-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Краткая подпись к записи"
          className="mt-1"
        />
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="wall-body">Текст</Label>
          <FeedMentionPicker onInsert={(snippet) => setBody((b) => b + snippet)} />
        </div>
        <Textarea
          id="wall-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={MAX_BODY}
          placeholder="Что нового на объекте или в работе? Хэштег: #строительство"
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {body.length} / {MAX_BODY} · Хэштеги через #слово
        </p>
      </div>
      <div>
        <Label>Фото ({attachments.length}/{MAX_ATTACHMENTS})</Label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={onPickFiles} />
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 shadow"
                onClick={() => removeAttachment(url)}
                aria-label="Удалить"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {attachments.length < MAX_ATTACHMENTS && (
            <Button type="button" variant="outline" size="sm" className="h-20 w-20 shrink-0 flex-col gap-0.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">Фото</span>
            </Button>
          )}
        </div>
      </div>
      <Button type="submit" disabled={saving || uploading}>
        {saving ? "Сохранение…" : props.mode === "create" ? "Опубликовать" : "Сохранить"}
      </Button>
    </form>
  );
}
