"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Building2, MessageCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { useNotificationStore } from "@/lib/store";
import { api } from "@/lib/api";

const TYPE_ICONS: Record<string, typeof Bell> = {
  new_object: Building2,
  message: MessageCircle,
  tender: AlertCircle,
  system: Bell,
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const adjustUnread = useNotificationStore((s) => s.adjustUnread);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api<any>("/notifications", { params: { limit: 50 } })
      .then((res) => {
        setNotifications(res.data.items);
        setUnreadCount(res.data.unreadCount);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, setUnreadCount]);

  async function handleMarkAllRead() {
    await api("/notifications/read-all", { method: "PUT" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function handleMarkRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "PUT" });
    let marked = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.isRead) {
          marked = true;
          return { ...n, isRead: true };
        }
        return n;
      }),
    );
    if (marked) {
      adjustUnread(-1);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={loading || unreadCount === 0}
        >
          <Check className="mr-1 h-4 w-4" /> Прочитать все
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-muted-foreground">Нет уведомлений</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || Bell;
            return (
              <button
                key={notif.id}
                onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  notif.isRead ? "bg-card" : "bg-primary/5 border-primary/20"
                }`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${notif.isRead ? "text-muted-foreground" : "text-primary"}`} />
                <div className="flex-1">
                  <p className={`text-sm ${notif.isRead ? "text-muted-foreground" : "font-medium"}`}>
                    {notif.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(notif.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!notif.isRead && <div className="mt-1 h-2 w-2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
