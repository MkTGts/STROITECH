"use client";

import { useEffect, useState } from "react";
import { AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type UserRow = { id: string; name: string; companyName?: string | null };

/**
 * Вставка токена `[[mention:uuid]]` в текст (стена, комментарий к репосту).
 */
export function FeedMentionPicker({ onInsert }: { onInsert: (snippet: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void api<{ success: boolean; data: { items: UserRow[] } }>("/users", {
      params: { search: debounced, limit: "12" },
    })
      .then((res) => {
        if (!cancelled) setUsers(res.data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced]);

  function pick(u: UserRow) {
    onInsert(`[[mention:${u.id}]] `);
    setOpen(false);
    setQ("");
    setUsers([]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1">
          <AtSign className="h-3.5 w-3.5" />
          Упомянуть
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Упоминание участника</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Поиск по имени или компании. В посте отобразится как ссылка @имя.
        </p>
        <Input placeholder="Начните вводить имя…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-48 overflow-y-auto text-sm">
          {loading && <li className="py-2 text-muted-foreground">Поиск…</li>}
          {!loading && debounced.length >= 2 && users.length === 0 && (
            <li className="py-2 text-muted-foreground">Никого не нашли</li>
          )}
          {debounced.length > 0 && debounced.length < 2 && (
            <li className="py-2 text-muted-foreground">Введите не менее 2 символов</li>
          )}
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                onClick={() => pick(u)}
              >
                <span className="font-medium">{u.name}</span>
                {u.companyName ? (
                  <span className="ml-2 text-xs text-muted-foreground">{u.companyName}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
