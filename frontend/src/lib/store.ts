import { create } from "zustand";
import { api } from "./api";

type User = {
  id: string;
  email: string;
  phone: string;
  role: string;
  name: string;
  region: string | null;
  companyName: string | null;
  description: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
};

/**
 * Global authentication store using Zustand.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("accessToken", res.data.tokens.accessToken);
    localStorage.setItem("refreshToken", res.data.tokens.refreshToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  register: async (data) => {
    const companyName =
      typeof data.companyName === "string" && data.companyName.trim() !== ""
        ? data.companyName.trim()
        : null;
    const res = await api<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...data, companyName }),
    });
    localStorage.setItem("accessToken", res.data.tokens.accessToken);
    localStorage.setItem("refreshToken", res.data.tokens.refreshToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const res = await api<any>("/auth/me");
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

type NotificationState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  adjustUnread: (delta: number) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  adjustUnread: (delta) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount + delta) })),
}));
