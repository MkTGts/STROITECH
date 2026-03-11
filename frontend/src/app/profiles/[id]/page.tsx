"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Phone, Mail, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ListingCard } from "@/components/features/listing-card";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

export default function ProfileDetailPage() {
  const { id } = useParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any>(`/users/${id}`)
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Профиль не найден</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/profiles">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К участникам
        </Button>
      </Link>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <Avatar className="h-24 w-24 shrink-0">
              <AvatarFallback className="bg-primary/10 text-3xl text-primary">
                {profile.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.companyName || profile.name}</h1>
                <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
                {profile.isVerified && <Badge className="bg-green-500 text-white">Проверен</Badge>}
              </div>
              {profile.companyName && (
                <p className="mt-1 text-muted-foreground">{profile.name}</p>
              )}
              {profile.description && (
                <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{profile.description}</p>
              )}

              {isAuthenticated && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/chat?to=${profile.id}&context=profile`}>
                    <Button className="gap-2">
                      <MessageCircle className="h-4 w-4" /> Написать
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {isAuthenticated && profile.managers?.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="mb-3 font-semibold">Менеджеры</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.managers.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        {m.position && <p className="text-sm text-muted-foreground">{m.position}</p>}
                        <p className="mt-1 flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" /> {m.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {profile.listings?.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Объявления</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.listings.map((listing: any) => (
              <ListingCard key={listing.id} listing={{ ...listing, user: profile }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
