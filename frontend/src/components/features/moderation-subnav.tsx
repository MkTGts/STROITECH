"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Flag, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/moderation", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/moderation/verification", label: "Верификация", icon: ShieldCheck },
  { href: "/moderation/reports", label: "Жалобы", icon: Flag },
  { href: "/moderation/metrics", label: "Метрики", icon: BarChart3 },
];

export function ModerationSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Раздел модерации">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href}>
            <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
