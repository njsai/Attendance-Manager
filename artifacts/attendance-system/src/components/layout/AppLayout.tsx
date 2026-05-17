import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, Users, Building2, Clock,
  CalendarCheck, FileBarChart, LogOut, Menu, X, Home, Settings, MessageCircle,
  Sun, Moon, Languages, Banknote, Zap, Bell, ChevronLeft, AlertTriangle, Info, CheckCircle, UserCircle, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (!user) return null;

  const ADMIN_NAV = [
    { name: t("dashboard"),   path: "/",            icon: LayoutDashboard },
    { name: t("employees"),   path: "/employees",   icon: Users },
    { name: t("branches"),    path: "/branches",    icon: Building2 },
    { name: t("departments"), path: "/departments", icon: Building2 },
    { name: t("attendance"),  path: "/attendance",  icon: CalendarCheck },
    { name: t("leaves"),      path: "/leaves",      icon: Clock },
    { name: t("reports"),     path: "/reports",     icon: FileBarChart },
    { name: t("payroll"),     path: "/payroll",     icon: Banknote },
    { name: t("loans"),       path: "/loans",       icon: CreditCard },
    { name: t("chat"),        path: "/chat",        icon: MessageCircle },
    { name: t("settings"),    path: "/settings",    icon: Settings },
  ];

  const MANAGER_NAV = [
    { name: t("home"),        path: "/",           icon: Home },
    { name: t("myLeaves"),    path: "/my-leaves",  icon: Clock },
    { name: t("myProfile"),   path: "/my-profile", icon: UserCircle },
    { name: t("chat"),        path: "/chat",       icon: MessageCircle },
  ];

  const EMPLOYEE_NAV = [
    { name: t("home"),        path: "/",           icon: Home },
    { name: t("myLeaves"),    path: "/my-leaves",  icon: Clock },
    { name: t("myLoans"),     path: "/my-loans",   icon: CreditCard },
    { name: t("myProfile"),   path: "/my-profile", icon: UserCircle },
    { name: t("chat"),        path: "/chat",       icon: MessageCircle },
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

  const sidebarBg = isDark ? "rgba(2,8,23,0.85)" : "rgba(255,255,255,0.97)";
  const textBase = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.5)";
  const textActive = isDark ? "#00f5ff" : "#0891b2";
  const activeBg = isDark
    ? "linear-gradient(135deg, rgba(0,245,255,0.12), rgba(59,130,246,0.08))"
    : "linear-gradient(135deg, rgba(0,200,220,0.08), rgba(59,130,246,0.06))";
  const borderColor = isDark ? "rgba(0,245,255,0.1)" : "rgba(0,180,200,0.15)";
  const hoverBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,180,200,0.05)";
  const hoverText = isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.8)";
  const btnBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const btnColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(15,23,42,0.45)";
  const userCardBg = isDark ? "rgba(0,245,255,0.05)" : "rgba(0,180,200,0.06)";
  const userCardBorder = isDark ? "rgba(0,245,255,0.12)" : "rgba(0,180,200,0.18)";
  const titleColor = isDark ? "#00f5ff" : "#0891b2";
  const subtitleColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.35)";
  const nameColor = isDark ? "#fff" : "#0f172a";
  const roleColor = isDark ? "rgba(0,245,255,0.6)" : "rgba(8,145,178,0.7)";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Tajawal', sans-serif", background: sidebarBg }}>

      {/* ── Logo ── */}
      <div style={{
        padding: "20px 16px 16px",
        borderBottom: `1px solid ${borderColor}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,245,255,0.8), rgba(59,130,246,0.8))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isDark ? "0 0 20px rgba(0,245,255,0.4)" : "0 0 12px rgba(0,180,200,0.25)",
          }}>
            <Zap size={18} color={isDark ? "#020817" : "#fff"} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: titleColor, letterSpacing: 0.5, textShadow: isDark ? "0 0 12px rgba(0,245,255,0.5)" : "none" }}>
              {t("systemTitle")}
            </div>
            <div style={{ fontSize: 9, color: subtitleColor, marginTop: 1 }}>
              {ROLE_LABEL[user.role] ?? user.role}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, border: "none", background: "transparent",
            color: subtitleColor, cursor: "pointer",
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
            <Link key={item.path} href={item.path} onClick={onClose}>
              <motion.div
                whileHover={{ x: lang === "ar" ? -3 : 3 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", marginBottom: 2, borderRadius: 10,
                  cursor: "pointer", transition: "all 0.15s",
                  background: isActive ? activeBg : "transparent",
                  borderLeft: lang === "ltr" ? (isActive ? `2.5px solid ${textActive}` : "2.5px solid transparent") : "none",
                  borderRight: lang === "ar" ? (isActive ? `2.5px solid ${textActive}` : "2.5px solid transparent") : "none",
                  color: isActive ? textActive : textBase,
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = hoverBg;
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = hoverText;
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.color = textBase;
                }}
              >
                <item.icon
                  size={16}
                  style={{
                    flexShrink: 0,
                    filter: isActive && isDark ? "drop-shadow(0 0 6px rgba(0,245,255,0.8))" : "none",
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
      <div style={{ padding: "8px 10px", borderTop: `1px solid ${borderColor}` }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={toggleTheme}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 5, padding: "7px 8px", borderRadius: 8, border: "none",
              background: btnBg, cursor: "pointer",
              color: btnColor, fontSize: 11, transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = textActive;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = btnBg;
              (e.currentTarget as HTMLButtonElement).style.color = btnColor;
            }}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
            {isDark ? t("lightMode") : t("darkMode")}
          </button>
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 12px", borderRadius: 8, border: "none",
              background: btnBg, cursor: "pointer",
              color: btnColor, fontSize: 11, fontWeight: 700, transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = textActive;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = btnBg;
              (e.currentTarget as HTMLButtonElement).style.color = btnColor;
            }}
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
          background: userCardBg,
          border: `1px solid ${userCardBorder}`,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(168,85,247,0.7))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#020817",
            boxShadow: isDark ? "0 0 12px rgba(0,245,255,0.3)" : "0 0 8px rgba(0,180,200,0.2)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: nameColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.fullName}
            </div>
            <div style={{ fontSize: 10, color: roleColor }}>
              {ROLE_LABEL[user.role] ?? user.role}
            </div>
          </div>
          <button
            onClick={() => logout()}
            title={t("logout")}
            style={{
              padding: 6, borderRadius: 8, border: "none", background: "transparent",
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)", cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.1)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface Alert {
  id: number; type: string; severity: string; title: string; message: string;
  is_read: boolean; created_at: string;
}

function severityIcon(s: string) {
  if (s === "warning") return <AlertTriangle size={13} style={{ color: "#f59e0b", flexShrink: 0 }} />;
  if (s === "error")   return <AlertTriangle size={13} style={{ color: "#f87171", flexShrink: 0 }} />;
  if (s === "success") return <CheckCircle   size={13} style={{ color: "#10b981", flexShrink: 0 }} />;
  return <Info size={13} style={{ color: "#00f5ff", flexShrink: 0 }} />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t, dir, locale, lang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);
  const BASE = import.meta.env.BASE_URL;

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${BASE}api/company/alerts`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (user) {
      fetchAlerts();
      const iv = setInterval(fetchAlerts, 60000);
      return () => clearInterval(iv);
    }
  }, [user]);

  useEffect(() => {
    if (!alertsOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setAlertsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [alertsOpen]);

  const markAllRead = async () => {
    try {
      await fetch(`${BASE}api/company/alerts/read-all`, { method: "PUT", credentials: "include" });
      setAlerts(a => a.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  if (!user) return <>{children}</>;

  const appBg = isDark
    ? "linear-gradient(135deg, #020817 0%, #050d1f 50%, #080318 100%)"
    : "linear-gradient(135deg, #f0f9ff 0%, #fefefe 50%, #fdf4ff 100%)";
  const headerBg = isDark ? "rgba(2,8,23,0.7)" : "rgba(255,255,255,0.85)";
  const headerBorder = isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.15)";
  const topbarBg = isDark ? "rgba(2,8,23,0.9)" : "rgba(255,255,255,0.95)";
  const sidebarBorderColor = isDark ? "rgba(0,245,255,0.1)" : "rgba(0,180,200,0.2)";
  const pillBg = isDark ? "rgba(0,255,159,0.08)" : "rgba(0,180,100,0.08)";
  const pillBorder = isDark ? "rgba(0,255,159,0.2)" : "rgba(0,180,100,0.2)";
  const pillColor = isDark ? "#00ff9f" : "#059669";
  const dateColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.45)";
  const bellBg = isDark ? "rgba(0,245,255,0.06)" : "rgba(0,180,200,0.06)";
  const bellBorder = isDark ? "rgba(0,245,255,0.12)" : "rgba(0,180,200,0.15)";
  const bellColor = isDark ? "rgba(0,245,255,0.6)" : "rgba(8,145,178,0.7)";
  const menuBg = isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.08)";
  const menuColor = isDark ? "#00f5ff" : "#0891b2";
  const titleColor = isDark ? "#00f5ff" : "#0891b2";

  const panelBg = isDark ? "#0d1424" : "#fff";
  const panelBorder = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const panelTextPrimary = isDark ? "#fff" : "#0f172a";
  const panelTextSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const panelDivider = isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";
  const panelUnreadBg = isDark ? "rgba(0,245,255,0.03)" : "#f0f9ff";

  const fmtTime = (d: string) => new Date(d).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className="flex h-screen overflow-hidden"
      dir={dir}
      style={{ background: appBg, position: "relative" }}
    >
      {/* Ambient glow blobs */}
      {isDark && (
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `
            radial-gradient(ellipse 55% 45% at 8% 12%, rgba(0,245,255,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 45% 55% at 92% 88%, rgba(168,85,247,0.06) 0%, transparent 70%)
          `,
        }} />
      )}

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: 220,
          backdropFilter: "blur(24px)",
          borderInlineStart: `1px solid ${sidebarBorderColor}`,
          zIndex: 20,
          position: "relative",
        }}
      >
        {isDark && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)",
          }} />
        )}
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
                backdropFilter: "blur(24px)",
                borderInlineEnd: `1px solid ${sidebarBorderColor}`,
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
            background: topbarBg,
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${headerBorder}`,
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{ padding: 8, borderRadius: 8, border: "none", background: menuBg, color: menuColor, cursor: "pointer" }}
          >
            <Menu size={18} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: titleColor, textShadow: isDark ? "0 0 12px rgba(0,245,255,0.5)" : "none" }}>
            {t("systemTitle")}
          </span>
          <div style={{ width: 36 }} />
        </header>

        {/* Desktop top bar */}
        <header
          className="hidden md:flex items-center justify-between px-6 py-0 flex-shrink-0"
          style={{
            height: 56,
            background: headerBg,
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${headerBorder}`,
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
                background: pillBg, border: `1px solid ${pillBorder}`,
                fontSize: 11, color: pillColor,
              }}
            >
              <span style={{ width: 6, height: 6, background: pillColor, borderRadius: "50%", display: "inline-block", boxShadow: `0 0 6px ${pillColor}` }} />
              {t("systemOnline")}
            </motion.div>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, color: dateColor }}>
              {new Date().toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })}
            </div>

            {/* Per-user HR notifications bell (all roles) */}
            <NotificationBell />

            {/* Company system alerts bell (admin only) */}
            {user.role === "admin" && <div ref={bellRef} style={{ position: "relative" }}>
              <div
                onClick={() => setAlertsOpen(v => !v)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: alertsOpen ? (isDark ? "rgba(0,245,255,0.12)" : "rgba(0,180,200,0.12)") : bellBg,
                  border: `1px solid ${bellBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", position: "relative",
                }}
              >
                <Bell size={15} color={bellColor} />
                {unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -5,
                    minWidth: 16, height: 16, borderRadius: 8,
                    background: "#f87171", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", lineHeight: 1,
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>

              <AnimatePresence>
                {alertsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute", top: 40,
                      [dir === "rtl" ? "left" : "right"]: 0,
                      width: 320,
                      background: panelBg,
                      border: `1px solid ${panelBorder}`,
                      borderRadius: 14,
                      boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)",
                      zIndex: 200,
                      overflow: "hidden",
                      fontFamily: "'Tajawal', sans-serif",
                    }}
                  >
                    {/* Panel header */}
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${panelDivider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Bell size={14} color={bellColor} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: panelTextPrimary }}>
                          {lang === "ar" ? "التنبيهات" : "Notifications"}
                        </span>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: "#f87171", color: "#fff", borderRadius: 20, padding: "1px 6px" }}>
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead}
                          style={{ fontSize: 11, color: "#00f5ff", background: "none", border: "none", cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                          {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
                        </button>
                      )}
                    </div>

                    {/* Notifications list */}
                    <div style={{ maxHeight: 340, overflowY: "auto" }}>
                      {alerts.length === 0 ? (
                        <div style={{ padding: "36px 16px", textAlign: "center" }}>
                          <Bell size={28} style={{ margin: "0 auto 8px", opacity: 0.2, color: panelTextPrimary }} />
                          <p style={{ fontSize: 12, color: panelTextSecondary, margin: 0 }}>
                            {lang === "ar" ? "لا توجد تنبيهات" : "No notifications"}
                          </p>
                        </div>
                      ) : alerts.map((n, i) => (
                        <div key={n.id} style={{
                          padding: "10px 14px",
                          background: !n.is_read ? panelUnreadBg : "transparent",
                          borderBottom: i < alerts.length - 1 ? `1px solid ${panelDivider}` : "none",
                          display: "flex", gap: 10, alignItems: "flex-start",
                        }}>
                          {severityIcon(n.severity)}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: panelTextPrimary, lineHeight: 1.4 }}>{n.title}</div>
                            <div style={{ fontSize: 11, color: panelTextSecondary, marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 10, color: panelTextSecondary, marginTop: 4, opacity: 0.7 }}>{fmtTime(n.created_at)}</div>
                          </div>
                          {!n.is_read && (
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#00f5ff", flexShrink: 0, marginTop: 3 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>}
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
