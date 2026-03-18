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
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuthStore } from "@/lib/store";
import { api, uploadAvatar } from "@/lib/api";
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
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

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

  async function handleChangePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Заполните все поля для смены пароля");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Новый пароль должен содержать не менее 8 символов");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Подтверждение пароля не совпадает");
      return;
    }
    setChangingPassword(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      toast.success("Пароль успешно изменён");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      const message = err?.message || "Не удалось изменить пароль";
      if (message.includes("Неверный текущий пароль")) {
        toast.error("Неверный текущий пароль");
      } else {
        toast.error(message);
      }
    }
    setChangingPassword(false);
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

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение");
      return;
    }
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadAvatar(file);
      await api("/users/profile", { method: "PUT", body: JSON.stringify({ avatarUrl: uploaded.url }) });
      await fetchUser();
      toast.success("Аватарка обновлена");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось обновить аватарку");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleDeleteAvatar() {
    if (!user?.avatarUrl) return;
    setUploadingAvatar(true);
    try {
      await api("/users/profile", { method: "PUT", body: JSON.stringify({ avatarUrl: null }) });
      await fetchUser();
      toast.success("Аватарка удалена");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось удалить аватарку");
    } finally {
      setUploadingAvatar(false);
    }
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
                    <Label>Аватар</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Avatar className="h-16 w-16">
                        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                        <AvatarFallback className="bg-primary/10 text-xl text-primary">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id="avatar-upload"
                          onChange={handleAvatarSelected}
                          disabled={uploadingAvatar}
                        />
                        <label htmlFor="avatar-upload">
                          <Button asChild variant="outline" size="sm" disabled={uploadingAvatar}>
                            <span>{uploadingAvatar ? "Загрузка..." : "Загрузить аватарку"}</span>
                          </Button>
                        </label>
                        {user.avatarUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleDeleteAvatar}
                            disabled={uploadingAvatar}
                            className="justify-start text-destructive"
                          >
                            Удалить аватарку
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Форматы: JPEG, PNG, WebP, GIF.
                        </p>
                      </div>
                    </div>
                  </div>
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
                      <SelectContent className="max-h-[min(16rem,50vh)]" position="popper">
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
                    {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
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
            <CardHeader>
              <CardTitle>Смена пароля</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Текущий пароль</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                    }
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPasswords.current ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Новый пароль</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                    }
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPasswords.new ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Повторите новый пароль</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                    }
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPasswords.confirm ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={
                  changingPassword ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmPassword
                }
                className="mt-1"
              >
                {changingPassword ? "Сохранение..." : "Изменить пароль"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Минимальная длина нового пароля — 8 символов. Не передавайте пароль третьим лицам.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <Link href={`/listings?userId=${user.id}`}>
                <Button variant="outline" className="w-full justify-start gap-2"><LayoutGrid className="h-4 w-4" /> Мои объявления</Button>
              </Link>
              <Link href={`/objects?userId=${user.id}`}>
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
