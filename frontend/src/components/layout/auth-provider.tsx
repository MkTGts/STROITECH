"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/lib/store";
import { useWebSocket } from "@/lib/hooks";

type AuthProviderProps = {
  children: ReactNode;
};

/**
 * Initializes authentication state and WebSocket connection on app load.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  useWebSocket();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return <>{children}</>;
}
