"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, MessageCircle, Building2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  realty: "Недвижимость",
  project: "Проект",
  foundation: "Фундамент",
  walls: "Стены",
  roof: "Кровля",
  engineering: "Инженерные сети",
  finish: "Отделка",
  furniture: "Мебель",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Черновик", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
  active: { label: "Активный", color: "bg-green-100 text-green-700", icon: Clock },
  completed: { label: "Завершён", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  archived: { label: "Архив", color: "bg-gray-100 text-gray-700", icon: AlertCircle },
};

const STATUS_TABS = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновики" },
  { value: "active", label: "Активные" },
  { value: "completed", label: "Завершённые" },
  { value: "archived", label: "Архив" },
];

export default function ObjectsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (activeTab !== "all") params.status = activeTab;
      const res = await api<any>("/objects", { params });
      setObjects(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, activeTab]);

  useEffect(() => {
    if (isAuthenticated) fetchObjects();
  }, [isAuthenticated, fetchObjects]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Объекты строительства</h1>
          <p className="mt-1 text-muted-foreground">
            От участка до мебели. Добавляйте свой объект поэтапно.
          </p>
        </div>
        <Link href="/objects/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Создать объект
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-52" aria-label="Фильтр по статусу">
          <nav className="rounded-lg border bg-card p-3" aria-label="Статус">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Статус
            </h2>
            <ul className="space-y-0.5">
              {STATUS_TABS.map((tab) => (
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
            {activeTab === "draft" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Показаны только ваши черновики
              </p>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : objects.length === 0 ? (
        <div className="rounded-xl border bg-card p-16 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-3 text-lg text-muted-foreground">
            {activeTab === "all" ? "Пока нет объектов" : "Объекты не найдены"}
          </p>
          {activeTab !== "all" && (
            <p className="mt-1 text-sm text-muted-foreground">Попробуйте изменить фильтр</p>
          )}
          {activeTab === "all" && (
            <Link href="/objects/create">
              <Button className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Создать первый объект
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {objects.map((obj) => {
              const status = STATUS_CONFIG[obj.status] || STATUS_CONFIG.active;
              return (
                <Card key={obj.id} className="transition-shadow hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/objects/${obj.id}`}>
                          <h3 className="font-semibold hover:text-primary">{obj.title}</h3>
                        </Link>
                        <Badge className={`mt-1 ${status.color}`}>{status.label}</Badge>
                      </div>
                      <Badge variant="outline">{STAGE_LABELS[obj.currentStage] || obj.currentStage}</Badge>
                    </div>

                    {obj.region && (
                      <p className="mt-1 text-xs text-muted-foreground">Регион: {obj.region}</p>
                    )}

                    {obj.description && (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{obj.description}</p>
                    )}

                    {obj.stages && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {obj.stages.map((stage: any) => (
                          <span
                            key={stage.id}
                            className={cn(
                              "rounded px-2 py-0.5 text-xs",
                              stage.status === "completed" ? "bg-green-100 text-green-700" :
                              stage.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-500"
                            )}
                          >
                            {STAGE_LABELS[stage.stageType]}
                          </span>
                        ))}
                      </div>
                    )}

                    {obj.user && (
                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {obj.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            {obj.user.companyName && (
                              <p className="truncate text-sm font-medium">{obj.user.companyName}</p>
                            )}
                            <p className={`truncate text-sm ${obj.user.companyName ? "text-muted-foreground" : "font-medium"}`}>
                              {obj.user.name}
                            </p>
                          </div>
                        </div>
                        <Link href={`/chat?to=${obj.user.id}&context=object&contextId=${obj.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
