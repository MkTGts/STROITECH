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

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("accessToken");
    if (token) connectWs(token);
    return () => disconnectWs();
  }, [isAuthenticated]);

  // Глобальное обновление бейджа уведомлений по событиям чата
  useEffect(() => {
    if (!isAuthenticated) return;
    // здесь больше не управляем счётчиком — он используется для центра уведомлений
    // и обновляется через страницу уведомлений и события WebSocket "notification"
  }, [isAuthenticated]);
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
