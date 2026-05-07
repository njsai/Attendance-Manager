import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./auth";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const BASE = import.meta.env.BASE_URL;

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  try { localStorage.setItem("theme", t); } catch {}
}

async function saveThemeToDB(theme: Theme) {
  try {
    await fetch(`${BASE}api/preferences`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {}
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateUserPrefs } = useAuth();

  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      return stored === "dark" || stored === "light" ? stored : "dark";
    } catch { return "dark"; }
  });

  // Sync from DB when user loads / changes
  useEffect(() => {
    if (!user) return;
    const dbTheme = user.preferredTheme;
    if (dbTheme === "dark" || dbTheme === "light") {
      if (dbTheme !== theme) {
        setThemeState(dbTheme);
        applyTheme(dbTheme);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.preferredTheme]);

  // Apply theme on state change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
    if (user) {
      saveThemeToDB(next);
      updateUserPrefs({ theme: next });
    }
  }, [theme, user, updateUserPrefs]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
