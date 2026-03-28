"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { ContentReportQueueItem } from "shared";
import { toast } from "sonner";

function targetLink(r: ContentReportQueueItem): string {
  if (r.targetType === "feed_post") return `/lenta/${r.targetId}`;
  const pid = r.targetPreview.postId;
  return pid ? `/lenta/${pid}` : "/lenta";
}

export default function ModerationReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [tab, setTab] = useState<"pending" | "closed" | "all">("pending");
  const [items, setItems] = useState<ContentReportQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, user?.role, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "moderator") return;
    setLoading(true);
    try {
      const res = await api<{ success: boolean; data: { items: ContentReportQueueItem[] } }>("/moderation/reports", {
        params: { status: tab, limit: 50, page: 1 },
      });
      setItems(res.data.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось загрузить");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function closeReport(id: string) {
    setClosingId(id);
    try {
      await api(`/moderation/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" }),
      });
      toast.success("Жалоба закрыта");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setClosingId(null);
    }
  }

  if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Жалобы на контент</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Посты и комментарии ленты. Закрытие фиксирует просмотр; отдельные действия с контентом — через ленту.
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">Открытые</TabsTrigger>
          <TabsTrigger value="closed">Закрытые</TabsTrigger>
          <TabsTrigger value="all">Все</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Нет записей.</CardContent>
            </Card>
          ) : (
            items.map((r) => (
              <Card key={r.id}>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {r.targetType === "feed_post" ? "Пост" : "Комментарий"} ·{" "}
                        <span className="text-muted-foreground">{r.createdAt.slice(0, 16).replace("T", " ")}</span>
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        От: {r.reporter.name}{" "}
                        <Link href={`/profiles/${r.reporterId}`} className="text-primary hover:underline">
                          (профиль)
                        </Link>
                      </p>
                    </div>
                    <span
                      className={
                        r.status === "pending" ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs" : "text-xs text-muted-foreground"
                      }
                    >
                      {r.status === "pending" ? "Открыта" : "Закрыта"}
                    </span>
                  </div>
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-foreground">{r.targetPreview.label}</p>
                  {r.details ? (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Комментарий автора жалобы:</span> {r.details}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={targetLink(r)} target="_blank" rel="noreferrer">
                        Открыть в ленте
                      </Link>
                    </Button>
                    {r.status === "pending" && (
                      <Button
                        size="sm"
                        disabled={closingId === r.id}
                        onClick={() => void closeReport(r.id)}
                      >
                        {closingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Закрыть жалобу"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
