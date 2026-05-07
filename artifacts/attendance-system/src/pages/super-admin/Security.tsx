import { useState, useEffect, useCallback } from "react";
import {
  Shield, AlertTriangle, Lock, Unlock, Users, Activity,
  Eye, CheckCircle, XCircle, RefreshCw, ChevronLeft, Clock,
  Globe, Smartphone, Monitor, LogOut, FileText, Bell
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { SA_T, getSAColors } from "@/lib/sa-utils";

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
  low:      { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.25)"  },
  medium:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
  high:     { color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)"  },
  critical: { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
};

function formatTime(iso: string, locale = "ar-IQ") {
  return new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
}

function SeverityBadge({ s, label }: { s: string; label: string }) {
  const cfg = SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{label}</span>;
}

type Tab = "overview" | "events" | "audit" | "sessions" | "locked";

export default function SecurityDashboard() {
  const { lang, dir, setLang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = getSAColors(isDark);
  const T = SA_T[lang];
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

  // TABS defined below after T is in scope

  const nCard = { background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0"}`, borderRadius: 16, padding: 16 };
  const loadingEl = <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted, fontSize: 13 }}>{T.loading}</div>;

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: T.overviewTab2, icon: Activity },
    { id: "events",   label: T.securityEvents, icon: AlertTriangle, badge: summary?.openEvents },
    { id: "audit",    label: T.auditLogs, icon: FileText },
    { id: "sessions", label: T.sessions, icon: Users, badge: summary?.activeSessions },
    { id: "locked",   label: T.lockedAccountsTab, icon: Lock, badge: summary?.lockedAccounts },
  ];

  const SEV_LABELS: Record<string, string> = {
    low: T.lowSev, medium: T.mediumSev, high: T.highSev, critical: T.criticalSev,
  };

  const timeLocale = lang === "ar" ? "ar-IQ" : "en-US";

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#020817" : "#f0f4f8", fontFamily: "'Tajawal', sans-serif", color: C.textPrimary }} dir={dir}>
      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${C.headerBorder}`, backdropFilter: isDark ? "blur(12px)" : "none", position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} style={{ color: "#10b981" }} />
            </div>
            <div>
              <h1 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 16, margin: 0 }}>{T.securityCenter}</h1>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{T.securitySubtitle}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Globe size={13} /> {lang === "ar" ? "EN" : "عر"}
            </button>
            <button onClick={() => loadTabData(tab)} style={{ padding: 8, borderRadius: 10, background: "none", border: `1px solid ${C.cardBorder}`, cursor: "pointer", color: C.textSecondary }}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 0", display: "flex", gap: 4, overflowX: "auto" }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", fontSize: 12, fontWeight: 600, borderRadius: "10px 10px 0 0", whiteSpace: "nowrap", cursor: "pointer", background: active ? "rgba(0,245,255,0.06)" : "transparent", border: "none", borderBottom: active ? "2px solid #00f5ff" : "2px solid transparent", color: active ? "#00f5ff" : C.textMuted, transition: "all 0.15s", fontFamily: "'Tajawal', sans-serif" }}>
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
                { label: T.openEvents7d,        value: summary?.openEvents ?? 0,      icon: AlertTriangle, iconColor: "#f87171", glow: "rgba(248,113,113,0.12)", warn: (summary?.openEvents ?? 0) > 0 },
                { label: T.failedLogins24h,     value: summary?.failedLogins24h ?? 0, icon: XCircle,       iconColor: "#f97316", glow: "rgba(249,115,22,0.12)",  warn: (summary?.failedLogins24h ?? 0) > 10 },
                { label: T.lockedAccountsLabel, value: summary?.lockedAccounts ?? 0,  icon: Lock,          iconColor: "#f59e0b", glow: "rgba(245,158,11,0.12)",  warn: (summary?.lockedAccounts ?? 0) > 0 },
                { label: T.activeSessions1h,    value: summary?.activeSessions ?? 0,  icon: Users,         iconColor: "#10b981", glow: "rgba(16,185,129,0.12)" },
              ].map(s => (
                <div key={s.label} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${s.warn ? "rgba(248,113,113,0.25)" : isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0"}`, borderRadius: 14, padding: "14px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: s.glow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <s.icon size={18} style={{ color: s.iconColor }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: s.warn ? "#f87171" : C.textPrimary }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div style={nCard}>
                <h3 style={{ color: "#10b981", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                  <Shield size={14} /> {T.activeProtectionLayers}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {T.protectionFeatures.map((f: string) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={13} style={{ color: "#10b981", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {loginStats && (
                <div style={nCard}>
                  <h3 style={{ color: "#00f5ff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                    <Activity size={14} /> {T.loginStats}
                  </h3>
                  <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 14 }}>
                    {[
                      { label: T.successfulTotal, value: loginStats.stats.successful, color: "#10b981" },
                      { label: T.failedTotal,     value: loginStats.stats.failed,     color: "#f87171" },
                      { label: T.uniqueIPs,       value: loginStats.stats.unique_ips, color: "#00f5ff" },
                      { label: T.last24h,         value: loginStats.stats.last_24h,   color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9", borderRadius: 11, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {loginStats.topIps.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{T.topIPs24h}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {loginStats.topIps.slice(0, 5).map((ip, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, background: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9", borderRadius: 9, padding: "7px 10px" }}>
                            <span style={{ color: C.textPrimary, fontFamily: "monospace" }}>{ip.ip_address}</span>
                            <div style={{ display: "flex", gap: 12 }}>
                              <span style={{ color: "#10b981" }}>{ip.attempts} {T.requests}</span>
                              {Number(ip.failures) > 0 && <span style={{ color: "#f87171" }}>{ip.failures} {T.failedLabel}</span>}
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
              <h2 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 16, flex: 1, margin: 0 }}>{T.securityEvents}</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["all", "critical", "high", "medium", "low"] as const).map(s => {
                  const cfg = SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG];
                  const active = severityFilter === s;
                  const label = s === "all" ? T.allFilter : SEV_LABELS[s];
                  return (
                    <button key={s} onClick={() => setSeverityFilter(s)}
                      style={{ padding: "5px 12px", borderRadius: 9, border: active ? `1px solid ${cfg?.border ?? "rgba(0,245,255,0.3)"}` : `1px solid ${C.cardBorder}`, background: active ? (cfg?.bg ?? "rgba(0,245,255,0.08)") : C.cardBg, color: active ? (cfg?.color ?? "#00f5ff") : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {loading ? loadingEl : filteredEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", background: isDark ? "rgba(255,255,255,0.02)" : "#fff", borderRadius: 16, border: `1px solid ${isDark ? "rgba(16,185,129,0.1)" : "#e2e8f0"}` }}>
                <Shield size={40} style={{ margin: "0 auto 12px", color: "#10b981", opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: C.textMuted }}>{T.noEvents}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredEvents.map(ev => {
                  const cfg = SEVERITY_CONFIG[ev.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
                  return (
                    <div key={ev.id} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${cfg.border}`, borderRadius: 13, padding: "12px 14px", opacity: ev.resolved ? 0.5 : 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <AlertTriangle size={16} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 5 }}>
                            <SeverityBadge s={ev.severity} label={SEV_LABELS[ev.severity] ?? ev.severity} />
                            {ev.company_name && <span style={{ fontSize: 10, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", padding: "1px 7px", borderRadius: 20 }}>{ev.company_name}</span>}
                            {ev.resolved && <span style={{ fontSize: 10, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "1px 7px", borderRadius: 20 }}>{T.resolved}</span>}
                          </div>
                          <p style={{ color: C.textPrimary, fontSize: 13 }}>{ev.description}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 11, color: C.textMuted }}>
                            {ev.ip_address && <span style={{ fontFamily: "monospace" }}>{ev.ip_address}</span>}
                            <span>{formatTime(ev.created_at, timeLocale)}</span>
                          </div>
                        </div>
                        {!ev.resolved && (
                          <button onClick={() => resolveEvent(ev.id)}
                            style={{ flexShrink: 0, padding: "5px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                            {T.resolveEvent}
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
            <h2 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 16, margin: 0 }}>{T.auditLogs}</h2>
            {loading ? loadingEl : (
              <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0"}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0"}`, background: isDark ? "rgba(0,245,255,0.03)" : "#f8fafc" }}>
                        {[T.timeCol, T.companyCol, T.userCol, T.roleCol, T.actionCol, T.resourceCol, "IP", T.statusCol].map(h => (
                          <th key={h} style={{ textAlign: dir === "rtl" ? "right" : "left", padding: "11px 12px", color: "#00f5ff", fontWeight: 600, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((log, i) => (
                        <tr key={log.id} style={{ borderBottom: i < audit.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` : "none" }}>
                          <td style={{ padding: "9px 12px", color: C.textMuted, whiteSpace: "nowrap" }}>{formatTime(log.created_at, timeLocale)}</td>
                          <td style={{ padding: "9px 12px", color: C.textPrimary, whiteSpace: "nowrap" }}>{log.company_name ?? "—"}</td>
                          <td style={{ padding: "9px 12px", color: C.textPrimary, whiteSpace: "nowrap" }}>{log.user_name ?? "—"}</td>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 10, background: isDark ? "rgba(255,255,255,0.07)" : "#f1f5f9", color: C.textSecondary, padding: "2px 8px", borderRadius: 8 }}>{log.user_role ?? "—"}</span>
                          </td>
                          <td style={{ padding: "9px 12px", color: C.textSecondary, fontFamily: "monospace", whiteSpace: "nowrap" }}>{log.action}</td>
                          <td style={{ padding: "9px 12px", color: C.textMuted, whiteSpace: "nowrap" }}>{log.resource}</td>
                          <td style={{ padding: "9px 12px", fontFamily: "monospace", color: C.textMuted, whiteSpace: "nowrap" }}>{log.ip_address ?? "—"}</td>
                          <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, color: log.status === "success" ? "#10b981" : "#f87171", background: log.status === "success" ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)" }}>
                              {log.status === "success" ? T.successLabel : T.failedLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {audit.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: C.textMuted }}>{T.noRecords}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sessions Tab ─────────────────────────────── */}
        {tab === "sessions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 16, margin: 0 }}>{T.activeSessions2}</h2>
            {loading ? loadingEl : sessions.length === 0 ? (
              <div style={{ textAlign: "center", ...nCard, color: C.textMuted, fontSize: 13, paddingTop: "50px", paddingBottom: "50px" }}>{T.noSessions}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map(s => (
                  <div key={s.session_id} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0"}`, borderRadius: 13, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Monitor size={16} style={{ color: "#00f5ff" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: 13 }}>{s.full_name ?? T.superAdmin}</span>
                        {s.username && <span style={{ color: C.textMuted, fontSize: 11 }}>({s.username})</span>}
                        {s.company_name && <span style={{ fontSize: 10, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", padding: "1px 7px", borderRadius: 20 }}>{s.company_name}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 11, color: C.textMuted }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Globe size={10} />{s.ip_address}</span>
                        <span>{s.device_name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Clock size={10} />{formatTime(s.last_active_at, timeLocale)}</span>
                      </div>
                    </div>
                    <button onClick={() => terminateSession(s.session_id)}
                      style={{ flexShrink: 0, padding: "6px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Tajawal', sans-serif" }}>
                      <LogOut size={11} /> {T.terminateSession}
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
            <h2 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 16, margin: 0 }}>{T.lockedAccountsTitle}</h2>
            {loading ? loadingEl : locked.length === 0 ? (
              <div style={{ textAlign: "center", ...nCard, paddingTop: "50px", paddingBottom: "50px" }}>
                <CheckCircle size={40} style={{ margin: "0 auto 12px", color: "#10b981", opacity: 0.4 }} />
                <p style={{ fontSize: 13, color: C.textMuted }}>{T.noLockedAccounts}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {locked.map(acc => (
                  <div key={acc.id} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 13, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Lock size={16} style={{ color: "#f97316" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: 13 }}>{acc.full_name}</span>
                        <span style={{ color: C.textMuted, fontSize: 11 }}>({acc.username})</span>
                        <span style={{ fontSize: 10, color: "#a855f7", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", padding: "1px 7px", borderRadius: 20 }}>{acc.company_name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, fontSize: 11 }}>
                        <span style={{ color: "#f87171" }}>{acc.failed_login_attempts} {T.failedAttempts}</span>
                        {acc.locked_until && <span style={{ color: C.textMuted }}>{T.lockedUntil}: {formatTime(acc.locked_until, timeLocale)}</span>}
                      </div>
                    </div>
                    <button onClick={() => unlockAccount(acc.id)}
                      style={{ flexShrink: 0, padding: "6px 12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "'Tajawal', sans-serif" }}>
                      <Unlock size={11} /> {T.unlockAccount}
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
