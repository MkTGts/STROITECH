"use client";

import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "@/lib/hooks";
import Link from "next/link";
import { Plus, Search, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { CommunityListItem } from "shared";
import { toast } from "sonner";

export default function CommunitiesListPage() {
  const { isAuthenticated } = useAuthStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [items, setItems] = useState<CommunityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{
        success: boolean;
        data: { items: CommunityListItem[]; totalPages: number };
      }>("/communities", { params: { page, limit: 20, search: debouncedSearch.trim() || undefined } });
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось загрузить сообщества");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Сообщества</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Открытые группы по регионам и интересам. Вступайте и публикуйте в общей ленте.
          </p>
        </div>
        {isAuthenticated && (
          <Button asChild className="gap-2">
            <Link href="/communities/new">
              <Plus className="h-4 w-4" />
              Создать
            </Link>
          </Button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Поиск по названию или описанию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center text-muted-foreground">
            <UsersRound className="h-12 w-12 opacity-40" />
            <p>Ничего не найдено. Создайте первое сообщество — кнопка выше.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((c) => (
              <li key={c.id}>
                <Link href={`/communities/${c.id}`}>
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <h2 className="font-semibold hover:text-primary">{c.title}</h2>
                        {c.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                        ) : null}
                        {c.region ? (
                          <p className="mt-1 text-xs text-muted-foreground">Регион: {c.region}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{c.memberCount} участников</p>
                        <p>{c.postCount} записей в ленте</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Назад
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
