import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell, CheckCircle, AlertTriangle, XCircle, Info,
  Trash2, ChevronLeft, RefreshCw, Eye, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { SA_T, getSAColors } from "@/lib/sa-utils";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Error");
  return data;
}

interface Notification {
  id: number; type: string; severity: "info" | "warning" | "error" | "success";
  title: string; message: string; company_name: string | null;
  is_read: boolean; created_at: string;
}

const SEV_CFG_DARK = {
  info:    { color: "#00f5ff", bg: "rgba(0,245,255,0.08)" },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  error:   { color: "#f87171", bg: "rgba(248,113,113,0.08)" },
  success: { color: "#10b981", bg: "rgba(16,185,129,0.08)" },
};
const SEV_CFG_LIGHT = {
  info:    { color: "#0891b2", bg: "rgba(8,145,178,0.06)" },
  warning: { color: "#b45309", bg: "rgba(180,83,9,0.06)" },
  error:   { color: "#dc2626", bg: "rgba(220,38,38,0.06)" },
  success: { color: "#059669", bg: "rgba(5,150,105,0.06)" },
};
const SEV_ICONS = {
  info:    <Info size={16}/>,
  warning: <AlertTriangle size={16}/>,
  error:   <XCircle size={16}/>,
  success: <CheckCircle size={16}/>,
};

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { lang, dir, setLang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = getSAColors(isDark);
  const T = SA_T[lang];

  const SEV_CFG = isDark ? SEV_CFG_DARK : SEV_CFG_LIGHT;
  const SEV_LABELS: Record<string, string> = {
    info: T.infoSev, warning: T.warningSev, error: T.errorSev, success: T.successSev,
  };

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "warning" | "error" | "success">("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const showMsg = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("api/super-admin/notifications?limit=100");
      setNotifications(r.notifications || []);
      setUnreadCount(r.unreadCount || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`api/super-admin/notifications/${id}/read`, { method: "PUT" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiFetch("api/super-admin/notifications/read-all", { method: "PUT" });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showMsg(T.allReadDone);
    } catch {}
  };

  const deleteNotif = async (id: number) => {
    try {
      await apiFetch(`api/super-admin/notifications/${id}`, { method: "DELETE" });
      const was = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (was && !was.is_read) setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const clearRead = async () => {
    if (!confirm(T.confirmClearRead)) return;
    try {
      await apiFetch("api/super-admin/notifications/clear-read", { method: "DELETE" });
      setNotifications(prev => prev.filter(n => !n.is_read));
      showMsg(T.clearReadDone);
    } catch {}
  };

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "warning" || filter === "error" || filter === "success") return n.severity === filter;
    return true;
  });

  const baseStyle = { fontFamily: "'Tajawal', sans-serif", color: C.textPrimary };

  const FILTER_TABS = [
    { k: "all" as const,     l: T.allFilter },
    { k: "unread" as const,  l: T.unreadFilter },
    { k: "warning" as const, l: T.warningsFilter },
    { k: "error" as const,   l: T.errorsFilter },
    { k: "success" as const, l: T.successFilter },
  ];

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: C.pageBg, ...baseStyle }}>
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100,
              background: "rgba(16,185,129,0.9)", color: "#fff", padding: "10px 24px",
              borderRadius: 12, fontWeight: 700, fontSize: 14, backdropFilter: "blur(8px)" }}>
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${isDark ? "rgba(245,158,11,0.15)" : C.headerBorder}`, backdropFilter: isDark ? "blur(20px)" : "none", position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setLocation("/super-admin")} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ position: "relative" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell size={20} style={{ color: "#f59e0b" }} />
              </div>
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#f87171", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.textPrimary }}>{T.notificationsCenter}</h1>
              <p style={{ fontSize: 11, color: isDark ? "rgba(245,158,11,0.5)" : "#64748b", margin: 0 }}>
                {unreadCount} {T.unreadCountSuffix}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Globe size={13} /> {lang === "ar" ? "EN" : "عر"}
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <Eye size={13}/> {T.readAllBtn}
              </button>
            )}
            <button onClick={clearRead} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Trash2 size={13}/> {T.clearReadBtn}
            </button>
            <button onClick={load} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f59e0b" }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", display: "flex", gap: 0, borderTop: `1px solid ${C.tableBorder}` }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.k} onClick={() => setFilter(tab.k)} style={{
              padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: "none", background: "none",
              color: filter === tab.k ? "#f59e0b" : C.textMuted,
              borderBottom: `2px solid ${filter === tab.k ? "#f59e0b" : "transparent"}`,
              transition: "all 0.2s",
            }}>{tab.l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: C.textMuted }}>{T.loading}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <Bell size={40} style={{ color: C.textMuted, marginBottom: 16 }} />
            <div style={{ color: C.textMuted, fontSize: 14 }}>{T.noNotifications}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((notif, i) => {
              const cfg = SEV_CFG[notif.severity] ?? SEV_CFG.info;
              const label = SEV_LABELS[notif.severity] ?? notif.severity;
              return (
                <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  style={{
                    background: notif.is_read ? C.cardBg : cfg.bg,
                    border: `1px solid ${notif.is_read ? C.cardBorder : cfg.color + "33"}`,
                    borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14,
                    opacity: notif.is_read ? 0.7 : 1, transition: "all 0.2s",
                    boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: cfg.color }}>
                    {SEV_ICONS[notif.severity] ?? SEV_ICONS.info}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{notif.title}</span>
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>{label}</span>
                      {!notif.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`, flexShrink: 0 }} />}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{notif.message}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.textMuted }}>
                      {notif.company_name && <span>🏢 {notif.company_name}</span>}
                      <span>🕐 {new Date(notif.created_at).toLocaleString(lang === "ar" ? "ar-IQ" : "en-US", { hour12: false })}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!notif.is_read && (
                      <button onClick={() => markRead(notif.id)} title={T.markAsReadBtn}
                        style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Eye size={13} />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(notif.id)} title={T.deleteBtn}
                      style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
