"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthenticatedUser = {
  id: number;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "user" | "viewer";
};

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    setStatus((prev) => (prev === "authenticated" ? prev : "loading"));
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setStatus("unauthenticated");
        setError(null);
        return;
      }

      const data = (await res.json()) as AuthenticatedUser;
      setUser(data);
      setStatus("authenticated");
      setError(null);
    } catch (err) {
      console.error("AuthProvider fetch error:", err);
      setUser(null);
      setStatus("unauthenticated");
      setError("Kullanıcı bilgileri yüklenemedi");
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("AuthProvider logout error:", err);
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      error,
      refresh: fetchCurrentUser,
      logout,
    }),
    [fetchCurrentUser, logout, status, user, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
