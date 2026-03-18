"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, MapPin, Clock, Star, Pencil, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

export default function ListingDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api<any>(`/listings/${id}`)
      .then((res) => setListing(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!listing?.photos || !Array.isArray(listing.photos)) {
      setActivePhotoIndex(0);
      return;
    }
    if (activePhotoIndex >= listing.photos.length) {
      setActivePhotoIndex(0);
    }
  }, [listing, activePhotoIndex]);

  function showPrevPhoto() {
    if (!listing?.photos?.length) return;
    setActivePhotoIndex((prev) => (prev - 1 + listing.photos.length) % listing.photos.length);
  }

  function showNextPhoto() {
    if (!listing?.photos?.length) return;
    setActivePhotoIndex((prev) => (prev + 1) % listing.photos.length);
  }

  function openLightbox(index: number) {
    setActivePhotoIndex(index);
    setIsLightboxOpen(true);
  }

  function closeLightbox() {
    setIsLightboxOpen(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Объявление не найдено</p>
        <Link href="/listings">
          <Button variant="outline" className="mt-4">Назад к объявлениям</Button>
        </Link>
      </div>
    );
  }

  const isModerator = isAuthenticated && user?.role === "moderator";
  const canManageListing = isAuthenticated && (isModerator || user?.id === listing.userId);
  const canDeleteListing = canManageListing;

  async function handleDeleteListing(): Promise<void> {
    setDeleting(true);
    try {
      await api(`/listings/${id}`, { method: "DELETE" });
      setDeleteDialogOpen(false);
      window.location.href = "/listings";
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/listings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> К объявлениям
          </Button>
        </Link>
        {canManageListing && (
          <Link href={`/listings/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" /> Редактировать
            </Button>
          </Link>
        )}
        {canDeleteListing && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Удалить объявление
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {listing.photos?.length > 0 ? (
            <div className="grid gap-3">
              <div className="relative w-full overflow-hidden rounded-xl bg-muted">
                <div className="relative aspect-[4/3] w-full">
                  <button
                    type="button"
                    className="absolute inset-0"
                    onClick={() => openLightbox(activePhotoIndex)}
                  >
                    <img
                      src={listing.photos[activePhotoIndex]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  </button>
                  {listing.photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={showPrevPhoto}
                        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow hover:bg-black/60"
                        aria-label="Предыдущее фото"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={showNextPhoto}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow hover:bg-black/60"
                        aria-label="Следующее фото"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-0.5 text-xs text-white">
                        {activePhotoIndex + 1} / {listing.photos.length}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {listing.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {listing.photos.slice(0, 8).map((photo: string, i: number) => (
                    <button
                      type="button"
                      key={photo + i}
                      onClick={() => openLightbox(i)}
                      className="relative overflow-hidden rounded-lg bg-muted ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div
                        className={cn(
                          "relative aspect-[4/3] w-full",
                          activePhotoIndex === i && "ring-2 ring-primary",
                        )}
                      >
                        <img
                          src={photo}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              Нет фото
            </div>
          )}

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              {listing.isPromoted && (
                <Badge className="gap-1 bg-amber-500 text-white"><Star className="h-3 w-3" /> Продвинуто</Badge>
              )}
              {listing.category && (
                <Badge variant="secondary">
                  {(listing.category.parent?.name ? `${listing.category.parent.name} → ` : "") + listing.category.name}
                </Badge>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold">{listing.title}</h1>
            {listing.region && (
              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> Регион: {listing.region}
              </p>
            )}
            {listing.price && (
              <p className="mt-2 text-2xl font-bold text-primary">{Number(listing.price).toLocaleString("ru-RU")} ₽</p>
            )}
            <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
            <p className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Размещено{" "}
              {new Date(listing.createdAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div>
          {listing.user && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {listing.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/profiles/${listing.user.id}`} className="block hover:text-primary">
                      {listing.user.companyName && (
                        <span className="font-semibold">{listing.user.companyName}</span>
                      )}
                      <span className={listing.user.companyName ? "block text-sm text-muted-foreground" : "font-semibold"}>
                        {listing.user.name}
                      </span>
                    </Link>
                    <p className="text-sm text-muted-foreground">{ROLE_LABELS[listing.user.role]}</p>
                  </div>
                </div>
                {listing.user.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{listing.user.description}</p>
                )}
                {isAuthenticated ? (
                  <Link href={`/chat?to=${listing.user.id}&context=listing&contextId=${listing.id}`}>
                    <Button className="mt-4 w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> Написать
                    </Button>
                  </Link>
                ) : (
                  <Link href="/auth/register">
                    <Button variant="secondary" className="mt-4 w-full">
                      Зарегистрируйтесь, чтобы написать
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isLightboxOpen && listing.photos?.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative flex h-full max-h-[90vh] w-full max-w-4xl flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex-1 overflow-hidden rounded-xl bg-black/40">
              <div className="relative h-full w-full">
                <img
                  src={listing.photos[activePhotoIndex]}
                  alt={listing.title}
                  className="h-full w-full object-contain"
                />
                {listing.photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPrevPhoto}
                      className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow hover:bg-black/80"
                      aria-label="Предыдущее фото"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={showNextPhoto}
                      className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow hover:bg-black/80"
                      aria-label="Следующее фото"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-0.5 text-xs text-white">
                      {activePhotoIndex + 1} / {listing.photos.length}
                    </div>
                  </>
                )}
              </div>
            </div>

            {listing.photos.length > 1 && (
              <div className="mt-3 flex justify-center gap-2 overflow-x-auto">
                {listing.photos.slice(0, 12).map((photo: string, i: number) => (
                  <button
                    key={photo + i}
                    type="button"
                    onClick={() => setActivePhotoIndex(i)}
                    className={cn(
                      "relative h-14 w-20 overflow-hidden rounded-md border border-transparent",
                      activePhotoIndex === i && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <img
                      src={photo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Удалить объявление?</DialogTitle>
            <DialogDescription>
              Объявление «{listing.title}» будет удалено безвозвратно. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDeleteListing} disabled={deleting}>
              {deleting ? "Удаление..." : "Удалить объявление"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
