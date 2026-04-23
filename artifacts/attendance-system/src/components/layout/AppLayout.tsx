import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, Building2, Clock,
  CalendarCheck, FileBarChart, LogOut, Menu, X, Home, Settings
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ADMIN_NAV = [
  { name: "لوحة التحكم", path: "/", icon: LayoutDashboard },
  { name: "الموظفين", path: "/employees", icon: Users },
  { name: "الفروع", path: "/branches", icon: Building2 },
  { name: "الأقسام والشفتات", path: "/departments", icon: Building2 },
  { name: "سجل الحضور", path: "/attendance", icon: CalendarCheck },
  { name: "الإجازات", path: "/leaves", icon: Clock },
  { name: "التقارير", path: "/reports", icon: FileBarChart },
  { name: "الإعدادات", path: "/settings", icon: Settings },
];

const MANAGER_NAV = [
  { name: "الرئيسية", path: "/", icon: Home },
  { name: "إجازاتي", path: "/my-leaves", icon: Clock },
];

const EMPLOYEE_NAV = [
  { name: "الرئيسية", path: "/", icon: Home },
  { name: "إجازاتي", path: "/my-leaves", icon: Clock },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مشرف",
  employee: "موظف",
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const navItems =
    user.role === "admin" ? ADMIN_NAV :
    user.role === "manager" ? MANAGER_NAV :
    EMPLOYEE_NAV;

  const handleLogout = () => logout();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-20 px-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-base">نظام الحضور</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-sm font-medium",
                isActive
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary" : "")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/10">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {user.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user.fullName}</p>
            <p className="text-white/50 text-xs">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="p-2 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl z-20 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl h-full">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
          <button onClick={() => setMobileOpen(true)} className="p-2 text-white/70 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-white font-bold text-sm">نظام الحضور</span>
          <div className="w-10" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
