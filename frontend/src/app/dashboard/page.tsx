"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  LayoutGrid,
  Building2,
  MessageCircle,
  Settings,
  Crown,
  Plus,
  Phone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RUSSIAN_REGIONS } from "@/constants/regions";

const ROLE_LABELS: Record<string, string> = {
  supplier: "Поставщик",
  builder: "Строитель",
  equipment: "Техника",
  client: "Заказчик",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
  const [editMode, setEditMode] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", region: "", companyName: "", description: "" });
  const [managerForm, setManagerForm] = useState({ name: "", phone: "", position: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        region: user.region || "",
        companyName: user.companyName || "",
        description: user.description || "",
      });
    }
  }, [user, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api<any>("/subscriptions/current").then((res) => setSubscription(res.data)).catch(() => {});
    api<any>(`/auth/me`).then((res) => setManagers(res.data.managers || [])).catch(() => {});
  }, [isAuthenticated]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await api("/users/profile", { method: "PUT", body: JSON.stringify(form) });
      await fetchUser();
      setEditMode(false);
      toast.success("Профиль обновлён");
    } catch (err: any) {
      toast.error(err.message || "Ошибка сохранения");
    }
    setSaving(false);
  }

  async function handleAddManager() {
    if (!managerForm.name || !managerForm.phone) return;
    try {
      const res = await api<any>("/users/managers", { method: "POST", body: JSON.stringify(managerForm) });
      setManagers((prev) => [...prev, res.data]);
      setManagerForm({ name: "", phone: "", position: "" });
      toast.success("Менеджер добавлен");
    } catch (err: any) {
      toast.error(err.message || "Ошибка");
    }
  }

  async function handleDeleteManager(managerId: string) {
    try {
      await api(`/users/managers/${managerId}`, { method: "DELETE" });
      setManagers((prev) => prev.filter((m) => m.id !== managerId));
      toast.success("Менеджер удалён");
    } catch { /* ignore */ }
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Личный кабинет</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Профиль</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
                {editMode ? "Отмена" : "Редактировать"}
              </Button>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <Label>Имя / Название</Label>
                    <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Телефон</Label>
                    <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Регион</Label>
                    <Select
                      value={form.region}
                      onValueChange={(value) => setForm((p) => ({ ...p, region: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Выберите регион России" />
                      </SelectTrigger>
                      <SelectContent>
                        {RUSSIAN_REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Компания</Label>
                    <Input value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Сохранение..." : "Сохранить"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-xl text-primary">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{user.companyName || user.name}</h3>
                    <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                    {user.region && (
                      <p className="mt-1 text-xs text-muted-foreground">Регион: {user.region}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{user.description}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email} · {user.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Менеджеры</CardTitle>
            </CardHeader>
            <CardContent>
              {managers.length > 0 && (
                <div className="mb-4 space-y-2">
                  {managers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-sm text-muted-foreground">{m.position} · {m.phone}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteManager(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Имя" value={managerForm.name} onChange={(e) => setManagerForm((p) => ({ ...p, name: e.target.value }))} />
                <Input placeholder="Телефон" value={managerForm.phone} onChange={(e) => setManagerForm((p) => ({ ...p, phone: e.target.value }))} />
                <Input placeholder="Должность" value={managerForm.position} onChange={(e) => setManagerForm((p) => ({ ...p, position: e.target.value }))} />
              </div>
              <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={handleAddManager} disabled={!managerForm.name || !managerForm.phone}>
                <Plus className="h-4 w-4" /> Добавить менеджера
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Подписка</h3>
              </div>
              <p className="mt-2 text-sm capitalize text-muted-foreground">
                {subscription ? `${subscription.plan} — ${subscription.status === "active" ? "Активна" : "Истекла"}` : "Загрузка..."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <Link href="/listings/create">
                <Button variant="outline" className="w-full justify-start gap-2"><LayoutGrid className="h-4 w-4" /> Мои объявления</Button>
              </Link>
              <Link href="/objects">
                <Button variant="outline" className="w-full justify-start gap-2"><Building2 className="h-4 w-4" /> Мои объекты</Button>
              </Link>
              <Link href="/chat">
                <Button variant="outline" className="w-full justify-start gap-2"><MessageCircle className="h-4 w-4" /> Сообщения</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
