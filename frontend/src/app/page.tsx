"use client";

import Link from "next/link";
import {
  HardHat,
  Package,
  Truck,
  Users,
  ArrowRight,
  Search,
  MessageCircle,
  Building2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListingsFeed } from "@/components/features/listings-feed";
import { HomeFeedPreview } from "@/components/features/home-feed-preview";
import { useAuthStore } from "@/lib/store";

const CATEGORIES = [
  { icon: HardHat, title: "Ищите строителей", description: "Бригады, отделочники, электрики, сантехники", href: "/listings?categoryType=builders", color: "bg-blue-50 text-blue-600" },
  { icon: Package, title: "Ищите материалы", description: "Кирпич, бетон, пиломатериалы, кровля", href: "/listings?categoryType=materials", color: "bg-amber-50 text-amber-600" },
  { icon: Truck, title: "Ищите технику", description: "Экскаваторы, краны, самосвалы, инструмент", href: "/listings?categoryType=equipment", color: "bg-green-50 text-green-600" },
  { icon: Users, title: "Заводите знакомства", description: "Полезные контакты в строительной отрасли", href: "/profiles", color: "bg-purple-50 text-purple-600" },
];

const FEATURES = [
  { icon: Search, title: "Умный поиск", description: "Находите нужных специалистов и материалы за секунды" },
  { icon: MessageCircle, title: "Встроенный чат", description: "Общайтесь напрямую с поставщиками и строителями" },
  { icon: Building2, title: "Управление объектами", description: "Ведите строительство поэтапно — от участка до мебели" },
  { icon: Shield, title: "Надёжные исполнители", description: "Проверенные профили с отзывами и портфолио" },
];

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div>
      <section className="bg-gradient-to-br from-primary to-[#1F3E7C] py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">
              Строительная площадка{" "}
              <span className="text-[#6A8CFF]">нового поколения</span>
            </h1>
            <p className="mt-4 text-lg text-blue-100 md:text-xl">
              Доска объявлений с умным чатом и встроенным сервисом по управлению объектами.
              Находите строителей, поставщиков и технику по лучшим ценам.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {isAuthenticated ? (
                <>
                  <Link href="/listings/create">
                    <Button size="lg" variant="secondary" className="gap-2 text-base">
                      Разместить объявление
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/objects/create">
                    <Button size="lg" variant="secondary" className="gap-2 text-base">
                      Создать объект
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/register">
                    <Button size="lg" variant="secondary" className="gap-2 text-base">
                      Начать бесплатно
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/listings">
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 border-white/30 bg-white/10 text-base text-white hover:bg-white/20"
                    >
                      Смотреть объявления
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.title} href={cat.href}>
                <Card className="group h-full transition-shadow hover:shadow-lg">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className={`rounded-xl p-3 ${cat.color} mb-4 transition-transform group-hover:scale-110`}>
                      <cat.icon className="h-8 w-8" />
                    </div>
                    <h3 className="font-semibold">{cat.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-card py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold md:text-3xl">Почему Объекты.online?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat) => (
              <div key={feat.title} className="flex flex-col items-center text-center">
                <div className="mb-3 rounded-full bg-primary/10 p-3">
                  <feat.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{feat.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold md:text-3xl">Свежие объявления</h2>
            <Link href="/listings">
              <Button variant="ghost" className="gap-2">
                Все объявления <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ListingsFeed />
        </div>
      </section>

      <section className="border-t bg-muted/30 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">В ленте</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
                Статьи и разборы от участников площадки — практика, опыт, идеи для ваших объектов.
              </p>
            </div>
            <Link href="/lenta" className="shrink-0 sm:self-center">
              <Button variant="ghost" className="gap-2">
                Открыть ленту <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <HomeFeedPreview />
        </div>
      </section>

      <section className="bg-primary py-12 text-white md:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          {isAuthenticated ? (
            <>
              <h2 className="text-2xl font-bold md:text-3xl">Готовы сделать следующий шаг?</h2>
              <p className="mt-3 text-blue-100">
                Создайте новое объявление или объект, чтобы привлечь подрядчиков и поставщиков под ваши задачи.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/listings/create">
                  <Button size="lg" variant="secondary" className="gap-2 text-base">
                    Разместить объявление
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/objects/create">
                  <Button size="lg" variant="secondary" className="gap-2 text-base">
                    Создать объект
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold md:text-3xl">Готовы начать строительство?</h2>
              <p className="mt-3 text-blue-100">
                Зарегистрируйтесь и получите доступ к тысячам строителей, поставщиков и объявлений.
                Первое объявление — бесплатно!
              </p>
              <Link href="/auth/register">
                <Button size="lg" variant="secondary" className="mt-6 gap-2 text-base">
                  Зарегистрироваться бесплатно
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
