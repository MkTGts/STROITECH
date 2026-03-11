"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Plan = {
  plan: string;
  name: string;
  price: number;
  features: string[];
};

export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated) {
      api<any>("/subscriptions/plans").then((res) => setPlans(res.data));
      api<any>("/subscriptions/current").then((res) => setCurrentSubscription(res.data));
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubscribe(plan: string) {
    setSubscribing(plan);
    try {
      await api("/subscriptions/subscribe", { method: "POST", body: JSON.stringify({ plan }) });
      toast.success("Подписка оформлена! (тестовый режим)");
      const res = await api<any>("/subscriptions/current");
      setCurrentSubscription(res.data);
    } catch (err: any) {
      toast.error(err.message || "Ошибка");
    }
    setSubscribing(null);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <Crown className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">Тарифные планы</h1>
        <p className="mt-2 text-muted-foreground">Выберите подходящий план для вашего бизнеса</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentSubscription?.plan === plan.plan && currentSubscription?.status === "active";
          const isPopular = plan.plan === "basic";
          return (
            <Card key={plan.plan} className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}>
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">Популярный</Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price === 0 ? "Бесплатно" : `${plan.price} ₽`}</span>
                  {plan.price > 0 && <span className="text-muted-foreground"> / мес</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                  disabled={isCurrent || subscribing === plan.plan || plan.plan === "free"}
                  onClick={() => handleSubscribe(plan.plan)}
                >
                  {isCurrent ? "Текущий план" : subscribing === plan.plan ? "Оформление..." : plan.price === 0 ? "Текущий план" : "Выбрать"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
