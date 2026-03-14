import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Clock, 
  CalendarCheck, 
  FileBarChart, 
  Settings, 
  LogOut,
  Menu,
  X,
  MapPin
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  const isAdminOrManager = user.role === "admin" || user.role === "manager";

  const navItems = isAdminOrManager ? [
    { name: "لوحة التحكم", path: "/", icon: LayoutDashboard },
    { name: "الموظفين", path: "/employees", icon: Users },
    { name: "الأقسام", path: "/departments", icon: Building2 },
    { name: "الشفتات", path: "/shifts", icon: Clock },
    { name: "سجل الحضور", path: "/attendance", icon: CalendarCheck },
    { name: "الإجازات", path: "/leaves", icon: FileBarChart },
    { name: "التقارير", path: "/reports", icon: FileBarChart },
    { name: "الإعدادات", path: "/settings", icon: Settings },
  ] : [
    { name: "الرئيسية", path: "/", icon: LayoutDashboard },
    { name: "سجل حضوري", path: "/my-attendance", icon: CalendarCheck },
    { name: "إجازاتي", path: "/my-leaves", icon: FileBarChart },
  ];

  return (
    <div className="flex h-screen bg-gray-50/50 overflow-hidden" dir="rtl">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground shadow-2xl transition-all duration-300 z-20">
        <div className="flex items-center justify-center h-20 border-b border-sidebar-border bg-sidebar-accent/50">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-10 h-10 me-3" />
          <h1 className="text-xl font-bold tracking-wider text-accent">نظام الحضور</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group hover-elevate",
                  isActive 
                    ? "bg-primary-foreground text-primary shadow-md font-semibold" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 me-3 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center px-4 py-3 rounded-xl bg-sidebar-accent shadow-inner">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-lg shadow-sm">
              {user.fullName.charAt(0)}
            </div>
            <div className="ms-3 flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user.fullName}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user.role}</p>
            </div>
            <button 
              onClick={() => logout()} 
              className="p-2 rounded-lg text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-4/5 max-w-sm bg-sidebar text-sidebar-foreground shadow-2xl h-full">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <div className="flex items-center">
                <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 me-2" />
                <h1 className="text-lg font-bold text-accent">نظام الحضور</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-lg transition-colors",
                    location === item.path 
                      ? "bg-primary-foreground text-primary font-semibold" 
                      : "hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5 me-3" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <button 
                onClick={() => logout()} 
                className="flex items-center justify-center w-full px-4 py-3 text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-5 h-5 me-2" />
                تسجيل الخروج
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border shadow-sm z-10">
          <div className="flex items-center">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8 me-2" />
            <h1 className="text-lg font-bold text-primary">نظام الحضور</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -me-2 text-foreground">
            <Menu className="w-6 h-6" />
          </button>
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
