"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Flag, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";

const CARDS = [
  {
    href: "/moderation/verification",
    title: "Верификация",
    description: "Кандидаты и выдача бейджа проверенного профиля.",
    icon: ShieldCheck,
  },
  {
    href: "/moderation/reports",
    title: "Жалобы",
    description: "Очередь жалоб на посты и комментарии в ленте.",
    icon: Flag,
  },
  {
    href: "/moderation/metrics",
    title: "Метрики",
    description: "Регистрации, публикации в ленте, подписки на профили за период.",
    icon: BarChart3,
  },
];

export default function ModerationHubPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, user?.role, router]);

  if (!isLoading && (!isAuthenticated || user?.role !== "moderator")) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">Модерация</h1>
      <p className="mt-1 text-sm text-muted-foreground">Инструменты для роли модератора площадки.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <Icon className="mb-2 h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Открыть →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
