"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  MessageCircle,
  Bell,
  Menu,
  LogIn,
  LayoutGrid,
  Users,
  HardHat,
  Newspaper,
  Sparkles,
  ShieldCheck,
  UsersRound,
  CalendarDays,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/site-logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store";
import { useNotificationStore } from "@/lib/store";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavLinkItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY_NAV: NavLinkItem[] = [
  { href: "/", label: "Главная", icon: HardHat },
  { href: "/listings", label: "Объявления", icon: LayoutGrid },
];

const SOCIAL_NAV: NavLinkItem[] = [
  { href: "/lenta", label: "Лента", icon: Newspaper },
  { href: "/lenta/dlia-menya", label: "Моя лента", icon: Sparkles },
  { href: "/communities", label: "Сообщества", icon: UsersRound },
  { href: "/events", label: "События", icon: CalendarDays },
  { href: "/profiles", label: "Участники", icon: Users },
];

const WORK_NAV: NavLinkItem[] = [
  { href: "/objects", label: "Управление объектами", icon: Building2 },
  { href: "/chat", label: "Чат", icon: MessageCircle },
];

function navItemActive(pathname: string, href: string): boolean {
  if (href === "/lenta/dlia-menya") return pathname === "/lenta/dlia-menya";
  if (href === "/lenta") {
    return pathname === "/lenta" || (pathname.startsWith("/lenta/") && pathname !== "/lenta/dlia-menya");
  }
  if (href === "/profiles") {
    return pathname === "/profiles" || pathname.startsWith("/profiles/");
  }
  if (href === "/communities") {
    return pathname === "/communities" || pathname.startsWith("/communities/");
  }
  if (href === "/events") {
    return pathname === "/events" || pathname.startsWith("/events/");
  }
  if (href === "/objects") {
    return pathname === "/objects" || pathname.startsWith("/objects/");
  }
  return pathname === href;
}

function socialMenuActive(pathname: string, isAuthenticated: boolean): boolean {
  return SOCIAL_NAV.some((item) => {
    if (item.href === "/lenta/dlia-menya" && !isAuthenticated) return false;
    return navItemActive(pathname, item.href);
  });
}

function resolveHref(item: NavLinkItem, isAuthenticated: boolean): string {
  if (item.href === "/chat" && !isAuthenticated) return "/auth/login";
  return item.href;
}

function socialItemsForUser(isAuthenticated: boolean): NavLinkItem[] {
  return SOCIAL_NAV.filter((item) => item.href !== "/lenta/dlia-menya" || isAuthenticated);
}

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [mobileOpen, setMobileOpen] = useState(false);

  const socialOpen = socialMenuActive(pathname, isAuthenticated);
  const socialList = socialItemsForUser(isAuthenticated);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <SiteLogo className="h-8 max-h-8 shrink-0" priority />
          <span className="hidden text-lg font-bold text-primary sm:inline">Объекты.online</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = navItemActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1.5 px-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Button>
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={socialOpen ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5 px-2.5 data-[state=open]:bg-accent"
              >
                <Newspaper className="h-4 w-4 shrink-0" />
                Сообщество
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                Лента, события и люди
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {socialList.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={resolveHref(item, isAuthenticated)}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {WORK_NAV.map((item) => {
            const href = resolveHref(item, isAuthenticated);
            const active = navItemActive(pathname, item.href);
            return (
              <Link key={item.href} href={href}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1.5 px-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Планшет: компактная полоса без переполнения */}
        <nav className="hidden items-center gap-0.5 md:flex lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Menu className="h-4 w-4" />
                Меню
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {[...PRIMARY_NAV, ...socialList, ...WORK_NAV].map((item) => {
                const href = resolveHref(item, isAuthenticated);
                const active = navItemActive(pathname, item.href);
                return (
                  <DropdownMenuItem key={`${item.href}-${item.label}`} asChild>
                    <Link
                      href={href}
                      className={cn("flex cursor-pointer items-center gap-2", active && "bg-accent")}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              {user?.role === "moderator" && (
                <Link href="/moderation">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    Модерация
                  </Button>
                </Link>
              )}
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative shrink-0">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center p-0 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="max-w-[min(12rem,28vw)] gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    {user?.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.name || ""} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">
                      {(user?.name || "П").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.name || "Профиль"}</span>
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="shrink-0" onClick={logout}>
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Войти</span>
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="hidden sm:inline-flex">
                  Регистрация
                </Button>
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
            <nav className="mt-8 flex flex-col gap-1">
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">Основное</p>
              {PRIMARY_NAV.map((item) => {
                const mobileActive = navItemActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant={mobileActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              <p className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">Лента, события и люди</p>
              {socialList.map((item) => {
                const href = resolveHref(item, isAuthenticated);
                const mobileActive = navItemActive(pathname, item.href);
                return (
                  <Link key={item.href} href={href} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant={mobileActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}

              <p className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">Работа</p>
              {WORK_NAV.map((item) => {
                const href = resolveHref(item, isAuthenticated);
                const mobileActive = navItemActive(pathname, item.href);
                return (
                  <Link key={item.href} href={href} onClick={() => setMobileOpen(false)}>
                    <Button
                      variant={mobileActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label === "Объекты" ? "Управление объектами" : item.label}
                    </Button>
                  </Link>
                );
              })}

              <div className="my-4 border-t" />
              {isAuthenticated ? (
                <>
                  {user?.role === "moderator" && (
                    <Link href="/moderation" onClick={() => setMobileOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3">
                        <ShieldCheck className="h-5 w-5" />
                        Модерация
                      </Button>
                    </Link>
                  )}
                  <Link href="/notifications" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Bell className="h-5 w-5" />
                      Уведомления
                      {unreadCount > 0 ? (
                        <Badge className="ml-auto">{unreadCount}</Badge>
                      ) : null}
                    </Button>
                  </Link>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Avatar className="h-8 w-8">
                        {user?.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name || ""} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-sm text-primary">
                          {(user?.name || "П").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
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
