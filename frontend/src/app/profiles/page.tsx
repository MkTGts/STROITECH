"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { useDebounce } from "@/lib/hooks";
import { api } from "@/lib/api";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

const TABS = [
  { value: "all", label: "Все" },
  { value: "supplier", label: "Поставщики" },
  { value: "builder", label: "Строители" },
  { value: "equipment", label: "Техника" },
];

export default function ProfilesPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (activeTab !== "all") params.role = activeTab;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api<any>("/users", { params });
      setUsers(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Профили участников</h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или компании..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="mb-6">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border bg-card p-16 text-center text-muted-foreground">
          Участники не найдены
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.id} className="transition-shadow hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-lg text-primary">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Link href={`/profiles/${user.id}`}>
                        <h3 className="truncate font-semibold hover:text-primary">
                          {user.companyName || user.name}
                        </h3>
                      </Link>
                      <Badge variant="secondary" className="mt-1">
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      {user.region && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Регион: {user.region}
                        </p>
                      )}
                      {user.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {user.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/profiles/${user.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Профиль</Button>
                    </Link>
                    {isAuthenticated && (
                      <Link href={`/chat?to=${user.id}&context=profile`}>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <MessageCircle className="h-4 w-4" /> Написать
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Назад</Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">{page} из {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Вперёд</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
