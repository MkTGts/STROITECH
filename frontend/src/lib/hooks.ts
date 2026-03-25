"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore, useNotificationStore } from "./store";
import { connectWs, disconnectWs, onWsMessage } from "./ws";
import { api } from "./api";

/**
 * Initialize WebSocket connection when user is authenticated.
 */
export function useWebSocket(): void {
  const isAuthenticated = useAuthStore((s: any) => s.isAuthenticated);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const adjustUnread = useNotificationStore((s) => s.adjustUnread);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("accessToken");
    if (token) connectWs(token);
    return () => disconnectWs();
  }, [isAuthenticated]);

  // Глобальное обновление счётчика уведомлений по WebSocket
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    // Инициализируем счётчик (чтобы после перезагрузки страницы бейдж был корректный)
    api<any>("/notifications", { params: { limit: 1 } })
      .then((res) => {
        if (!cancelled) setUnreadCount(res.data.unreadCount ?? 0);
      })
      .catch(() => {
        // ignore
      });

    // realtime: увеличиваем счётчик при новых уведомлениях
    const unsubscribe = onWsMessage((msg) => {
      if (msg.type === "notification") {
        const payload = msg.payload;
        if (payload && payload.isRead === false) {
          adjustUnread(1);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [adjustUnread, isAuthenticated, setUnreadCount]);
}

/**
 * Subscribe to a specific WebSocket event type.
 */
export function useWsEvent(eventType: string, handler: (payload: any) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    return onWsMessage((msg) => {
      if (msg.type === eventType) {
        handlerRef.current(msg.payload);
      }
    });
  }, [eventType]);
}

/**
 * Debounce a value by the given delay in milliseconds.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Check if the current viewport matches a media query.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
