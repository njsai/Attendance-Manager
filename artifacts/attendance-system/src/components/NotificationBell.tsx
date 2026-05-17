import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Clock, FileText, Banknote, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

interface UserNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_id: number | null;
  related_type: string | null;
  created_at: string;
}

function typeIcon(type: string, color: string) {
  if (type.startsWith("leave"))   return <Clock size={13} style={{ color, flexShrink: 0 }} />;
  if (type.startsWith("loan"))    return <CreditCard size={13} style={{ color, flexShrink: 0 }} />;
  if (type.startsWith("payroll")) return <Banknote size={13} style={{ color, flexShrink: 0 }} />;
  if (type.startsWith("document")) return <FileText size={13} style={{ color, flexShrink: 0 }} />;
  return <Bell size={13} style={{ color, flexShrink: 0 }} />;
}

function relativeTime(dateStr: string, lang: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return lang === "ar" ? "الآن"            : "just now";
  if (diff < 3600)  return lang === "ar" ? `منذ ${Math.floor(diff / 60)} دقيقة`  : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return lang === "ar" ? `منذ ${Math.floor(diff / 3600)} ساعة`  : `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return lang === "ar" ? `منذ ${Math.floor(diff / 86400)} يوم`  : `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-US", { month: "short", day: "numeric" });
}

function accentColor(type: string, isDark: boolean): string {
  if (type.includes("approved")) return isDark ? "#10b981" : "#059669";
  if (type.includes("rejected")) return isDark ? "#f87171" : "#dc2626";
  if (type.startsWith("payroll")) return isDark ? "#a78bfa" : "#7c3aed";
  return isDark ? "#00f5ff" : "#0891b2";
}

export default function NotificationBell() {
  const { lang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const BASE = import.meta.env.BASE_URL;

  const [open, setOpen]                     = useState(false);
  const [notifications, setNotifications]   = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const bellRef                             = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${BASE}api/user-notifications`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: number) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await fetch(`${BASE}api/user-notifications/${id}/read`, { method: "PUT", credentials: "include" });
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch(`${BASE}api/user-notifications/read-all`, { method: "PUT", credentials: "include" });
    } catch {}
  };

  const bellBg    = isDark ? "rgba(0,245,255,0.06)" : "rgba(0,180,200,0.06)";
  const bellBorder = isDark ? "rgba(0,245,255,0.12)" : "rgba(0,180,200,0.15)";
  const bellColor  = isDark ? "rgba(0,245,255,0.6)"  : "rgba(8,145,178,0.7)";
  const panelBg    = isDark ? "#0d1424" : "#fff";
  const panelBorder = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const panelTextPrimary   = isDark ? "#fff"  : "#0f172a";
  const panelTextSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const panelDivider       = isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";
  const panelUnreadBg      = isDark ? "rgba(0,245,255,0.03)"  : "#f0f9ff";

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <div
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifications(); }}
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: open ? (isDark ? "rgba(0,245,255,0.12)" : "rgba(0,180,200,0.12)") : bellBg,
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

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: 40,
              [lang === "ar" ? "left" : "right"]: 0,
              width: 320,
              background: panelBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: 14,
              boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 200, overflow: "hidden",
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${panelDivider}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={14} color={bellColor} />
                <span style={{ fontSize: 13, fontWeight: 700, color: panelTextPrimary }}>
                  {lang === "ar" ? "الإشعارات" : "Notifications"}
                </span>
                {unreadCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: "#f87171", color: "#fff",
                    borderRadius: 20, padding: "1px 6px",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: bellColor, background: "none",
                    border: "none", cursor: "pointer", padding: "2px 6px",
                    borderRadius: 6,
                  }}
                >
                  <CheckCheck size={12} />
                  {lang === "ar" ? "قراءة الكل" : "Mark all read"}
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: "32px 16px", textAlign: "center",
                  color: panelTextSecondary, fontSize: 12,
                }}>
                  {lang === "ar" ? "لا توجد إشعارات" : "No notifications yet"}
                </div>
              ) : (
                notifications.map(n => {
                  const accent = accentColor(n.type, isDark);
                  return (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.is_read) markRead(n.id); }}
                      style={{
                        padding: "10px 16px",
                        borderBottom: `1px solid ${panelDivider}`,
                        background: n.is_read ? "transparent" : panelUnreadBg,
                        borderInlineStart: n.is_read ? "3px solid transparent" : `3px solid ${accent}`,
                        cursor: n.is_read ? "default" : "pointer",
                        transition: "background 0.15s",
                        display: "flex", gap: 10, alignItems: "flex-start",
                      }}
                    >
                      <div style={{
                        marginTop: 2, width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {typeIcon(n.type, accent)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: n.is_read ? 400 : 600,
                          color: n.is_read ? panelTextSecondary : panelTextPrimary,
                          marginBottom: 2,
                        }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11, color: panelTextSecondary, lineHeight: 1.5 }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: 10, color: panelTextSecondary, marginTop: 4, opacity: 0.7 }}>
                          {relativeTime(n.created_at, lang)}
                        </div>
                      </div>
                      {!n.is_read && (
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: accent, flexShrink: 0, marginTop: 6,
                        }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
