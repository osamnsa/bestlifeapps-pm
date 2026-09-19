import { create } from "zustand";
import { api } from "../api/client";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setSession: (access: string, refresh: string, user: User) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("access_token"),
  loading: false,
  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/token/", { username, password });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      set({ isAuthenticated: true });
      const me = await api.get("/me/");
      set({ user: me.data });
    } finally {
      set({ loading: false });
    }
  },
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false });
  },
  fetchMe: async () => {
    try {
      const { data } = await api.get("/me/");
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
  setSession: (access, refresh, user) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    set({ user, isAuthenticated: true });
  },
}));
