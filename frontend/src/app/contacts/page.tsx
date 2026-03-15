import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = "info@объекты.online";

export default function ContactsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Mail className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">Контакты</h1>
            <p className="mt-1 text-muted-foreground">
              Свяжитесь с нами по любым вопросам
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-8 text-muted-foreground">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Электронная почта</h2>
            <p className="leading-relaxed">
              По вопросам работы сервиса, сотрудничества, технической поддержки и персональных данных
              вы можете написать нам на почту:
            </p>
            <p className="mt-4">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              Мы постараемся ответить в течение рабочих дней.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-foreground">Другие разделы</h2>
            <p className="leading-relaxed">
              Ответы на частые вопросы — в разделе{" "}
              <Link href="/faq" className="font-medium text-primary hover:underline">
                Частые вопросы
              </Link>
              . Информация о сервисе — в разделе{" "}
              <Link href="/about" className="font-medium text-primary hover:underline">
                О нас
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Button className="gap-2">
              <Mail className="h-4 w-4" />
              Написать на почту
            </Button>
          </a>
          <Link href="/about">
            <Button variant="outline" className="gap-2">
              О нас
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
