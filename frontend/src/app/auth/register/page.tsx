"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, HardHat, Package, Truck, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { toast } from "sonner";
import { RUSSIAN_REGIONS } from "@/constants/regions";

const ROLES = [
  { value: "supplier", label: "Поставщик", icon: Package, description: "Продаю стройматериалы" },
  { value: "builder", label: "Строитель", icon: HardHat, description: "Выполняю строительные работы" },
  { value: "equipment", label: "Техника", icon: Truck, description: "Предоставляю технику и оборудование" },
  { value: "client", label: "Заказчик", icon: User, description: "Ищу подрядчиков и материалы" },
];

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    phone: "",
    password: "",
    role: "",
    name: "",
    region: "",
    companyName: "",
    description: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Регистрация прошла успешно!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Building2 className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="mt-2 text-2xl">Регистрация</CardTitle>
          <p className="text-sm text-muted-foreground">Шаг {step} из 2</p>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label>Выберите вашу роль</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => updateField("role", role.value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                        form.role === role.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <role.icon className={`h-8 w-8 ${form.role === role.value ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{role.label}</span>
                      <span className="text-xs text-muted-foreground">{role.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!form.role}
              >
                Далее
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Имя / Название</Label>
                  <Input
                    id="name"
                    placeholder="Иван Иванов"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Компания (опционально)</Label>
                  <Input
                    id="companyName"
                    placeholder="ООО Строй"
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Регион</Label>
                <div className="mt-1">
                  <Select value={form.region} onValueChange={(value) => updateField("region", value)}>
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
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.ru"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (900) 123-45-67"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Минимум 6 символов"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Описание деятельности</Label>
                <Textarea
                  id="description"
                  placeholder="Расскажите о себе и своей деятельности"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  required
                  minLength={10}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Назад
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !form.region}>
                  {loading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </div>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
