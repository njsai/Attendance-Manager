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
const USER_CACHE_KEY = "attend_user_v1";

export function getAndClearCompanyInactiveFlag(): boolean {
  const flag = sessionStorage.getItem(COMPANY_INACTIVE_KEY);
  if (flag) { sessionStorage.removeItem(COMPANY_INACTIVE_KEY); return true; }
  return false;
}

function readCachedUser(): AppUser | null {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch { return null; }
}

function writeCachedUser(u: AppUser | null) {
  try {
    if (u) sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(USER_CACHE_KEY);
  } catch { }
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

  // ── Start from cache so the UI renders immediately — no spinner on load ───
  const initialUser = readCachedUser();
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(initialUser === null); // false if cached
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // If we had a cached user, sync quietly in the background
    // If no cache, we must wait for the fetch before rendering (isLoading=true)
    fetchMe().then(u => {
      writeCachedUser(u);
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
        const u = data ?? null;
        writeCachedUser(u);
        setUser(u);
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const logout = async () => {
    try {
      await fetch(`${BASE}api/auth/logout`, { method: "POST", credentials: "include" });
    } catch { }
    writeCachedUser(null);
    queryClient.clear();
    setUser(null);
    const loginPath = `${BASE}login`.replace(/\/\//g, "/");
    window.location.href = loginPath;
  };

  const updateUserPrefs = (prefs: { theme?: string; lang?: string }) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        ...(prefs.theme && { preferredTheme: prefs.theme as "dark" | "light" }),
        ...(prefs.lang  && { preferredLang:  prefs.lang  as "ar"   | "en"   }),
      };
      writeCachedUser(updated);
      return updated;
    });
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
