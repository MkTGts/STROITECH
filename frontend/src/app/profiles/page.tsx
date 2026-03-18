"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { useDebounce } from "@/lib/hooks";
import { api } from "@/lib/api";
import { RUSSIAN_REGIONS } from "@/constants/regions";

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
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [region, setRegion] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (activeTab !== "all") params.role = activeTab;
      if (debouncedSearch) params.search = debouncedSearch;
      if (region !== "all") params.region = region;

      const res = await api<any>("/users", { params });
      setUsers(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page, region]);

  useEffect(() => {
    if (isAuthenticated) fetchUsers();
  }, [isAuthenticated, fetchUsers]);

  if (!isAuthenticated) return null;

  const isModerator = user?.role === "moderator";
  const visibleUsers = isModerator
    ? users
    : users.filter((u) => u.role !== "moderator" && u.role !== "client");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Профили участников</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Боковая панель: категории и место для будущих критериев отбора */}
        <aside className="w-full shrink-0 lg:w-52" aria-label="Критерии отбора">
          <nav className="rounded-lg border bg-card p-3" aria-label="Категории">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Категория
            </h2>
            <ul className="space-y-0.5">
              {TABS.map((tab) => (
                <li key={tab.value}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab(tab.value); setPage(1); }}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                      activeTab === tab.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Регион
              </h2>
              <Select
                value={region}
                onValueChange={(v) => {
                  setRegion(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Все регионы" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
                  <SelectItem value="all">Все регионы</SelectItem>
                  {RUSSIAN_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или компании..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="rounded-xl border bg-card p-16 text-center text-muted-foreground">
          Участники не найдены
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUsers.map((user) => (
              <Card key={user.id} className="flex h-full flex-col transition-shadow hover:shadow-lg">
                <CardContent className="flex flex-1 flex-col p-5">
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
                  <div className="mt-4 mt-auto flex gap-2">
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
        </main>
      </div>
    </div>
  );
}
