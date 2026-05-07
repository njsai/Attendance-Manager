import { useState, useEffect, useCallback, useRef } from "react";
import { getCachedStale, setCached } from "@/lib/pageCache";
import {
  Users, UserCheck, UserX, Clock, Plane, CalendarDays,
  Loader2, X, Briefcase, RefreshCw, Building2,
  LogOut, AlertCircle, CheckCircle2, MinusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalEmployees: number; presentToday: number; absentToday: number;
  lateToday: number; onLeaveToday: number; pendingLeaves: number; attendanceRate: number;
}
interface Employee {
  id: number; fullName: string; jobTitle: string | null; departmentName: string | null;
  branchName: string | null; phone: string | null; isActive: boolean;
  shiftStart: string | null; shiftEnd: string | null; shiftName: string | null;
}
interface AttRecord {
  id: number; employeeId: number; employeeName: string; departmentName: string | null;
  checkInTime: string | null; checkOutTime: string | null;
  breakStartTime: string | null; breakEndTime: string | null;
  lateMinutes: number | null; overtimeMinutes: number | null;
  workingHours: number | null; status: string; notes: string | null;
}
interface LeaveRecord {
  id: number; employeeId: number; employeeName: string; departmentName: string | null;
  leaveType: string; startDate: string; endDate: string;
  totalDays: number; reason: string; status: string;
}
interface EmployeeRow {
  emp: Employee; att: AttRecord | null;
  computedStatus: "present" | "late" | "checked_out" | "on_leave" | "not_checked_in" | "absent";
}
type FilterKey = "all" | "present" | "absent" | "late" | "onLeave" | "pendingLeaves";
type BoardFilter = "all" | "present" | "late" | "absent" | "not_checked_in" | "on_leave";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function computeStatus(att: AttRecord | null): EmployeeRow["computedStatus"] {
  if (!att) return "not_checked_in";
  if (att.status === "on_leave") return "on_leave";
  if (att.status === "absent") return "absent";
  if (att.checkOutTime) return "checked_out";
  if (att.status === "late") return "late";
  return "present";
}

// ─── Live Work Timer ───────────────────────────────────────────────────────────
function LiveTimer({ checkInTime }: { checkInTime: string }) {
  const [ms, setMs] = useState(Date.now() - new Date(checkInTime).getTime());
  useEffect(() => {
    const id = setInterval(() => setMs(Date.now() - new Date(checkInTime).getTime()), 1000);
    return () => clearInterval(id);
  }, [checkInTime]);
  return (
    <span className="font-mono text-xs text-emerald-400 tabular-nums">
      {fmtDuration(ms)}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t, dir, locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const _dc = getCachedStale<{ stats: Stats; employees: Employee[]; todayAtt: AttRecord[]; pendingLeaves: LeaveRecord[] }>('dash');
  const [stats, setStats]             = useState<Stats | null>(_dc?.stats ?? null);
  const [employees, setEmployees]     = useState<Employee[]>(_dc?.employees ?? []);
  const [todayAtt, setTodayAtt]       = useState<AttRecord[]>(_dc?.todayAtt ?? []);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRecord[]>(_dc?.pendingLeaves ?? []);
  const [loading, setLoading]         = useState(!_dc);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [boardSearch, setBoardSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const BASE = import.meta.env.BASE_URL;

  function fmt12(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  // STATUS_META inside component so it can use t()
  const STATUS_META: Record<EmployeeRow["computedStatus"], {
    label: string; short: string; bg: string; text: string; icon: React.ReactNode;
  }> = {
    present:        { label: t("working"),          short: t("present"),  bg: "bg-emerald-900/40", text: "text-emerald-400", icon: <CheckCircle2 size={13} /> },
    late:           { label: t("late"),             short: t("late"),     bg: "bg-amber-900/40",   text: "text-amber-400",  icon: <AlertCircle size={13} /> },
    checked_out:    { label: t("checkedOutStatus"), short: t("checkedOut"), bg: "bg-blue-900/40",  text: "text-blue-400",   icon: <LogOut size={13} /> },
    on_leave:       { label: t("onLeave"),          short: t("onLeave"),  bg: "bg-purple-900/40",  text: "text-purple-400", icon: <Plane size={13} /> },
    not_checked_in: { label: t("notCheckedInYet"),  short: t("absent"),   bg: "bg-gray-800/60",    text: "text-gray-400",   icon: <MinusCircle size={13} /> },
    absent:         { label: t("absent"),           short: t("absent"),   bg: "bg-rose-900/40",    text: "text-rose-400",   icon: <UserX size={13} /> },
  };

  const LEAVE_TYPE_MAP: Record<string, string> = {
    annual: t("annual"), sick: t("sick"), emergency: t("emergency"),
    unpaid: t("unpaid"), other: t("other"),
  };

  const fetchAll = useCallback(async (silent = false) => {
    const hasCached = !!getCachedStale('dash');
    if (!silent && !hasCached) setLoading(true); else if (silent) setRefreshing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [s, emps, att, leaves] = await Promise.all([
        fetch(`${BASE}api/reports/dashboard`,        { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/employees`,                { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/attendance?date=${today}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/leaves?status=pending`,    { credentials: "include" }).then(r => r.json()),
      ]);
      const filteredEmps = Array.isArray(emps) ? emps.filter((e: Employee) => e.isActive) : [];
      const filteredAtt  = Array.isArray(att)    ? att    : [];
      const filteredLeaves = Array.isArray(leaves) ? leaves : [];
      setStats(s);
      setEmployees(filteredEmps);
      setTodayAtt(filteredAtt);
      setPendingLeaves(filteredLeaves);
      setLastUpdated(new Date());
      setCached('dash', { stats: s, employees: filteredEmps, todayAtt: filteredAtt, pendingLeaves: filteredLeaves });
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [BASE]);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(() => fetchAll(true), 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll]);

  const attMap = new Map<number, AttRecord>(todayAtt.map(r => [r.employeeId, r]));
  const allRows: EmployeeRow[] = employees.map(emp => {
    const att = attMap.get(emp.id) ?? null;
    return { emp, att, computedStatus: computeStatus(att) };
  });

  const computed = {
    total:       allRows.length,
    present:     allRows.filter(r => ["present", "late", "checked_out"].includes(r.computedStatus)).length,
    presentOnly: allRows.filter(r => ["present", "checked_out"].includes(r.computedStatus)).length,
    absent:      allRows.filter(r => ["not_checked_in", "absent"].includes(r.computedStatus)).length,
    late:        allRows.filter(r => r.computedStatus === "late").length,
    onLeave:     allRows.filter(r => r.computedStatus === "on_leave").length,
    activeNow:   allRows.filter(r => ["present", "late"].includes(r.computedStatus)).length,
  };
  const rate = computed.total > 0 ? Math.round((computed.present / computed.total) * 1000) / 10 : 0;

  const boardRows = allRows.filter(row => {
    const matchFilter =
      boardFilter === "all" ||
      (boardFilter === "present" && ["present", "checked_out"].includes(row.computedStatus)) ||
      (boardFilter === "late"    && row.computedStatus === "late") ||
      (boardFilter === "absent"  && ["not_checked_in", "absent"].includes(row.computedStatus)) ||
      (boardFilter === "not_checked_in" && row.computedStatus === "not_checked_in") ||
      (boardFilter === "on_leave" && row.computedStatus === "on_leave");
    const matchSearch = !boardSearch ||
      row.emp.fullName.includes(boardSearch) ||
      (row.emp.departmentName ?? "").includes(boardSearch);
    return matchFilter && matchSearch;
  });

  const presentRecords  = todayAtt.filter(r => ["present","late"].includes(r.status));
  const lateRecords     = todayAtt.filter(r => r.status === "late");
  const onLeaveRecords  = todayAtt.filter(r => r.status === "on_leave");
  const attendedIds     = new Set(todayAtt.map(r => r.employeeId));
  const onLeaveIds      = new Set(onLeaveRecords.map(r => r.employeeId));
  const absentEmployees = employees.filter(e => !attendedIds.has(e.id) && !onLeaveIds.has(e.id));

  const cards = [
    { key: "all"           as FilterKey, title: t("totalEmployees"), value: stats?.totalEmployees ?? computed.total,   icon: Users,         bg: "bg-blue-600",    nc: { border: "rgba(59,130,246,0.4)",  glow: "rgba(59,130,246,0.12)",  icon: "#3b82f6", bg: "rgba(59,130,246,0.12)" } },
    { key: "present"       as FilterKey, title: t("presentToday"),   value: stats?.presentToday ?? computed.present,   icon: UserCheck,     bg: "bg-emerald-600", nc: { border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.12)",  icon: "#10b981", bg: "rgba(16,185,129,0.12)" } },
    { key: "absent"        as FilterKey, title: t("absentToday"),    value: stats?.absentToday ?? computed.absent,     icon: UserX,         bg: "bg-rose-600",    nc: { border: "rgba(244,63,94,0.4)",   glow: "rgba(244,63,94,0.12)",   icon: "#f43f5e", bg: "rgba(244,63,94,0.12)" } },
    { key: "late"          as FilterKey, title: t("lateToday"),      value: stats?.lateToday ?? computed.late,         icon: Clock,         bg: "bg-amber-600",   nc: { border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.12)",  icon: "#f59e0b", bg: "rgba(245,158,11,0.12)" } },
    { key: "onLeave"       as FilterKey, title: t("onLeaveToday"),   value: stats?.onLeaveToday ?? computed.onLeave,   icon: Plane,         bg: "bg-purple-600",  nc: { border: "rgba(168,85,247,0.4)",  glow: "rgba(168,85,247,0.12)",  icon: "#a855f7", bg: "rgba(168,85,247,0.12)" } },
    { key: "pendingLeaves" as FilterKey, title: t("pendingLeaves"),  value: stats?.pendingLeaves ?? pendingLeaves.length, icon: CalendarDays, bg: "bg-cyan-600", nc: { border: "rgba(0,245,255,0.4)",   glow: "rgba(0,245,255,0.12)",   icon: isDark ? "#00f5ff" : "#0891b2", bg: isDark ? "rgba(0,245,255,0.12)" : "rgba(8,145,178,0.1)" } },
  ];
  const activeCard = cards.find(c => c.key === activeFilter);

  const chartData = [
    { name: t("present"), value: computed.present,  color: "#10b981" },
    { name: t("absent"),  value: computed.absent,   color: "#f43f5e" },
    { name: t("late"),    value: computed.late,     color: "#f59e0b" },
    { name: t("onLeave"), value: computed.onLeave,  color: "#a855f7" },
  ];

  // ── Styles ─────────────────────────────────────────────────────────────────
  const textPrimary    = isDark ? "#fff"                    : "#0f172a";
  const textSecondary  = isDark ? "rgba(255,255,255,0.45)"  : "#64748b";
  const textMuted      = isDark ? "rgba(255,255,255,0.28)"  : "#94a3b8";
  const boardBg        = isDark ? "rgba(2,8,23,0.65)"       : "#ffffff";
  const boardBorder    = isDark ? "rgba(0,245,255,0.1)"     : "#e2e8f0";
  const dividerColor   = isDark ? "rgba(255,255,255,0.04)"  : "#f1f5f9";
  const filterActiveBg = isDark ? "rgba(0,245,255,0.12)"    : "#eff6ff";
  const filterActiveColor = isDark ? "#00f5ff"              : "#1d4ed8";
  const filterActiveBorder = isDark ? "rgba(0,245,255,0.3)" : "#bfdbfe";
  const filterBg       = isDark ? "rgba(255,255,255,0.04)"  : "#f1f5f9";
  const filterColor    = isDark ? "rgba(255,255,255,0.4)"   : "#475569";
  const rowHover       = isDark ? "rgba(255,255,255,0.025)" : "#f8fafc";
  const cyanColor      = isDark ? "#00f5ff"                 : "#0891b2";
  const cardBg         = isDark ? "rgba(255,255,255,0.02)"  : "#ffffff";
  const cardBorder     = isDark ? "rgba(255,255,255,0.06)"  : "#e2e8f0";
  const cardShadow     = isDark ? "none"                    : "0 1px 4px rgba(0,0,0,0.05)";
  const pillBg         = isDark ? "rgba(0,255,159,0.08)"    : "rgba(5,150,105,0.08)";
  const pillBorder     = isDark ? "rgba(0,255,159,0.2)"     : "rgba(5,150,105,0.2)";
  const pillColor      = isDark ? "#00ff9f"                 : "#059669";
  const searchInputBg  = isDark ? "rgba(255,255,255,0.04)"  : "#f8fafc";
  const searchBorder   = isDark ? "rgba(0,245,255,0.1)"     : "#e2e8f0";
  const chartBg        = isDark ? "rgba(2,8,23,0.6)"        : "#ffffff";
  const chartBorder    = isDark ? "rgba(0,245,255,0.1)"     : "#e2e8f0";
  const tooltipBg      = isDark ? "rgba(2,8,23,0.95)"       : "#ffffff";
  const tooltipBorder  = isDark ? "rgba(0,245,255,0.2)"     : "#e2e8f0";
  const tooltipColor   = isDark ? "#fff"                    : "#0f172a";
  const thColor        = isDark ? "rgba(0,245,255,0.35)"    : "#94a3b8";
  const rateGlow       = isDark ? "0 0 30px rgba(0,245,255,0.4)" : "none";
  const rateBg         = isDark
    ? "linear-gradient(135deg, rgba(0,245,255,0.08), rgba(168,85,247,0.06))"
    : "linear-gradient(135deg, #f0f9ff, #faf5ff)";
  const rateBorder     = isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0";
  const progressBg     = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const innerBg        = isDark ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const innerBorder    = isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0";
  const refreshBg      = isDark ? "rgba(0,245,255,0.05)" : "#f1f5f9";
  const refreshBorder  = isDark ? "rgba(0,245,255,0.15)" : "#e2e8f0";
  const refreshColor   = isDark ? "rgba(0,245,255,0.6)"  : "#64748b";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: cyanColor, filter: isDark ? "drop-shadow(0 0 8px rgba(0,245,255,0.6))" : "none" }} />
        <span style={{ fontSize: 13, color: textMuted }}>{t("loadingData")}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 p-1" dir={dir}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: textPrimary }}>{t("dashboard")}</h2>
          <p className="mt-0.5 text-sm" style={{ color: textSecondary }}>
            {new Date().toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span style={{ fontSize: 11, color: textMuted }}>
              {t("lastUpdated")}: {fmt12(lastUpdated.toISOString())}
            </span>
          )}
          <button onClick={() => fetchAll(true)} disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `1px solid ${refreshBorder}`, background: refreshBg, color: refreshColor, fontSize: 12, cursor: "pointer" }}>
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {t("refresh")}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((card, idx) => {
          const isActive = activeFilter === card.key;
          const nc = card.nc;
          return (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => setActiveFilter(isActive ? null : card.key)}
              style={{
                position: "relative", width: "100%", textAlign: dir === "rtl" ? "right" : "left",
                borderRadius: 16, padding: 16, border: "none", cursor: "pointer",
                background: isActive ? nc.glow : (isDark ? "rgba(255,255,255,0.02)" : "#ffffff"),
                outline: isActive ? `1.5px solid ${nc.border}` : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"}`,
                boxShadow: isActive ? `0 0 24px ${nc.glow}` : (isDark ? "none" : "0 1px 4px rgba(0,0,0,0.04)"),
                transition: "all 0.2s",
              }}
            >
              {isActive && (
                <span style={{ position: "absolute", top: 10, insetInlineStart: 10, width: 7, height: 7, borderRadius: "50%", background: nc.icon, boxShadow: `0 0 8px ${nc.icon}`, animation: "pulse 1.5s infinite" }} />
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: textSecondary, fontWeight: 500, marginBottom: 6 }}>{card.title}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: textPrimary, lineHeight: 1 }}>{card.value}</p>
                  <span style={{ display: "inline-block", marginTop: 8, fontSize: 10, padding: "2px 8px", borderRadius: 20, background: nc.bg, color: nc.icon, fontWeight: 600 }}>
                    {isActive ? t("close") : t("details")}
                  </span>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: nc.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${nc.border}` }}>
                  <card.icon size={18} style={{ color: nc.icon }} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Detail Panel ── */}
      <AnimatePresence>
        {activeFilter && (
          <motion.div key={activeFilter} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div style={{ background: isDark ? "rgba(0,245,255,0.03)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.14)" : "#e2e8f0"}`, borderRadius: 16, overflow: "hidden" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${dividerColor}` }}>
                <div className="flex items-center gap-2">
                  {activeCard && (
                    <div className={`w-7 h-7 rounded-lg ${activeCard.bg} flex items-center justify-center`}>
                      <activeCard.icon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 13, margin: 0 }}>{activeCard?.title}</h3>
                    <p style={{ color: textMuted, fontSize: 11, margin: 0 }}>
                      {activeFilter === "pendingLeaves" ? `${pendingLeaves.length} ${t("leaveRequests").split(" ")[0]}`
                       : activeFilter === "all"          ? `${employees.length} ${t("employeeCount")}`
                       : activeFilter === "absent"       ? `${absentEmployees.length} ${t("employeeCount")}`
                       : activeFilter === "present"      ? `${presentRecords.length} ${t("employeeCount")}`
                       : activeFilter === "late"         ? `${lateRecords.length} ${t("employeeCount")}`
                       : `${onLeaveRecords.length} ${t("employeeCount")}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveFilter(null)} style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", color: textMuted, cursor: "pointer" }}>
                  <X size={15} />
                </button>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: dividerColor }}>
                {activeFilter === "all" && (employees.length === 0 ? <EmptyMsg label={t("noEmployees")} textColor={textMuted} /> : employees.map(emp => <EmpRow key={emp.id} emp={emp} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} />))}
                {activeFilter === "present" && (presentRecords.length === 0 ? <EmptyMsg label={t("noPresentToday")} textColor={textMuted} /> : presentRecords.map(r => <AttRowComp key={r.id} r={r} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} locale={locale} />))}
                {activeFilter === "absent" && (absentEmployees.length === 0 ? <EmptyMsg label={t("noAbsentToday")} textColor={textMuted} /> : absentEmployees.map(emp => <EmpRow key={emp.id} emp={emp} absent isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} />))}
                {activeFilter === "late" && (lateRecords.length === 0 ? <EmptyMsg label={t("noLateToday")} textColor={textMuted} /> : lateRecords.map(r => <AttRowComp key={r.id} r={r} showLate isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} locale={locale} />))}
                {activeFilter === "onLeave" && (onLeaveRecords.length === 0 ? <EmptyMsg label={t("noOnLeaveToday")} textColor={textMuted} /> : onLeaveRecords.map(r => <AttRowComp key={r.id} r={r} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} locale={locale} />))}
                {activeFilter === "pendingLeaves" && (pendingLeaves.length === 0 ? <EmptyMsg label={t("noPendingLeaves")} textColor={textMuted} /> : pendingLeaves.map(l => <LeaveRowComp key={l.id} l={l} isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} leaveTypeMap={LEAVE_TYPE_MAP} locale={locale} />))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live Attendance Board ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ background: boardBg, border: `1px solid ${boardBorder}`, borderRadius: 18, overflow: "hidden", boxShadow: isDark ? "none" : "0 1px 8px rgba(0,0,0,0.05)" }}>

        {/* Board Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: isDark ? "rgba(0,245,255,0.1)" : "rgba(8,145,178,0.08)", border: `1px solid ${isDark ? "rgba(0,245,255,0.2)" : "rgba(8,145,178,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} style={{ color: cyanColor }} />
            </div>
            <div>
              <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 13, margin: 0 }}>{t("todayAttendanceBoard")}</h3>
              <p style={{ color: textMuted, fontSize: 11, margin: 0 }}>
                {computed.activeNow} {t("workingNow")} · {computed.absent} {t("absent")} · {t("autoRefreshMinute")}
              </p>
            </div>
          </div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2 }}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: pillColor }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: pillColor, boxShadow: isDark ? `0 0 6px ${pillColor}` : "none", display: "inline-block" }} />
            {t("live")}
          </motion.div>
        </div>

        {/* Board Filters */}
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ borderBottom: `1px solid ${dividerColor}` }}>
          {[
            { k: "all"      as BoardFilter, label: `${t("boardAll")} (${allRows.length})` },
            { k: "present"  as BoardFilter, label: `${t("boardPresent")} (${computed.presentOnly})` },
            { k: "late"     as BoardFilter, label: `${t("boardLate")} (${computed.late})` },
            { k: "absent"   as BoardFilter, label: `${t("boardAbsent")} (${computed.absent})` },
            { k: "on_leave" as BoardFilter, label: `${t("boardLeave")} (${computed.onLeave})` },
          ].map(f => (
            <button key={f.k} onClick={() => setBoardFilter(f.k)}
              style={{ padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.15s", background: boardFilter === f.k ? filterActiveBg : filterBg, color: boardFilter === f.k ? filterActiveColor : filterColor, outline: boardFilter === f.k ? `1px solid ${filterActiveBorder}` : "1px solid transparent" }}>
              {f.label}
            </button>
          ))}
          <input value={boardSearch} onChange={e => setBoardSearch(e.target.value)} placeholder={t("search") + "..."}
            className="neon-input"
            style={{ marginInlineStart: "auto", padding: "4px 12px", borderRadius: 8, fontSize: 12, width: 120 }} />
        </div>

        {/* Board Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${dividerColor}` }}>
                {[t("employeeCol"), t("branchDeptCol"), t("statusCol"), t("checkInCol"), t("checkOutCol"), t("workDurationCol"), t("delayCol")].map(h => (
                  <th key={h} style={{ textAlign: dir === "rtl" ? "right" : "left", color: thColor, fontWeight: 600, padding: "10px 16px", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {boardRows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: textMuted, fontSize: 13 }}>{t("noResults")}</td></tr>
              ) : boardRows.map(({ emp, att, computedStatus }) => {
                const meta = STATUS_META[computedStatus];
                const isActiveNow = ["present","late"].includes(computedStatus) && att?.checkInTime && !att.checkOutTime;
                return (
                  <tr key={emp.id} style={{ borderBottom: `1px solid ${dividerColor}`, background: isActiveNow ? (isDark ? "rgba(16,185,129,0.03)" : "rgba(16,185,129,0.02)") : "transparent", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = rowHover}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = isActiveNow ? (isDark ? "rgba(16,185,129,0.03)" : "rgba(16,185,129,0.02)") : "transparent"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${meta.bg} ${meta.text}`}>
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <p style={{ color: textPrimary, fontSize: 13, fontWeight: 500, margin: 0 }}>{emp.fullName}</p>
                          {emp.jobTitle && <p style={{ color: textMuted, fontSize: 11, margin: 0 }}>{emp.jobTitle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {emp.branchName && <p style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: textSecondary, margin: 0 }}><Building2 size={10} />{emp.branchName}</p>}
                        {emp.departmentName && <p style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: textMuted, margin: 0 }}><Briefcase size={10} />{emp.departmentName}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                        {meta.icon}{meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {att?.checkInTime ? <span style={{ color: "#10b981", fontSize: 13, fontWeight: 500 }}>{fmt12(att.checkInTime)}</span> : <span style={{ color: textMuted, fontSize: 12 }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {att?.checkOutTime ? <span style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>{fmt12(att.checkOutTime)}</span>
                       : att?.checkInTime ? <span style={{ color: textMuted, fontSize: 11 }}>{t("inProgress")}</span>
                       : <span style={{ color: textMuted, fontSize: 12 }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isActiveNow && att?.checkInTime ? <LiveTimer checkInTime={att.checkInTime} />
                       : att?.workingHours && att.workingHours > 0 ? <span style={{ color: "#3b82f6", fontSize: 11, fontWeight: 500 }}>{att.workingHours.toFixed(1)}h</span>
                       : <span style={{ color: textMuted, fontSize: 12 }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {(att?.lateMinutes ?? 0) > 0 ? <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 500 }}>{att!.lateMinutes}{t("minuteShort")}</span>
                       : att?.checkInTime ? <span style={{ color: "#10b981", fontSize: 11 }}>{t("onTime")}</span>
                       : <span style={{ color: textMuted, fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Board Footer */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${dividerColor}`, fontSize: 11 }}>
          <span style={{ color: textMuted }}>{t("showingOf")} {boardRows.length} {t("ofEmployees")} {allRows.length} {t("employeeCount")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {[
              { color: "#10b981", label: t("legendWorking") },
              { color: "#f59e0b", label: t("legendLate") },
              { color: "#3b82f6", label: t("legendCheckedOut") },
              { color: "#6b7280", label: t("legendAbsent") },
            ].map(b => (
              <span key={b.label} style={{ display: "flex", alignItems: "center", gap: 4, color: textMuted }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: b.color, boxShadow: isDark ? `0 0 4px ${b.color}` : "none" }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}
          style={{ background: chartBg, border: `1px solid ${chartBorder}`, borderRadius: 18, padding: 20, boxShadow: isDark ? "none" : "0 1px 6px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 16, opacity: isDark ? 0.85 : 1 }}>{t("attendanceStats")}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: textSecondary, fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: textMuted, fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip cursor={{ fill: isDark ? "rgba(0,245,255,0.03)" : "rgba(0,0,0,0.02)" }}
                  contentStyle={{ borderRadius: 12, border: `1px solid ${tooltipBorder}`, background: tooltipBg, color: tooltipColor, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Rate Card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          style={{ borderRadius: 18, padding: 24, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", background: rateBg, border: `1px solid ${rateBorder}`, boxShadow: isDark ? "0 0 40px rgba(0,245,255,0.06)" : "0 1px 6px rgba(0,0,0,0.05)" }}>
          {isDark && (
            <>
              <div style={{ position: "absolute", top: -40, insetInlineEnd: -40, width: 120, height: 120, background: "rgba(0,245,255,0.08)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -40, insetInlineStart: -40, width: 120, height: 120, background: "rgba(168,85,247,0.08)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />
            </>
          )}
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, marginBottom: 2 }}>{t("attendanceRate")}</h3>
            <p style={{ fontSize: 12, color: textSecondary }}>{t("attendanceRateSub")}</p>
          </div>
          <div style={{ position: "relative", zIndex: 1, marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: cyanColor, lineHeight: 1, textShadow: rateGlow }}>{rate}%</span>
              <span style={{ marginBottom: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: rate >= 80 ? "rgba(16,185,129,0.12)" : rate >= 50 ? "rgba(245,158,11,0.12)" : "rgba(244,63,94,0.12)",
                color: rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#f43f5e" }}>
                {rate >= 80 ? t("excellent") : rate >= 50 ? t("goodRate") : t("poor")}
              </span>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 99, background: progressBg, overflow: "hidden" }}>
              <motion.div style={{ height: "100%", borderRadius: 99, background: isDark ? "linear-gradient(90deg, #00f5ff, #a855f7)" : "linear-gradient(90deg, #0891b2, #7c3aed)" }}
                initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ delay: 0.7, duration: 0.9, ease: "easeOut" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: t("activeNow"),      val: computed.activeNow,                                      color: "#10b981" },
                { label: t("checkedOutStatus"), val: allRows.filter(r => r.computedStatus === "checked_out").length, color: cyanColor },
                { label: t("absent"),          val: computed.absent,                                         color: "#f43f5e" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: innerBg, border: `1px solid ${innerBorder}` }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: s.color, textShadow: isDark ? `0 0 12px ${s.color}50` : "none" }}>{s.val}</p>
                  <p style={{ fontSize: 10, color: textMuted, marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: textMuted, textAlign: "center" }}>
              {computed.present} {t("presentOf")} {computed.total} {t("employeeCount")}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
function EmptyMsg({ label, textColor }: { label: string; textColor: string }) {
  return <div style={{ textAlign: "center", padding: "32px 0", color: textColor, fontSize: 13 }}>{label}</div>;
}

function EmpRow({ emp, absent, isDark, textPrimary, textSecondary }: {
  emp: { id: number; fullName: string; jobTitle: string | null; departmentName: string | null; branchName: string | null };
  absent?: boolean; isDark: boolean; textPrimary: string; textSecondary: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", transition: "background 0.12s", cursor: "default" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${absent ? "bg-rose-900/50 text-rose-300" : "bg-blue-900/50 text-blue-300"}`}>
        {emp.fullName.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: textPrimary, fontSize: 13, fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.fullName}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          {emp.jobTitle && <span style={{ color: textSecondary, fontSize: 11 }}>{emp.jobTitle}</span>}
          {emp.departmentName && <span style={{ color: textSecondary, fontSize: 11 }}>· {emp.departmentName}</span>}
          {emp.branchName && <span style={{ color: textSecondary, fontSize: 11 }}>· {emp.branchName}</span>}
        </div>
      </div>
    </div>
  );
}

function AttRowComp({ r, showLate, isDark, textPrimary, textSecondary, locale }: {
  r: { id: number; employeeName: string; checkInTime: string | null; checkOutTime: string | null; lateMinutes: number | null; departmentName: string | null };
  showLate?: boolean; isDark: boolean; textPrimary: string; textSecondary: string; locale: string;
}) {
  const fmt = (d: string | null) => !d ? "—" : new Date(d).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
      <div>
        <p style={{ color: textPrimary, fontSize: 13, fontWeight: 500, margin: 0 }}>{r.employeeName}</p>
        {r.departmentName && <p style={{ color: textSecondary, fontSize: 11, margin: 0 }}>{r.departmentName}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#10b981", fontSize: 12, fontWeight: 500 }}>{fmt(r.checkInTime)}</span>
        {r.checkOutTime && <span style={{ color: "#f87171", fontSize: 12, fontWeight: 500 }}>{fmt(r.checkOutTime)}</span>}
        {showLate && (r.lateMinutes ?? 0) > 0 && <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600 }}>+{r.lateMinutes}د</span>}
      </div>
    </div>
  );
}

function LeaveRowComp({ l, isDark, textPrimary, textSecondary, leaveTypeMap, locale }: {
  l: { id: number; employeeName: string; leaveType: string; startDate: string; endDate: string; totalDays: number; departmentName: string | null };
  isDark: boolean; textPrimary: string; textSecondary: string; leaveTypeMap: Record<string, string>; locale: string;
}) {
  const fmtD = (d: string) => new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", transition: "background 0.12s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}>
      <div>
        <p style={{ color: textPrimary, fontSize: 13, fontWeight: 500, margin: 0 }}>{l.employeeName}</p>
        <p style={{ color: textSecondary, fontSize: 11, margin: 0 }}>{l.departmentName}</p>
      </div>
      <div style={{ textAlign: "end" }}>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(168,85,247,0.1)", color: "#a855f7", fontWeight: 600 }}>{leaveTypeMap[l.leaveType] || l.leaveType}</span>
        <p style={{ color: textSecondary, fontSize: 11, margin: "3px 0 0" }}>{fmtD(l.startDate)} — {fmtD(l.endDate)} ({l.totalDays}د)</p>
      </div>
    </div>
  );
}
