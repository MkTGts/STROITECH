import Link from "next/link";
import { SiteLogo } from "@/components/branding/site-logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <SiteLogo className="h-7 max-h-7" />
              <span className="text-lg font-bold text-primary">Объекты.online</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Онлайн-сервис для строительства. Находите строителей, поставщиков и технику по лучшим ценам.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Сервис</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/listings" className="hover:text-primary">Объявления</Link></li>
              <li><Link href="/profiles" className="hover:text-primary">Участники</Link></li>
              <li><Link href="/objects" className="hover:text-primary">Объекты</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Компания</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary">О нас</Link></li>
              <li><Link href="/contacts" className="hover:text-primary">Контакты</Link></li>
              <li><Link href="/verifikatsiya" className="hover:text-primary">Верификация участников</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Поддержка</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/faq" className="hover:text-primary">Частые вопросы</Link></li>
              <li><Link href="/privacy" className="hover:text-primary">Политика конфиденциальности</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Пользовательское соглашение</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Объекты.online. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
