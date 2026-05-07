import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import {
  Server, Cpu, HardDrive, Database, Activity, Users, Clock,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, ChevronLeft,
  Zap, Globe, Shield, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { SA_T, getSAColors } from "@/lib/sa-utils";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Error");
  return data;
}

interface MonitorData {
  status: string;
  cpu: { usage: number; cores: number };
  ram: { usedGb: number; totalGb: number; percent: number };
  uptime: { days: number; hours: number; minutes: number };
  database: { status: string; host: string };
  api: { avgResponseMs: number; requestsPerMin: number; totalRequests: number };
  activeSessions: number;
  recentErrors: number;
  platform: string;
  nodeVersion: string;
  chartData: { label: string; requests: number; avgMs: number }[];
  timestamp: string;
}

function GaugeRing({ value, color, size = 80, isDark }: { value: number; color: string; size?: number; isDark: boolean }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const trackColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={10} strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}

export default function MonitoringPage() {
  const [, setLocation] = useLocation();
  const { lang, dir, setLang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = getSAColors(isDark);
  const T = SA_T[lang];

  const [data, setData] = useState<MonitorData | null>(null);
  const [history, setHistory] = useState<{ cpu: number[]; ram: number[]; ts: number[] }>({ cpu: [], ram: [], ts: [] });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const d = await apiFetch("api/super-admin/monitoring");
      setData(d);
      setLastRefresh(new Date());
      setHistory(prev => ({
        cpu: [...prev.cpu.slice(-19), d.cpu.usage],
        ram: [...prev.ram.slice(-19), d.ram.percent],
        ts:  [...prev.ts.slice(-19),  Date.now()],
      }));
    } catch {}
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const r = await apiFetch("api/super-admin/monitoring/audit-logs?limit=20");
      setAuditLogs(r.logs || []);
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchData(), fetchAuditLogs()]).finally(() => setLoading(false));
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData, fetchAuditLogs]);

  const historyChart = history.cpu.map((cpu, i) => ({ idx: i, cpu, ram: history.ram[i] ?? 0 }));

  const baseStyle = { fontFamily: "'Tajawal', sans-serif", color: C.textPrimary };
  const card = (extra?: any) => ({
    background: C.cardBg,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 16,
    padding: 20,
    backdropFilter: isDark ? "blur(12px)" : "none",
    boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
    ...extra,
  });

  const tooltipStyle = {
    background: isDark ? "#1a1a2e" : "#fff",
    border: `1px solid ${C.cardBorder}`,
    borderRadius: 8,
    fontSize: 11,
    color: C.textPrimary,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: isDark ? "#020817" : "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center", ...baseStyle }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
        <RefreshCw size={32} style={{ color: "#00f5ff" }} />
      </motion.div>
    </div>
  );

  const statusOk = data?.status === "online";
  const StatusBadge = () => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: statusOk ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)",
      color: statusOk ? "#10b981" : "#f87171",
      border: `1px solid ${statusOk ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusOk ? "#10b981" : "#f87171",
        boxShadow: statusOk ? "0 0 6px #10b981" : "0 0 6px #f87171", animation: statusOk ? "mon-pulse 2s infinite" : "none" }} />
      {statusOk ? T.online : T.offline}
    </span>
  );

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: C.pageBg, ...baseStyle }}>
      <style>{`@keyframes mon-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : C.headerBorder}`, backdropFilter: isDark ? "blur(20px)" : "none", position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setLocation("/super-admin")} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={20} style={{ color: "#00f5ff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.textPrimary }}>{T.systemMonitoring}</h1>
              <p style={{ fontSize: 11, color: isDark ? "rgba(0,245,255,0.5)" : "#64748b", margin: 0 }}>
                {T.lastUpdate}: {lastRefresh.toLocaleTimeString(lang === "ar" ? "ar" : "en")} · {T.autoUpdate5s}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {data && <StatusBadge />}
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Globe size={13} /> {lang === "ar" ? "EN" : "عر"}
            </button>
            <button onClick={fetchData} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(0,245,255,0.15)", background: "rgba(0,245,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#00f5ff" }}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>

        {/* Status Cards Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { icon: <Server size={18} />, label: T.serverStatus, value: data?.status === "online" ? T.online : T.offline, color: "#10b981", extra: data?.platform },
            { icon: <Zap size={18} />, label: T.avgResponse, value: `${data?.api.avgResponseMs ?? 0} ms`, color: data && data.api.avgResponseMs < 200 ? "#10b981" : data && data.api.avgResponseMs < 500 ? "#f59e0b" : "#f87171", extra: `${data?.api.requestsPerMin ?? 0} ${T.reqPerMin}` },
            { icon: <Users size={18} />, label: T.activeSessions, value: String(data?.activeSessions ?? 0), color: "#00f5ff", extra: `${data?.api.totalRequests ?? 0} ${T.totalRequests}` },
            { icon: <AlertTriangle size={18} />, label: T.recentErrors1h, value: String(data?.recentErrors ?? 0), color: data?.recentErrors ? "#f87171" : "#10b981", extra: data?.nodeVersion },
            { icon: <Clock size={18} />, label: T.uptimeLabel, value: `${data?.uptime.days ?? 0}${T.days} ${data?.uptime.hours ?? 0}${T.hours}`, color: "#a855f7", extra: `${data?.uptime.minutes ?? 0} ${T.minutes}` },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={card()}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: item.color }}>
                {item.icon}
                <span style={{ fontSize: 11, color: C.textMuted }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{item.extra}</div>
            </motion.div>
          ))}
        </div>

        {/* CPU + RAM Gauges */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[
            { label: T.cpuLabel, value: data?.cpu.usage ?? 0, color: data && data.cpu.usage > 80 ? "#f87171" : data && data.cpu.usage > 60 ? "#f59e0b" : "#00f5ff", extra: `${data?.cpu.cores ?? 0} ${T.coresLabel}`, icon: <Cpu size={16} /> },
            { label: T.ramLabel, value: data?.ram.percent ?? 0, color: data && data.ram.percent > 85 ? "#f87171" : data && data.ram.percent > 65 ? "#f59e0b" : "#a855f7", extra: `${data?.ram.usedGb ?? 0} / ${data?.ram.totalGb ?? 0} GB`, icon: <HardDrive size={16} /> },
          ].map((item, i) => (
            <motion.div key={i} style={{ ...card(), display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <GaugeRing value={item.value} color={item.color} size={96} isDark={isDark} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}%</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: item.color, marginBottom: 6 }}>
                  {item.icon}
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>{item.extra}</div>
                <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${item.value}%`, borderRadius: 4, background: item.color, boxShadow: `0 0 8px ${item.color}`, transition: "width 0.8s ease" }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={card()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} style={{ color: "#00f5ff" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{T.resourceHistory}</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={historyChart}>
                <defs>
                  <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gram" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="idx" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: string) => [`${v}%`, n === "cpu" ? "CPU" : "RAM"]} />
                <Area type="monotone" dataKey="cpu" stroke="#00f5ff" fill="url(#gcpu)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="ram" stroke="#a855f7" fill="url(#gram)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
              {[{ c: "#00f5ff", l: "CPU" }, { c: "#a855f7", l: "RAM" }].map(x => (
                <span key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.textMuted }}>
                  <span style={{ width: 20, height: 2, background: x.c, borderRadius: 2, display: "inline-block" }} />{x.l}
                </span>
              ))}
            </div>
          </div>

          <div style={card()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity size={16} style={{ color: "#10b981" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{T.requestRateChart}</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.chartData ?? []}>
                <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="requests" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} name={lang === "ar" ? "طلبات" : "Requests"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DB + API Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={card()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Database size={16} style={{ color: "#f59e0b" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{T.databaseLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {data?.database.status === "online"
                ? <CheckCircle size={32} style={{ color: "#10b981" }} />
                : <XCircle size={32} style={{ color: "#f87171" }} />}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: data?.database.status === "online" ? "#10b981" : "#f87171" }}>
                  {data?.database.status === "online" ? T.postgresConnected : T.dbUnavailable}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{data?.database.host}</div>
              </div>
            </div>
          </div>
          <div style={card()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Globe size={16} style={{ color: "#00f5ff" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{T.apiPerformance}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
              {[
                { label: T.avgResponseCard, value: `${data?.api.avgResponseMs ?? 0}ms`, color: "#00f5ff" },
                { label: T.reqPerMin,       value: String(data?.api.requestsPerMin ?? 0), color: "#10b981" },
                { label: T.totalRequests,   value: String(data?.api.totalRequests ?? 0), color: "#a855f7" },
              ].map(x => (
                <div key={x.label} style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "10px 8px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: x.color }}>{x.value}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={16} style={{ color: "#a855f7" }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary }}>{T.recentAuditLogs}</span>
            </div>
            <button onClick={fetchAuditLogs} style={{ fontSize: 11, color: "#a855f7", background: "none", border: "none", cursor: "pointer" }}>{T.refresh}</button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: C.textMuted, fontSize: 11 }}>
                  {[T.userCol, T.actionCol, T.resourceCol, T.companyCol, T.ipCol, T.timeCol, T.statusCol].map(h => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: dir === "rtl" ? "right" : "left", fontWeight: 600, whiteSpace: "nowrap", color: C.textMuted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, i) => (
                  <tr key={log.id} style={{ borderTop: `1px solid ${C.tableBorder}`, background: i % 2 === 0 ? C.tableRowAlt : "transparent" }}>
                    <td style={{ padding: "7px 10px", color: C.textPrimary, fontWeight: 600 }}>{log.user_name ?? "—"}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: log.action?.includes("LOGIN") ? "rgba(16,185,129,0.1)" : log.action?.includes("DELETE") ? "rgba(248,113,113,0.1)" : "rgba(0,245,255,0.08)",
                        color: log.action?.includes("LOGIN") ? "#10b981" : log.action?.includes("DELETE") ? "#f87171" : "#00f5ff" }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px", color: C.textSecondary }}>{log.resource}</td>
                    <td style={{ padding: "7px 10px", color: C.textSecondary }}>{log.company_name ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: C.textMuted, fontFamily: "monospace" }}>{log.ip_address ?? "—"}</td>
                    <td style={{ padding: "7px 10px", color: C.textMuted, whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString(lang === "ar" ? "ar-IQ" : "en-US", { hour12: false })}
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: log.status === "success" ? "#10b981" : "#f87171" }}>
                        {log.status === "success" ? T.succeeded : T.failed}
                      </span>
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: C.textMuted }}>{T.noLogs}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
