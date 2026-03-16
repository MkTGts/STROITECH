"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, MapPin, Clock, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  useEffect(() => {
    api<any>(`/listings/${id}`)
      .then((res) => setListing(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/listings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> К объявлениям
          </Button>
        </Link>
        {isAuthenticated && user?.id === listing.userId && (
          <Link href={`/listings/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Pencil className="h-4 w-4" /> Редактировать
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {listing.photos?.length > 0 ? (
            <div className="grid gap-2">
              <div className="overflow-hidden rounded-xl">
                <img src={listing.photos[0]} alt={listing.title} className="h-80 w-full object-cover" />
              </div>
              {listing.photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {listing.photos.slice(1, 5).map((photo: string, i: number) => (
                    <div key={i} className="overflow-hidden rounded-lg">
                      <img src={photo} alt="" className="h-20 w-full object-cover" />
                    </div>
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
              {listing.category && <Badge variant="secondary">{listing.category.name}</Badge>}
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
    </div>
  );
}
