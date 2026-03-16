"use client";

import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store";

type ListingCardProps = {
  listing: {
    id: string;
    title: string;
    description: string;
    region?: string | null;
    photos: string[];
    price: number | null;
    isPromoted: boolean;
    createdAt: string;
    user?: { id: string; name: string; companyName: string | null; avatarUrl: string | null; role: string };
    category?: { id: number; name: string; type: string };
  };
};

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

export function ListingCard({ listing }: ListingCardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const detailHref = isAuthenticated ? `/listings/${listing.id}` : "/auth/login";
  const profileHref = (id: string) => (isAuthenticated ? `/profiles/${id}` : "/auth/login");

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={detailHref} className="relative block aspect-[4/3] overflow-hidden bg-muted">
        {listing.photos.length > 0 ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Нет фото
          </div>
        )}
        {listing.isPromoted && (
          <Badge className="absolute left-2 top-2 gap-1 bg-amber-500 text-white">
            <Star className="h-3 w-3" /> Топ
          </Badge>
        )}
        {listing.category && (
          <Badge variant="secondary" className="absolute right-2 top-2">
            {listing.category.name}
          </Badge>
        )}
      </Link>
      <CardContent className="flex flex-1 flex-col p-4">
        <Link href={detailHref}>
          <h3 className="line-clamp-1 font-semibold hover:text-primary">
            {listing.title}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {listing.description}
        </p>

        {listing.region && (
          <p className="mt-1 text-xs text-muted-foreground">Регион: {listing.region}</p>
        )}

        {listing.price && (
          <p className="mt-2 text-lg font-bold text-primary">
            {listing.price.toLocaleString("ru-RU")} ₽
          </p>
        )}

        <p className="mt-1 text-xs text-muted-foreground">
          Размещено{" "}
          {new Date(listing.createdAt).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {listing.user && (
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <Link href={profileHref(listing.user.id)} className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {listing.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                {listing.user.companyName && (
                  <p className="truncate text-xs font-medium">{listing.user.companyName}</p>
                )}
                <p className={listing.user.companyName ? "truncate text-xs text-muted-foreground" : "truncate text-xs font-medium"}>
                  {listing.user.name}
                </p>
                <p className="text-xs text-muted-foreground">{ROLE_LABELS[listing.user.role] || listing.user.role}</p>
              </div>
            </Link>
            {isAuthenticated && (
              <Link href={`/chat?to=${listing.user.id}&context=listing&contextId=${listing.id}`}>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
