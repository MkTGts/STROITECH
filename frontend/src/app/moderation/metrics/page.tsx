"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError, downloadModerationMetricsCsv } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { ModerationMetrics } from "shared";
import { toast } from "sonner";

function toIsoStartOfDay(localDate: string): string | undefined {
  if (!localDate) return undefined;
  const d = new Date(`${localDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toIsoEndOfDay(localDate: string): string | undefined {
  if (!localDate) return undefined;
  const d = new Date(`${localDate}T23:59:59.999`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export default function ModerationMetricsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [data, setData] = useState<ModerationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const defaultTo = new Date();
  const defaultFrom = new Date(defaultTo.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [fromDate, setFromDate] = useState(toYmd(defaultFrom));
  const [toDate, setToDate] = useState(toYmd(defaultTo));

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, user?.role, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "moderator") return;
    const fromIso = toIsoStartOfDay(fromDate);
    const toIso = toIsoEndOfDay(toDate);
    setLoading(true);
    try {
      const res = await api<{ success: boolean; data: ModerationMetrics }>("/moderation/metrics", {
        params: {
          from: fromIso,
          to: toIso,
          format: "json",
        },
      });
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось загрузить метрики");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadModerationMetricsCsv(toIsoStartOfDay(fromDate), toIsoEndOfDay(toDate));
      toast.success("Файл загружен");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Метрики</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        За выбранный период: новые пользователи, публикации в ленте (по дате выхода), новые подписки на профили (follow),
        активность авторов постов и комментариев.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <Label htmlFor="m-from">С даты</Label>
          <Input id="m-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 w-auto" />
        </div>
        <div>
          <Label htmlFor="m-to">По дату</Label>
          <Input id="m-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 w-auto" />
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Обновить"}
        </Button>
        <Button className="gap-2" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          CSV
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <MetricCard title="Новые пользователи" value={data.newUsers} hint="Регистрации за период" />
          <MetricCard title="Публикации в ленте" value={data.newFeedPosts} hint="Посты по publishedAt" />
          <MetricCard title="Новые подписки на профили" value={data.newFollows} hint="UserFollow, не тариф" />
          <MetricCard title="Авторы постов (уникальные)" value={data.distinctPostAuthors} />
          <MetricCard title="Авторы комментариев (уникальные)" value={data.distinctCommentAuthors} />
          <MetricCard
            title="Активные пользователи (объединение)"
            value={data.distinctActiveUsers}
            hint="Хотя бы пост или комментарий за период"
          />
        </div>
      ) : null}

      {data ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Период API: {new Date(data.period.from).toLocaleString("ru-RU")} — {new Date(data.period.to).toLocaleString("ru-RU")}
        </p>
      ) : null}
    </div>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
