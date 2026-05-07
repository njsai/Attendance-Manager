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
  low: { label: "منخفض", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  medium: { label: "متوسط", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  high: { label: "عالي", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  critical: { label: "حرج", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
}

function SeverityBadge({ s }: { s: string }) {
  const cfg = SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>{cfg.label}</span>;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900" dir="rtl">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600/20 border border-green-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">مركز الأمان</h1>
              <p className="text-slate-400 text-xs">مراقبة شاملة للنظام</p>
            </div>
          </div>
          <button onClick={() => loadTabData(tab)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all border-b-2 ${
                  active ? "border-green-500 text-white bg-white/5" : "border-transparent text-slate-400 hover:text-white"
                }`}>
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[1.2rem] text-center">{t.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Feedback */}
        {feedback && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm text-center">{feedback}</div>
        )}

        {/* ── Overview Tab ─────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "حوادث مفتوحة (7 أيام)", value: summary?.openEvents ?? 0, icon: AlertTriangle, color: "red", warn: (summary?.openEvents ?? 0) > 0 },
                { label: "فشل تسجيل الدخول (24س)", value: summary?.failedLogins24h ?? 0, icon: XCircle, color: "orange", warn: (summary?.failedLogins24h ?? 0) > 10 },
                { label: "حسابات مقفلة", value: summary?.lockedAccounts ?? 0, icon: Lock, color: "yellow", warn: (summary?.lockedAccounts ?? 0) > 0 },
                { label: "جلسات نشطة (1س)", value: summary?.activeSessions ?? 0, icon: Users, color: "green" },
              ].map(s => (
                <div key={s.label} className={`bg-white/5 border ${s.warn ? "border-red-500/30" : "border-white/10"} rounded-2xl p-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 text-${s.color}-400`} />
                    </div>
                    <div>
                      <div className={`text-3xl font-bold ${s.warn ? "text-red-400" : "text-white"}`}>{s.value}</div>
                      <div className="text-xs text-slate-400">{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Features Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" /> طبقات الحماية المفعّلة
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: "تشفير كلمات المرور (bcrypt 12 rounds)", status: true },
                    { label: "حظر IP بعد 20 محاولة فاشلة", status: true },
                    { label: "قفل الحساب بعد 5 محاولات", status: true },
                    { label: "Security Headers (Helmet.js)", status: true },
                    { label: "Rate Limiting (500 req/15min)", status: true },
                    { label: "CSRF Protection (SameSite + Origin Check)", status: true },
                    { label: "Session Expiration (8 ساعات)", status: true },
                    { label: "Audit Log لكل العمليات", status: true },
                    { label: "Tenant Isolation (company_id)", status: true },
                    { label: "SQL Injection Prevention (Drizzle ORM)", status: true },
                    { label: "XSS Prevention (Input Sanitization)", status: true },
                    { label: "Device Tracking & Session Management", status: true },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300 text-sm">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Login stats */}
              {loginStats && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" /> إحصائيات تسجيل الدخول
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[
                      { label: "ناجح (إجمالي)", value: loginStats.stats.successful, color: "text-green-400" },
                      { label: "فاشل (إجمالي)", value: loginStats.stats.failed, color: "text-red-400" },
                      { label: "IPs فريدة", value: loginStats.stats.unique_ips, color: "text-blue-400" },
                      { label: "آخر 24 ساعة", value: loginStats.stats.last_24h, color: "text-yellow-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {loginStats.topIps.length > 0 && (
                    <div>
                      <p className="text-slate-400 text-xs mb-2">أعلى IPs بمحاولات الدخول (24س)</p>
                      <div className="space-y-1">
                        {loginStats.topIps.slice(0, 5).map((ip, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                            <span className="text-white font-mono">{ip.ip_address}</span>
                            <div className="flex gap-3">
                              <span className="text-green-400">{ip.attempts} طلب</span>
                              {Number(ip.failures) > 0 && <span className="text-red-400">{ip.failures} فشل</span>}
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

        {/* ── Security Events Tab ──────────────────────────────────── */}
        {tab === "events" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-white font-bold text-lg flex-1">الحوادث الأمنية</h2>
              <div className="flex gap-2 flex-wrap">
                {["all", "critical", "high", "medium", "low"].map(s => (
                  <button key={s} onClick={() => setSeverityFilter(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${severityFilter === s ? "bg-white/20 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                    {s === "all" ? "الكل" : SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG]?.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                <Shield className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400">لا توجد حوادث {severityFilter !== "all" ? `من نوع ${SEVERITY_CONFIG[severityFilter as keyof typeof SEVERITY_CONFIG]?.label}` : ""}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(ev => (
                  <div key={ev.id} className={`bg-white/5 border rounded-xl p-4 ${ev.resolved ? "opacity-50" : "border-white/10"}`}>
                    <div className="flex items-start gap-4">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${ev.severity === "critical" ? "text-red-400" : ev.severity === "high" ? "text-orange-400" : "text-yellow-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <SeverityBadge s={ev.severity} />
                          {ev.company_name && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{ev.company_name}</span>}
                          {ev.resolved && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">تم الحل</span>}
                        </div>
                        <p className="text-white text-sm">{ev.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          {ev.ip_address && <span className="font-mono">{ev.ip_address}</span>}
                          <span>{formatTime(ev.created_at)}</span>
                        </div>
                      </div>
                      {!ev.resolved && (
                        <button onClick={() => resolveEvent(ev.id)}
                          className="flex-shrink-0 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-all">
                          حل الحادثة
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Audit Log Tab ────────────────────────────────────────── */}
        {tab === "audit" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">سجل التدقيق</h2>
            {loading ? (
              <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        {["الوقت", "الشركة", "المستخدم", "الدور", "العملية", "المورد", "IP", "الحالة"].map(h => (
                          <th key={h} className="text-right px-4 py-3 text-slate-400 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {audit.map(log => (
                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{formatTime(log.created_at)}</td>
                          <td className="px-4 py-3 text-white whitespace-nowrap">{log.company_name ?? "—"}</td>
                          <td className="px-4 py-3 text-white whitespace-nowrap">{log.user_name ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs bg-white/10 text-slate-300 px-2 py-0.5 rounded">{log.user_role ?? "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono text-xs whitespace-nowrap">{log.action}</td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{log.resource}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{log.ip_address ?? "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                              {log.status === "success" ? "نجاح" : "فشل"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {audit.length === 0 && (
                    <div className="text-center py-10 text-slate-400">لا توجد سجلات</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sessions Tab ─────────────────────────────────────────── */}
        {tab === "sessions" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">الجلسات النشطة</h2>
            {loading ? (
              <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10 text-slate-400">لا توجد جلسات نشطة</div>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.session_id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      {s.device_name?.includes("محمول") ? <Smartphone className="w-5 h-5 text-blue-400" /> : <Monitor className="w-5 h-5 text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{s.full_name ?? "سوبر ادمن"}</span>
                        {s.username && <span className="text-slate-400 text-xs">({s.username})</span>}
                        {s.company_name && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">{s.company_name}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{s.ip_address}</span>
                        <span>{s.device_name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(s.last_active_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => terminateSession(s.session_id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> إنهاء
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Locked Accounts Tab ──────────────────────────────────── */}
        {tab === "locked" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">الحسابات المقفلة</h2>
            {loading ? (
              <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
            ) : locked.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400">لا توجد حسابات مقفلة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {locked.map(acc => (
                  <div key={acc.id} className="bg-white/5 border border-orange-500/20 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium">{acc.full_name}</span>
                        <span className="text-slate-400 text-xs">({acc.username})</span>
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">{acc.company_name}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        <span className="text-red-400">{acc.failed_login_attempts} محاولة فاشلة</span>
                        {acc.locked_until && <span>مقفل حتى: {formatTime(acc.locked_until)}</span>}
                      </div>
                    </div>
                    <button onClick={() => unlockAccount(acc.id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-all flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> فتح القفل
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
