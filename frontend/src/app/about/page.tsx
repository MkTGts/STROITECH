import Link from "next/link";
import { Building2, Target, Users, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">О нас</h1>
            <p className="mt-1 text-muted-foreground">Объекты.online — строительная площадка нового поколения</p>
          </div>
        </div>

        <div className="mt-10 space-y-8 text-muted-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Наша миссия</h2>
            <p className="leading-relaxed">
              Мы создали Объекты.online, чтобы объединить всех участников строительного рынка в одном месте:
              заказчиков, строителей, поставщиков материалов и владельцев техники. Наша цель — сделать поиск
              исполнителей и материалов простым, прозрачным и быстрым, чтобы вы могли сосредоточиться на самом
              главном — на строительстве.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Что мы предлагаем</h2>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Доска объявлений</strong> — размещайте и находите заказы
                  на строительные работы, материалы и технику по категориям и регионам.
                </span>
              </li>
              <li className="flex gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Профили участников</strong> — знакомьтесь с компаниями и
                  специалистами, смотрите контакты и описание услуг перед тем, как связаться.
                </span>
              </li>
              <li className="flex gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">Управление объектами</strong> — ведите строительство
                  поэтапно: от фундамента до отделки и мебели, привлекайте подрядчиков под каждый этап и
                  общайтесь в едином чате.
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Для кого мы работаем</h2>
            <p className="leading-relaxed">
              Сервис полезен и частным заказчикам, которые строят дом или делают ремонт, и строительным
              компаниям, ищущим подрядчиков и материалы, и поставщикам с техникой — всем, кто хочет находить
              заказы и партнёров без лишних посредников. Мы верим, что современные инструменты должны быть
              доступны каждому участнику рынка.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Наши ценности</h2>
            <p className="leading-relaxed">
              Прозрачность сделок, уважение к времени пользователей и качеству коммуникации — то, на чём мы
              строим продукт. Мы не просто даём площадку для объявлений: мы помогаем выстраивать долгосрочные
              связи между людьми и компаниями в строительной отрасли.
            </p>
            <p className="mt-3 flex items-center gap-2 text-primary">
              <Heart className="h-5 w-5" />
              <span className="font-medium">Спасибо, что вы с нами.</span>
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/listings">
            <Button className="gap-2">
              Смотреть объявления
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/objects">
            <Button variant="outline" className="gap-2">
              Объекты строительства
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
