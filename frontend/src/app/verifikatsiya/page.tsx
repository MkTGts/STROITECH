import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteLogo } from "@/components/branding/site-logo";
import { ShieldCheck } from "lucide-react";

export default function VerificationInfoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Отметка «Проверен»</h1>
          <p className="text-sm text-muted-foreground">
            Как получить и что она означает на Объекты.online
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Что это</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Отметка «Проверен» показывается у профилей компаний и специалистов, чьи данные и присутствие на
            площадке были проверены модератором. Это сигнал доверия для других участников рынка, а не
            юридическая гарантия или страхование сделок.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Типовые критерии</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Решение принимается вручную; ниже — ориентиры, по которым обычно оценивают заявки:</p>
          <ul className="list-inside list-disc space-y-2 pl-1">
            <li>согласованное имя и название компании (при наличии) с контактами и описанием профиля;</li>
            <li>реалистичное описание деятельности и региона работы;</li>
            <li>при необходимости — подтверждающие документы или реквизиты по запросу модерации;</li>
            <li>отсутствие признаков мошенничества или злоупотребления сервисом.</li>
          </ul>
          <p>
            Состав документов и сроки ответа зависят от ситуации. Точные инструкции по подаче заявки могут
            быть указаны в интерфейсе или в рассылке от поддержки.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Снятие отметки</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Модератор может снять верификацию, если выяснится недостоверность данных, нарушение правил
            платформы или иные весомые причины. Пользователь сохраняет доступ к аккаунту, если он не
            заблокирован отдельно по правилам сервиса.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="default">
          <Link href="/profiles">К участникам</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/chat?context=profile">Написать в поддержку</Link>
        </Button>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <SiteLogo className="h-6 max-h-6" />
          На главную
        </Link>
      </div>
    </div>
  );
}
