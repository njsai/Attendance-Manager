import { createContext, useContext, ReactNode, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface AppUser {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "manager" | "employee" | "super_admin";
  companyId?: number;
  faceDescriptor?: string | null;
  preferredTheme?: "dark" | "light" | null;
  preferredLang?: "ar" | "en" | null;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateUserPrefs: (prefs: { theme?: string; lang?: string }) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const BASE = import.meta.env.BASE_URL;

const COMPANY_INACTIVE_KEY = "attend_company_inactive";

export function getAndClearCompanyInactiveFlag(): boolean {
  const flag = sessionStorage.getItem(COMPANY_INACTIVE_KEY);
  if (flag) { sessionStorage.removeItem(COMPANY_INACTIVE_KEY); return true; }
  return false;
}

async function fetchMe(): Promise<AppUser | null> {
  try {
    const res = await fetch(`${BASE}api/auth/me`, { credentials: "include" });
    if (res.status === 403) {
      const data = await res.json().catch(() => ({}));
      if (data?.message === "company_inactive") {
        sessionStorage.setItem(COMPANY_INACTIVE_KEY, "1");
      }
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const cached = queryClient.getQueryData<AppUser>(["/api/auth/me"]);
    if (cached) {
      setUser(cached);
      setIsLoading(false);
      return;
    }

    fetchMe().then(u => {
      if (u) queryClient.setQueryData(["/api/auth/me"], u);
      setUser(u);
      setIsLoading(false);
    });
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(event => {
      const key = event.query.queryKey;
      if (Array.isArray(key) && key[0] === "/api/auth/me") {
        const data = event.query.state.data as AppUser | undefined;
        setUser(data ?? null);
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const logout = async () => {
    try {
      await fetch(`${BASE}api/auth/logout`, { method: "POST", credentials: "include" });
    } catch { }
    queryClient.clear();
    setUser(null);
    const loginPath = `${BASE}login`.replace(/\/\//g, "/");
    window.location.href = loginPath;
  };

  const updateUserPrefs = (prefs: { theme?: string; lang?: string }) => {
    setUser(prev => prev ? { ...prev, ...prefs.theme && { preferredTheme: prefs.theme as "dark" | "light" }, ...prefs.lang && { preferredLang: prefs.lang as "ar" | "en" } } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, updateUserPrefs }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
