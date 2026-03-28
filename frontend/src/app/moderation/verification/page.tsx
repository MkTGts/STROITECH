"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/store";
import { fetchVerificationCandidates, patchUserVerification, ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import { VerifiedBadge } from "@/components/features/verified-badge";
import type { VerificationCandidateItem } from "shared";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

export default function ModerationVerificationPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [unverifiedOnly, setUnverifiedOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VerificationCandidateItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [actionUser, setActionUser] = useState<VerificationCandidateItem | null>(null);
  const [actionGrant, setActionGrant] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, user?.role, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "moderator") return;
    setLoading(true);
    try {
      const data = await fetchVerificationCandidates({
        search: debouncedSearch.trim() || undefined,
        page,
        limit: 20,
        unverifiedOnly,
      });
      setItems(data.items);
      setTotalPages(Math.max(1, data.totalPages));
    } catch (e: unknown) {
      toast.error(e instanceof ApiError ? e.message : "Не удалось загрузить список");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, debouncedSearch, page, unverifiedOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitVerification(): Promise<void> {
    if (!actionUser) return;
    setSubmitting(true);
    try {
      await patchUserVerification(actionUser.id, {
        granted: actionGrant,
        note: note.trim() || undefined,
      });
      toast.success(actionGrant ? "Верификация выдана" : "Верификация снята");
      setActionUser(null);
      setNote("");
      await load();
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.replace("/auth/login");
        return;
      }
      const msg = e instanceof ApiError ? e.message : "Ошибка";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/moderation">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          К обзору модерации
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Верификация участников</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Выдача и снятие отметки «Проверен». Критерии описаны на{" "}
          <Link href="/verifikatsiya" className="text-primary underline-offset-4 hover:underline">
            странице для пользователей
          </Link>
          .
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Имя, компания или email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="unverified-only"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={unverifiedOnly}
            onChange={(e) => {
              setUnverifiedOnly(e.target.checked);
              setPage(1);
            }}
          />
          <Label htmlFor="unverified-only" className="cursor-pointer text-sm font-normal">
            Только без отметки «Проверен»
          </Label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Нет участников по заданным условиям
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((row) => (
            <li key={row.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar className="h-11 w-11 shrink-0">
                    {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt={row.name} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary">{row.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      {row.isVerified ? <VerifiedBadge compact /> : null}
                      <span className="text-xs text-muted-foreground">{ROLE_LABELS[row.role] || row.role}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                    {row.companyName ? (
                      <p className="truncate text-xs text-muted-foreground">{row.companyName}</p>
                    ) : null}
                  </div>
                  <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={row.isVerified}
                      onClick={() => {
                        setActionGrant(true);
                        setNote("");
                        setActionUser(row);
                      }}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Выдать
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={!row.isVerified}
                      onClick={() => {
                        setActionGrant(false);
                        setNote("");
                        setActionUser(row);
                      }}
                    >
                      <ShieldOff className="h-4 w-4" />
                      Снять
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/profiles/${row.id}`}>Профиль</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Назад
          </Button>
          <span className="flex items-center px-2 text-sm text-muted-foreground">
            Стр. {page} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Далее
          </Button>
        </div>
      ) : null}

      <Dialog open={Boolean(actionUser)} onOpenChange={(open) => !open && setActionUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionGrant ? "Выдать верификацию" : "Снять верификацию"}</DialogTitle>
          </DialogHeader>
          {actionUser ? (
            <p className="text-sm text-muted-foreground">
              Участник: <span className="font-medium text-foreground">{actionUser.name}</span>
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="mod-note">Комментарий (необязательно, для внутреннего учёта)</Label>
            <Textarea
              id="mod-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={actionGrant ? "Например: проверены реквизиты по запросу" : "Причина снятия (в журнале операций)"}
              maxLength={500}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionUser(null)} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={() => void submitVerification()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : actionGrant ? "Выдать" : "Снять"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
