"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) {
      api<any>("/subscriptions/current").then((res) => setCurrentSubscription(res.data));
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <Crown className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">Подписка</h1>
        <p className="mt-2 text-muted-foreground">
          Управление тарифами временно отключено. Всем пользователям выдан тариф «Премиум».
        </p>
      </div>

      <Card className="mx-auto max-w-xl">
        <CardHeader className="text-center">
          <CardTitle>Текущий тариф</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-3xl font-bold text-amber-600">Премиум</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentSubscription
              ? `Статус: ${currentSubscription.status === "active" ? "активна" : "не активна"}`
              : "Загрузка статуса..."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
