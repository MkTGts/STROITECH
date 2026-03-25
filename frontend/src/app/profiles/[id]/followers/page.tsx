"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { FollowButton } from "@/components/features/follow-button";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
  moderator: "Модератор",
};

export default function ProfileFollowersPage() {
  const { id } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>("");

  const fetchList = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    setLoading(true);
    try {
      const res = await api<any>(`/users/${id}/followers`, { params: { page, limit: 20 } });
      setItems(res.data.items ?? []);
      setTotalPages(res.data.totalPages ?? 1);
    } catch {
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    api<any>(`/users/${id}`)
      .then((res) => setProfileName(res.data?.name ?? ""))
      .catch(() => setProfileName(""));
  }, [id]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  if (!id || typeof id !== "string") return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/profiles/${id}`}>
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> К профилю
        </Button>
      </Link>
      <h1 className="mb-6 text-2xl font-bold">
        Подписчики{profileName ? `: ${profileName}` : ""}
      </h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Пока нет подписчиков</CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((u) => (
              <li key={u.id}>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Link href={`/profiles/${u.id}`}>
                      <Avatar className="h-12 w-12">
                        {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {u.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profiles/${u.id}`} className="font-semibold hover:text-primary">
                        {u.name}
                      </Link>
                      <Badge variant="secondary" className="ml-2 align-middle">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                      {u.companyName && (
                        <p className="truncate text-sm text-muted-foreground">{u.companyName}</p>
                      )}
                    </div>
                    <FollowButton targetUserId={u.id} size="sm" />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {page} из {totalPages}
              </span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
