import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, Users, Building2, Clock,
  CalendarCheck, FileBarChart, LogOut, Menu, X, Home, Settings, MessageCircle,
  Sun, Moon, Languages, Banknote, Zap, Bell, ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const ADMIN_NAV = [
    { name: t("dashboard"),   path: "/",            icon: LayoutDashboard },
    { name: t("employees"),   path: "/employees",   icon: Users },
    { name: t("branches"),    path: "/branches",    icon: Building2 },
    { name: t("departments"), path: "/departments", icon: Building2 },
    { name: t("attendance"),  path: "/attendance",  icon: CalendarCheck },
    { name: t("leaves"),      path: "/leaves",      icon: Clock },
    { name: t("reports"),     path: "/reports",     icon: FileBarChart },
    { name: "الرواتب",        path: "/payroll",     icon: Banknote },
    { name: t("chat"),        path: "/chat",        icon: MessageCircle },
    { name: t("settings"),    path: "/settings",    icon: Settings },
  ];

  const MANAGER_NAV = [
    { name: t("home"),      path: "/",         icon: Home },
    { name: t("myLeaves"),  path: "/my-leaves", icon: Clock },
    { name: t("chat"),      path: "/chat",      icon: MessageCircle },
  ];

  const EMPLOYEE_NAV = [
    { name: t("home"),      path: "/",         icon: Home },
    { name: t("myLeaves"),  path: "/my-leaves", icon: Clock },
    { name: t("chat"),      path: "/chat",      icon: MessageCircle },
  ];

  const ROLE_LABEL: Record<string, string> = {
    admin:    t("admin"),
    manager:  t("manager"),
    employee: t("employee"),
  };

  const navItems =
    user.role === "admin"   ? ADMIN_NAV :
    user.role === "manager" ? MANAGER_NAV :
    EMPLOYEE_NAV;

  const initials = user.fullName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("");

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Tajawal', sans-serif" }}>

      {/* ── Logo ── */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: "1px solid rgba(0,245,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,245,255,0.8), rgba(59,130,246,0.8))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(0,245,255,0.4)",
          }}>
            <Zap size={18} color="#020817" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#00f5ff", letterSpacing: 0.5, textShadow: "0 0 12px rgba(0,245,255,0.5)" }}>
              {t("systemTitle")}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
              {ROLE_LABEL[user.role] ?? user.role}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, border: "none", background: "transparent",
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
          }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
            >
              <motion.div
                whileHover={{ x: -3 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", marginBottom: 2, borderRadius: 10,
                  cursor: "pointer", transition: "all 0.15s",
                  background: isActive
                    ? "linear-gradient(135deg, rgba(0,245,255,0.12), rgba(59,130,246,0.08))"
                    : "transparent",
                  borderLeft: isActive ? "2.5px solid #00f5ff" : "2.5px solid transparent",
                  color: isActive ? "#00f5ff" : "rgba(255,255,255,0.45)",
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.8)";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = "rgba(255,255,255,0.45)";
                }}
              >
                <item.icon
                  size={16}
                  style={{
                    flexShrink: 0,
                    filter: isActive ? "drop-shadow(0 0 6px rgba(0,245,255,0.8))" : "none",
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>
                  {item.name}
                </span>
                {isActive && (
                  <ChevronLeft size={12} style={{ marginRight: "auto", opacity: 0.6 }} />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* ── Theme & Language ── */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(0,245,255,0.08)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={toggleTheme}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 5, padding: "7px 8px", borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.05)", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", fontSize: 11, transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,245,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#00f5ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            {theme === "dark" ? t("lightMode") : t("darkMode")}
          </button>
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 12px", borderRadius: 8, border: "none",
              background: "rgba(255,255,255,0.05)", cursor: "pointer",
              color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,245,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#00f5ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
          >
            <Languages size={13} />
            {lang === "ar" ? "EN" : "ع"}
          </button>
        </div>
      </div>

      {/* ── User card ── */}
      <div style={{ padding: "10px 10px 14px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 12,
          background: "rgba(0,245,255,0.05)",
          border: "1px solid rgba(0,245,255,0.12)",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(168,85,247,0.7))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#020817",
            boxShadow: "0 0 12px rgba(0,245,255,0.3)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.fullName}
            </div>
            <div style={{ fontSize: 10, color: "rgba(0,245,255,0.6)" }}>
              {ROLE_LABEL[user.role] ?? user.role}
            </div>
          </div>
          <button
            onClick={() => logout()}
            title={t("logout")}
            style={{
              padding: 6, borderRadius: 8, border: "none", background: "transparent",
              color: "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div
      className="flex h-screen overflow-hidden"
      dir={dir}
      style={{
        background: "linear-gradient(135deg, #020817 0%, #050d1f 50%, #080318 100%)",
        position: "relative",
      }}
    >
      {/* Ambient glow blobs */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse 55% 45% at 8% 12%, rgba(0,245,255,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 45% 55% at 92% 88%, rgba(168,85,247,0.06) 0%, transparent 70%)
        `,
      }} />

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: 220,
          background: "rgba(2,8,23,0.85)",
          backdropFilter: "blur(24px)",
          borderLeft: "1px solid rgba(0,245,255,0.1)",
          borderRight: "none",
          zIndex: 20,
          position: "relative",
        }}
      >
        {/* Top neon line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)",
        }} />
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 md:hidden"
              style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            />
            <motion.aside
              initial={{ x: dir === "rtl" ? 240 : -240 }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? 240 : -240 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className={`fixed top-0 ${dir === "rtl" ? "right-0" : "left-0"} bottom-0 z-50 flex flex-col md:hidden`}
              style={{
                width: 240,
                background: "rgba(2,8,23,0.97)",
                backdropFilter: "blur(24px)",
                borderLeft: dir === "rtl" ? "1px solid rgba(0,245,255,0.12)" : "none",
                borderRight: dir === "rtl" ? "none" : "1px solid rgba(0,245,255,0.12)",
              }}
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ position: "relative", zIndex: 1 }}>

        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            background: "rgba(2,8,23,0.9)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0,245,255,0.1)",
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{ padding: 8, borderRadius: 8, border: "none", background: "rgba(0,245,255,0.08)", color: "#00f5ff", cursor: "pointer" }}
          >
            <Menu size={18} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#00f5ff", textShadow: "0 0 12px rgba(0,245,255,0.5)" }}>
            {t("systemTitle")}
          </span>
          <div style={{ width: 36 }} />
        </header>

        {/* Desktop top bar */}
        <header
          className="hidden md:flex items-center justify-between px-6 py-0 flex-shrink-0"
          style={{
            height: 56,
            background: "rgba(2,8,23,0.7)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0,245,255,0.08)",
          }}
        >
          {/* Live status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 20,
                background: "rgba(0,255,159,0.08)",
                border: "1px solid rgba(0,255,159,0.2)",
                fontSize: 11, color: "#00ff9f",
              }}
            >
              <span style={{ width: 6, height: 6, background: "#00ff9f", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #00ff9f" }} />
              النظام يعمل
            </motion.div>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {new Date().toLocaleDateString("ar-IQ", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <Bell size={15} color="rgba(0,245,255,0.6)" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
