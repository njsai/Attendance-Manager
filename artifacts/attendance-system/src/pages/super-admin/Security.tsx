import { useState, useEffect, useCallback } from "react";
import {
  Shield, AlertTriangle, Lock, Unlock, Users, Activity,
  Eye, CheckCircle, XCircle, RefreshCw, ChevronLeft, Clock,
  Globe, Smartphone, Monitor, LogOut, FileText, Bell
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

interface SecuritySummary {
  openEvents: number;
  failedLogins24h: number;
  lockedAccounts: number;
  activeSessions: number;
}

interface SecurityEvent {
  id: number;
  company_id: number | null;
  company_name: string | null;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  ip_address: string | null;
  user_name: string | null;
  resolved: boolean;
  created_at: string;
}

interface AuditLog {
  id: number;
  company_name: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  resource: string;
  ip_address: string | null;
  status: string;
  created_at: string;
}

interface LoginStats {
  stats: { successful: string; failed: string; unique_ips: string; last_24h: string };
  topIps: { ip_address: string; attempts: string; failures: string }[];
  recentFails: { ip_address: string; username: string; created_at: string }[];
}

interface LockedAccount {
  id: number;
  full_name: string;
  username: string;
  failed_login_attempts: number;
  locked_until: string | null;
  company_name: string;
  company_id: number;
}

interface ActiveSession {
  session_id: string;
  full_name: string | null;
  username: string | null;
  company_name: string | null;
  ip_address: string;
  device_name: string;
  last_active_at: string;
  created_at: string;
}

const SEVERITY_CONFIG = {
  low: { label: "منخفض", cls: "", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
  medium: { label: "متوسط", cls: "", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  high: { label: "عالي", cls: "", color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" },
  critical: { label: "حرج", cls: "", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
}

function SeverityBadge({ s }: { s: string }) {
  const cfg = SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>;
}

type Tab = "overview" | "events" | "audit" | "sessions" | "locked";

export default function SecurityDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loginStats, setLoginStats] = useState<LoginStats | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [locked, setLocked] = useState<LockedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const showMsg = (msg: string) => { setFeedback(msg); setTimeout(() => setFeedback(null), 3000); };

  const loadSummary = useCallback(async () => {
    try { setSummary(await apiFetch("api/security/summary")); } catch { }
  }, []);

  const loadTabData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === "overview") {
        const [sum, stats] = await Promise.all([
          apiFetch("api/security/summary"),
          apiFetch("api/security/login-stats"),
        ]);
        setSummary(sum);
        setLoginStats(stats);
      } else if (t === "events") {
        setEvents(await apiFetch("api/security/events?limit=100"));
      } else if (t === "audit") {
        const d = await apiFetch("api/security/audit-logs?limit=100");
        setAudit(d.logs);
      } else if (t === "sessions") {
        setSessions(await apiFetch("api/security/sessions"));
      } else if (t === "locked") {
        setLocked(await apiFetch("api/security/locked-accounts"));
      }
    } catch (e: any) { showMsg(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTabData(tab); }, [tab, loadTabData]);
  useEffect(() => {
    loadSummary();
    const iv = setInterval(loadSummary, 30000);
    return () => clearInterval(iv);
  }, [loadSummary]);

  const resolveEvent = async (id: number) => {
    try {
      await apiFetch(`api/security/events/${id}/resolve`, { method: "PUT" });
      setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
      showMsg("تم حل الحادثة");
      loadSummary();
    } catch (e: any) { showMsg(e.message); }
  };

  const unlockAccount = async (empId: number) => {
    try {
      await apiFetch(`api/security/unlock/${empId}`, { method: "POST" });
      setLocked(prev => prev.filter(l => l.id !== empId));
      showMsg("تم فتح قفل الحساب");
      loadSummary();
    } catch (e: any) { showMsg(e.message); }
  };

  const terminateSession = async (sid: string) => {
    try {
      await apiFetch(`api/security/sessions/${encodeURIComponent(sid)}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      showMsg("تم إنهاء الجلسة");
      loadSummary();
    } catch (e: any) { showMsg(e.message); }
  };

  const filteredEvents = severityFilter === "all"
    ? events
    : events.filter(e => e.severity === severityFilter);

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "نظرة عامة", icon: Activity },
    { id: "events", label: "الحوادث الأمنية", icon: AlertTriangle, badge: summary?.openEvents },
    { id: "audit", label: "سجل التدقيق", icon: FileText },
    { id: "sessions", label: "الجلسات النشطة", icon: Users, badge: summary?.activeSessions },
    { id: "locked", label: "حسابات مقفلة", icon: Lock, badge: summary?.lockedAccounts },
  ];

  const nCard = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.08)", borderRadius: 16, padding: 16 };
  const loadingEl = <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>جاري التحميل...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#020817" }} dir="rtl">
      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(0,245,255,0.07)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} style={{ color: "#10b981" }} />
            </div>
            <div>
              <h1 style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0 }}>مركز الأمان</h1>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>مراقبة شاملة للنظام</p>
            </div>
          </div>
          <button onClick={() => loadTabData(tab)} style={{ padding: 8, borderRadius: 10, background: "none", border: "1px solid rgba(0,245,255,0.1)", cursor: "pointer", color: "rgba(0,245,255,0.5)" }}>
            <RefreshCw size={16} />
          </button>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 0", display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", fontSize: 12, fontWeight: 600, borderRadius: "10px 10px 0 0", whiteSpace: "nowrap", cursor: "pointer", background: active ? "rgba(0,245,255,0.06)" : "transparent", border: "none", borderBottom: active ? "2px solid #00f5ff" : "2px solid transparent", color: active ? "#00f5ff" : "rgba(255,255,255,0.4)", transition: "all 0.15s", fontFamily: "'Tajawal', sans-serif" }}>
                <Icon size={13} />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span style={{ background: "#f87171", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px" }}>{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {feedback && (
          <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", borderRadius: 12, fontSize: 13, textAlign: "center" }}>{feedback}</div>
        )}

        {/* ── Overview Tab ─────────────────────────────── */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "حوادث مفتوحة (7 أيام)", value: summary?.openEvents ?? 0, icon: AlertTriangle, iconColor: "#f87171", glow: "rgba(248,113,113,0.12)", warn: (summary?.openEvents ?? 0) > 0 },
                { label: "فشل تسجيل الدخول (24س)", value: summary?.failedLogins24h ?? 0, icon: XCircle, iconColor: "#f97316", glow: "rgba(249,115,22,0.12)", warn: (summary?.failedLogins24h ?? 0) > 10 },
                { label: "حسابات مقفلة", value: summary?.lockedAccounts ?? 0, icon: Lock, iconColor: "#f59e0b", glow: "rgba(245,158,11,0.12)", warn: (summary?.lockedAccounts ?? 0) > 0 },
                { label: "جلسات نشطة (1س)", value: summary?.activeSessions ?? 0, icon: Users, iconColor: "#10b981", glow: "rgba(16,185,129,0.12)" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.warn ? "rgba(248,113,113,0.25)" : "rgba(0,245,255,0.07)"}`, borderRadius: 14, padding: "14px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: s.glow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <s.icon size={18} style={{ color: s.iconColor }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: s.warn ? "#f87171" : "#fff" }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div style={nCard}>
                <h3 style={{ color: "#10b981", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                  <Shield size={14} /> طبقات الحماية المفعّلة
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["تشفير كلمات المرور (bcrypt 12 rounds)", "حظر IP بعد 20 محاولة فاشلة", "قفل الحساب بعد 5 محاولات", "Security Headers (Helmet.js)", "Rate Limiting (500 req/15min)", "CSRF Protection (SameSite + Origin Check)", "Session Expiration (8 ساعات)", "Audit Log لكل العمليات", "Tenant Isolation (company_id)", "SQL Injection Prevention (Drizzle ORM)", "XSS Prevention (Input Sanitization)", "Device Tracking & Session Management"].map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={13} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {loginStats && (
                <div style={nCard}>
                  <h3 style={{ color: "#00f5ff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                    <Activity size={14} /> إحصائيات تسجيل الدخول
                  </h3>
                  <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 14 }}>
                    {[
                      { label: "ناجح (إجمالي)", value: loginStats.stats.successful, color: "#10b981" },
                      { label: "فاشل (إجمالي)", value: loginStats.stats.failed, color: "#f87171" },
                      { label: "IPs فريدة", value: loginStats.stats.unique_ips, color: "#00f5ff" },
                      { label: "آخر 24 ساعة", value: loginStats.stats.last_24h, color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {loginStats.topIps.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>أعلى IPs بمحاولات الدخول (24س)</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {loginStats.topIps.slice(0, 5).map((ip, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: "7px 10px" }}>
                            <span style={{ color: "#fff", fontFamily: "monospace" }}>{ip.ip_address}</span>
                            <div style={{ display: "flex", gap: 12 }}>
                              <span style={{ color: "#10b981" }}>{ip.attempts} طلب</span>
                              {Number(ip.failures) > 0 && <span style={{ color: "#f87171" }}>{ip.failures} فشل</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Security Events Tab ──────────────────────── */}
        {tab === "events" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 16, flex: 1, margin: 0 }}>الحوادث الأمنية</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["all", "critical", "high", "medium", "low"].map(s => {
                  const cfg = SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG];
                  const active = severityFilter === s;
                  return (
                    <button key={s} onClick={() => setSeverityFilter(s)}
                      style={{ padding: "5px 12px", borderRadius: 9, border: active ? `1px solid ${cfg?.border ?? "rgba(0,245,255,0.3)"}` : "1px solid rgba(255,255,255,0.07)", background: active ? (cfg?.bg ?? "rgba(0,245,255,0.08)") : "rgba(255,255,255,0.03)", color: active ? (cfg?.color ?? "#00f5ff") : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                      {s === "all" ? "الكل" : cfg?.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {loading ? loadingEl : filteredEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(16,185,129,0.1)" }}>
                <Shield size={40} style={{ margin: "0 auto 12px", color: "#10b981", opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>لا توجد حوادث</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredEvents.map(ev => {
                  const cfg = SEVERITY_CONFIG[ev.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
                  return (
                    <div key={ev.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${cfg.border}`, borderRadius: 13, padding: "12px 14px", opacity: ev.resolved ? 0.5 : 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <AlertTriangle size={16} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
                            <SeverityBadge s={ev.severity} />
                            {ev.company_name && <span style={{ fontSize: 10, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", padding: "1px 7px", borderRadius: 20 }}>{ev.company_name}</span>}
                            {ev.resolved && <span style={{ fontSize: 10, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "1px 7px", borderRadius: 20 }}>تم الحل</span>}
                          </div>
                          <p style={{ color: "#fff", fontSize: 13 }}>{ev.description}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            {ev.ip_address && <span style={{ fontFamily: "monospace" }}>{ev.ip_address}</span>}
                            <span>{formatTime(ev.created_at)}</span>
                          </div>
                        </div>
                        {!ev.resolved && (
                          <button onClick={() => resolveEvent(ev.id)}
                            style={{ flexShrink: 0, padding: "5px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                            حل الحادثة
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Audit Log Tab ────────────────────────────── */}
        {tab === "audit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0 }}>سجل التدقيق</h2>
            {loading ? loadingEl : (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(0,245,255,0.07)", background: "rgba(0,245,255,0.03)" }}>
                        {["الوقت", "الشركة", "المستخدم", "الدور", "العملية", "المورد", "IP", "الحالة"].map(h => (
                          <th key={h} style={{ textAlign: "right", padding: "11px 12px", color: "rgba(0,245,255,0.5)", fontWeight: 600, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((log, i) => (
                        <tr key={log.id} style={{ borderBottom: i < audit.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{formatTime(log.created_at)}</td>
                          <td style={{ padding: "9px 12px", color: "#fff", whiteSpace: "nowrap" }}>{log.company_name ?? "—"}</td>
                          <td style={{ padding: "9px 12px", color: "#fff", whiteSpace: "nowrap" }}>{log.user_name ?? "—"}</td>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 10, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", padding: "2px 8px", borderRadius: 8 }}>{log.user_role ?? "—"}</span>
                          </td>
                          <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.action}</td>
                          <td style={{ padding: "9px 12px", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{log.resource}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{log.ip_address ?? "—"}</td>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, color: log.status === "success" ? "#10b981" : "#f87171", background: log.status === "success" ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)" }}>
                              {log.status === "success" ? "نجاح" : "فشل"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {audit.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>لا توجد سجلات</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sessions Tab ─────────────────────────────── */}
        {tab === "sessions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0 }}>الجلسات النشطة</h2>
            {loading ? loadingEl : sessions.length === 0 ? (
              <div style={{ textAlign: "center", ...nCard, color: "rgba(255,255,255,0.3)", fontSize: 13, paddingTop: "50px", paddingBottom: "50px" }}>لا توجد جلسات نشطة</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map(s => (
                  <div key={s.session_id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 13, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {s.device_name?.includes("محمول") ? <Smartphone size={16} style={{ color: "#00f5ff" }} /> : <Monitor size={16} style={{ color: "#00f5ff" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{s.full_name ?? "سوبر ادمن"}</span>
                        {s.username && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>({s.username})</span>}
                        {s.company_name && <span style={{ fontSize: 10, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", padding: "1px 7px", borderRadius: 20 }}>{s.company_name}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Globe size={10} />{s.ip_address}</span>
                        <span>{s.device_name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{formatTime(s.last_active_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => terminateSession(s.session_id)}
                      style={{ flexShrink: 0, padding: "6px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Tajawal', sans-serif" }}>
                      <LogOut size={11} /> إنهاء
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Locked Accounts Tab ──────────────────────── */}
        {tab === "locked" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 16, margin: 0 }}>الحسابات المقفلة</h2>
            {loading ? loadingEl : locked.length === 0 ? (
              <div style={{ textAlign: "center", ...nCard, paddingTop: "50px", paddingBottom: "50px" }}>
                <CheckCircle size={40} style={{ margin: "0 auto 12px", color: "#10b981", opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>لا توجد حسابات مقفلة</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {locked.map(acc => (
                  <div key={acc.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 13, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Lock size={16} style={{ color: "#f97316" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{acc.full_name}</span>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>({acc.username})</span>
                        <span style={{ fontSize: 10, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", padding: "1px 7px", borderRadius: 20 }}>{acc.company_name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 11 }}>
                        <span style={{ color: "#f87171" }}>{acc.failed_login_attempts} محاولة فاشلة</span>
                        {acc.locked_until && <span style={{ color: "rgba(255,255,255,0.35)" }}>مقفل حتى: {formatTime(acc.locked_until)}</span>}
                      </div>
                    </div>
                    <button onClick={() => unlockAccount(acc.id)}
                      style={{ flexShrink: 0, padding: "6px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Tajawal', sans-serif" }}>
                      <Unlock size={11} /> فتح القفل
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
