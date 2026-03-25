"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import type { ConstructionObject, PhotoAlbumDetail } from "shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, uploadAlbumImage } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";

export function AlbumPageClient() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [album, setAlbum] = useState<PhotoAlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [objects, setObjects] = useState<ConstructionObject[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectId, setObjectId] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteAlbumOpen, setDeleteAlbumOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const albumId = typeof id === "string" ? id : null;
  const isOwner = Boolean(isAuthenticated && user?.id && album?.ownerId === user.id);

  const loadAlbum = useCallback(async () => {
    if (!albumId) return;
    const res = await api<{ success: boolean; data: PhotoAlbumDetail }>(`/albums/${albumId}`);
    setAlbum(res.data);
    setTitle(res.data.title);
    setDescription(res.data.description ?? "");
    setObjectId(res.data.objectId);
  }, [albumId]);

  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    setLoading(true);
    loadAlbum()
      .catch(() => {
        if (!cancelled) setAlbum(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [albumId, loadAlbum]);

  useEffect(() => {
    if (!isOwner || !user?.id) return;
    let cancelled = false;
    api<{ success: boolean; data: { items: ConstructionObject[] } }>("/objects", {
      params: { userId: user.id, page: 1, limit: 100 },
    })
      .then((res) => {
        if (!cancelled) setObjects(res.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setObjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, user?.id]);

  async function handleSaveMeta(): Promise<void> {
    if (!albumId || !isOwner) return;
    setSavingMeta(true);
    try {
      const res = await api<{ success: boolean; data: PhotoAlbumDetail }>(`/albums/${albumId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          objectId: objectId === null ? null : objectId,
        }),
      });
      setAlbum(res.data);
      toast.success("Альбом сохранён");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleFilesSelected(files: FileList | null): Promise<void> {
    if (!albumId || !isOwner || !files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadAlbumImage(file);
        await api(`/albums/${albumId}/photos`, {
          method: "POST",
          body: JSON.stringify({ url }),
        });
      }
      await loadAlbum();
      toast.success(files.length > 1 ? "Фото добавлены" : "Фото добавлено");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photoId: string): Promise<void> {
    if (!albumId || !isOwner) return;
    try {
      await api(`/albums/${albumId}/photos/${photoId}`, { method: "DELETE" });
      await loadAlbum();
      toast.success("Фото удалено");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить");
    }
  }

  async function movePhoto(photoId: string, dir: -1 | 1): Promise<void> {
    if (!albumId || !album?.photos?.length) return;
    const ordered = [...album.photos].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = ordered.findIndex((p) => p.id === photoId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= ordered.length) return;
    const ids = ordered.map((p) => p.id);
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    try {
      await api(`/albums/${albumId}/photos/reorder`, {
        method: "PUT",
        body: JSON.stringify({ photoIds: ids }),
      });
      await loadAlbum();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось изменить порядок");
    }
  }

  async function handleDeleteAlbum(): Promise<void> {
    if (!albumId || !isOwner) return;
    setDeleting(true);
    try {
      await api(`/albums/${albumId}`, { method: "DELETE" });
      toast.success("Альбом удалён");
      if (album?.ownerId) router.push(`/profiles/${album.ownerId}`);
      else router.push("/profiles");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Не удалось удалить альбом");
    } finally {
      setDeleting(false);
      setDeleteAlbumOpen(false);
    }
  }

  if (!albumId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        Некорректная ссылка
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl justify-center px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Альбом не найден</p>
        <Link href="/profiles" className="mt-4 inline-block text-primary hover:underline">
          К участникам
        </Link>
      </div>
    );
  }

  const sortedPhotos = [...(album.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/profiles/${album.ownerId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> К профилю
          </Button>
        </Link>
        {isOwner && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-destructive"
              onClick={() => setDeleteAlbumOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Удалить альбом
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleFilesSelected(e.target.files)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Добавить фото
            </Button>
          </>
        )}
      </div>

      {isOwner ? (
        <Card className="mb-8">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-xl font-bold">Редактирование альбома</h1>
            <div>
              <Label htmlFor="album-title">Название</Label>
              <Input
                id="album-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="album-desc">Описание</Label>
              <Textarea
                id="album-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Связанный объект (необязательно)</Label>
              <Select
                value={objectId ?? "__none__"}
                onValueChange={(v) => setObjectId(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбран" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Не привязан</SelectItem>
                  {objects.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={() => void handleSaveMeta()} disabled={savingMeta || !title.trim()}>
              {savingMeta ? "Сохранение..." : "Сохранить сведения"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{album.title}</h1>
          {album.description ? (
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{album.description}</p>
          ) : null}
          {album.object ? (
            <p className="mt-2 text-sm">
              Объект:{" "}
              <Link href={`/objects/${album.object.id}`} className="text-primary hover:underline">
                {album.object.title}
              </Link>
            </p>
          ) : null}
        </div>
      )}

      {sortedPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <ImageIcon className="mb-2 h-12 w-12 opacity-40" />
          <p>В альбоме пока нет фотографий.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sortedPhotos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-xl border bg-card">
              <div className="relative aspect-[4/3] bg-muted">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-2 p-3">
                {photo.caption ? <p className="text-sm text-muted-foreground">{photo.caption}</p> : null}
                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => void movePhoto(photo.id, -1)}
                      aria-label="Раньше"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={index === sortedPhotos.length - 1}
                      onClick={() => void movePhoto(photo.id, 1)}
                      aria-label="Позже"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void removePhoto(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={deleteAlbumOpen} onOpenChange={setDeleteAlbumOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Удалить альбом?</DialogTitle>
            <DialogDescription>Фотографии будут удалены вместе с альбомом. Действие необратимо.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteAlbumOpen(false)}>
              Отмена
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void handleDeleteAlbum()}>
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
