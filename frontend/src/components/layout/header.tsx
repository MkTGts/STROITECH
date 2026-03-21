"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  MessageCircle,
  User,
  Bell,
  Menu,
  Search,
  LogIn,
  LayoutGrid,
  Users,
  HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { useNotificationStore } from "@/lib/store";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Главная", icon: HardHat },
  { href: "/listings", label: "Объявления", icon: LayoutGrid },
  { href: "/profiles", label: "Участники", icon: Users },
  { href: "/objects", label: "Объекты", icon: Building2 },
  { href: "/chat", label: "Чат", icon: MessageCircle },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-primary">Объекты.online</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const href = item.href === "/chat" && !isAuthenticated ? "/auth/login" : item.href;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center p-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {user?.name?.split(" ")[0] || "Профиль"}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Войти
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Регистрация</Button>
              </Link>
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <nav className="mt-8 flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const href = item.href === "/chat" && !isAuthenticated ? "/auth/login" : item.href;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button
                      variant={pathname === item.href ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="my-4 border-t" />
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <User className="h-5 w-5" />
                      Личный кабинет
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => { logout(); setMobileOpen(false); }}>
                    Выйти
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <LogIn className="h-5 w-5" />
                      Войти
                    </Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Регистрация</Button>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
