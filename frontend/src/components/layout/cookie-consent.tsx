"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookieConsent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "accepted") setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Уведомление об использовании cookie"
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
    >
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-2">
              <Cookie className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Сайт использует файлы cookie для работы сервиса, входа в аккаунт и улучшения вашего опыта.
              Продолжая пользоваться сайтом, вы соглашаетесь с{" "}
              <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                использованием cookie
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={accept} className="gap-1.5">
              Принять
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={accept}
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
