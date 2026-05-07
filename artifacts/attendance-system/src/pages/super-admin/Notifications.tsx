import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Bell, CheckCircle, AlertTriangle, XCircle, Info,
  Trash2, ChevronLeft, RefreshCw, Eye, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

interface Notification {
  id: number; type: string; severity: "info" | "warning" | "error" | "success";
  title: string; message: string; company_name: string | null;
  is_read: boolean; created_at: string;
}

const SEVERITY_CONFIG = {
  info:    { color: "#00f5ff", bg: "rgba(0,245,255,0.08)", icon: <Info size={16}/>, label: "معلومة" },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: <AlertTriangle size={16}/>, label: "تحذير" },
  error:   { color: "#f87171", bg: "rgba(248,113,113,0.08)", icon: <XCircle size={16}/>, label: "خطأ" },
  success: { color: "#10b981", bg: "rgba(16,185,129,0.08)", icon: <CheckCircle size={16}/>, label: "نجاح" },
};

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
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
      showMsg("تم تحديد الكل كمقروء");
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
    if (!confirm("حذف كل الإشعارات المقروءة؟")) return;
    try {
      await apiFetch("api/super-admin/notifications/clear-read", { method: "DELETE" });
      setNotifications(prev => prev.filter(n => !n.is_read));
      showMsg("تم مسح الإشعارات المقروءة");
    } catch {}
  };

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "warning" || filter === "error" || filter === "success") return n.severity === filter;
    return true;
  });

  const s = { fontFamily: "'Tajawal', sans-serif", color: "#fff" };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "linear-gradient(135deg,#020817,#050d1f,#080318)", ...s }}>
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100,
              background: "rgba(16,185,129,0.9)", color: "#fff", padding: "10px 24px",
              borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ background: "rgba(2,8,23,0.9)", borderBottom: "1px solid rgba(245,158,11,0.15)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setLocation("/super-admin")} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
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
              <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>مركز الإشعارات</h1>
              <p style={{ fontSize: 11, color: "rgba(245,158,11,0.5)", margin: 0 }}>
                {unreadCount} إشعار غير مقروء
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <Eye size={13}/> قراءة الكل
              </button>
            )}
            <button onClick={clearRead} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Trash2 size={13}/> مسح المقروء
            </button>
            <button onClick={load} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#f59e0b" }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px", display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {([
            { k: "all", l: "الكل" },
            { k: "unread", l: "غير مقروء" },
            { k: "warning", l: "تحذيرات" },
            { k: "error", l: "أخطاء" },
            { k: "success", l: "نجاح" },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setFilter(t.k)} style={{
              padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: "none", background: "none",
              color: filter === t.k ? "#f59e0b" : "rgba(255,255,255,0.3)",
              borderBottom: `2px solid ${filter === t.k ? "#f59e0b" : "transparent"}`,
              transition: "all 0.2s",
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "rgba(255,255,255,0.3)" }}>جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <Bell size={40} style={{ color: "rgba(255,255,255,0.1)", marginBottom: 16 }} />
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>لا توجد إشعارات</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((notif, i) => {
              const cfg = SEVERITY_CONFIG[notif.severity] ?? SEVERITY_CONFIG.info;
              return (
                <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  style={{
                    background: notif.is_read ? "rgba(255,255,255,0.02)" : cfg.bg,
                    border: `1px solid ${notif.is_read ? "rgba(255,255,255,0.06)" : cfg.color + "33"}`,
                    borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14,
                    opacity: notif.is_read ? 0.65 : 1, transition: "all 0.2s",
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: cfg.color }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{notif.title}</span>
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>{cfg.label}</span>
                      {!notif.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{notif.message}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                      {notif.company_name && <span>🏢 {notif.company_name}</span>}
                      <span>🕐 {new Date(notif.created_at).toLocaleString("ar-IQ", { hour12: false })}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!notif.is_read && (
                      <button onClick={() => markRead(notif.id)} title="تحديد كمقروء"
                        style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Eye size={13} />
                      </button>
                    )}
                    <button onClick={() => deleteNotif(notif.id)} title="حذف"
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
