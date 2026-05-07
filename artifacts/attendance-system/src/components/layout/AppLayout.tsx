import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, Users, Building2, Clock,
  CalendarCheck, FileBarChart, LogOut, Menu, X, Home, Settings, MessageCircle,
  Sun, Moon, Languages
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const ADMIN_NAV = [
    { name: t("dashboard"), path: "/", icon: LayoutDashboard },
    { name: t("employees"), path: "/employees", icon: Users },
    { name: t("branches"), path: "/branches", icon: Building2 },
    { name: t("departments"), path: "/departments", icon: Building2 },
    { name: t("attendance"), path: "/attendance", icon: CalendarCheck },
    { name: t("leaves"), path: "/leaves", icon: Clock },
    { name: t("reports"), path: "/reports", icon: FileBarChart },
    { name: t("chat"), path: "/chat", icon: MessageCircle },
    { name: t("settings"), path: "/settings", icon: Settings },
  ];

  const MANAGER_NAV = [
    { name: t("home"), path: "/", icon: Home },
    { name: t("myLeaves"), path: "/my-leaves", icon: Clock },
    { name: t("chat"), path: "/chat", icon: MessageCircle },
  ];

  const EMPLOYEE_NAV = [
    { name: t("home"), path: "/", icon: Home },
    { name: t("myLeaves"), path: "/my-leaves", icon: Clock },
    { name: t("chat"), path: "/chat", icon: MessageCircle },
  ];

  const ROLE_LABEL: Record<string, string> = {
    admin: t("admin"),
    manager: t("manager"),
    employee: t("employee"),
  };

  const navItems =
    user.role === "admin" ? ADMIN_NAV :
    user.role === "manager" ? MANAGER_NAV :
    EMPLOYEE_NAV;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">{t("systemTitle")}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium",
                isActive
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Theme + Language Toggles */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? t("lightMode") : t("darkMode")}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-xs"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {theme === "dark" ? t("lightMode") : t("darkMode")}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            title={t("language")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-xs font-bold"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "ar" ? "EN" : "ع"}
          </button>
        </div>
      </div>

      {/* User + Logout */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-white/10">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {user.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user.fullName}</p>
            <p className="text-white/50 text-xs">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={() => logout()}
            title={t("logout")}
            className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const { theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div
      className={`flex h-screen overflow-hidden transition-colors duration-300 ${
        theme === "light" ? "bg-gray-100" : "bg-gray-950"
      }`}
      dir={dir}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl z-20 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className={`relative flex flex-col w-72 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl h-full ${dir === "ltr" ? "mr-auto" : "ml-auto"}`}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-white/70 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-bold text-sm">{t("systemTitle")}</span>
          <div className="w-9" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
