import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, UserCheck, UserX, Clock, Plane, CalendarDays,
  Loader2, X, Phone, Briefcase, RefreshCw, Building2,
  LogIn, LogOut, Timer, AlertCircle, CheckCircle2, MinusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  attendanceRate: number;
}

interface Employee {
  id: number;
  fullName: string;
  jobTitle: string | null;
  departmentName: string | null;
  branchName: string | null;
  phone: string | null;
  isActive: boolean;
  shiftStart: string | null;
  shiftEnd: string | null;
  shiftName: string | null;
}

interface AttRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  lateMinutes: number | null;
  overtimeMinutes: number | null;
  workingHours: number | null;
  status: string;
  notes: string | null;
}

interface LeaveRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
}

/** Merged view: every employee + their today's record (or null) */
interface EmployeeRow {
  emp: Employee;
  att: AttRecord | null;
  /** computed status */
  computedStatus: "present" | "late" | "checked_out" | "on_leave" | "not_checked_in" | "absent";
}

type FilterKey = "all" | "present" | "absent" | "late" | "onLeave" | "pendingLeaves";
type BoardFilter = "all" | "present" | "late" | "absent" | "not_checked_in" | "on_leave";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt12(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const LEAVE_TYPE_AR: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة", unpaid: "بدون راتب", other: "أخرى",
};

function computeStatus(att: AttRecord | null): EmployeeRow["computedStatus"] {
  if (!att) return "not_checked_in";
  if (att.status === "on_leave") return "on_leave";
  if (att.status === "absent") return "absent";
  if (att.checkOutTime) return "checked_out";
  if (att.status === "late") return "late";
  return "present";
}

const STATUS_META: Record<EmployeeRow["computedStatus"], {
  label: string; short: string; bg: string; text: string; icon: React.ReactNode;
}> = {
  present:        { label: "جارٍ العمل", short: "حاضر",  bg: "bg-emerald-900/40", text: "text-emerald-400", icon: <CheckCircle2 size={13} /> },
  late:           { label: "متأخر",      short: "متأخر",  bg: "bg-amber-900/40",   text: "text-amber-400",  icon: <AlertCircle size={13} /> },
  checked_out:    { label: "انصرف",      short: "انصرف",  bg: "bg-blue-900/40",    text: "text-blue-400",   icon: <LogOut size={13} /> },
  on_leave:       { label: "إجازة",      short: "إجازة",  bg: "bg-purple-900/40",  text: "text-purple-400", icon: <Plane size={13} /> },
  not_checked_in: { label: "لم يسجل بعد", short: "غائب",  bg: "bg-gray-800/60",    text: "text-gray-400",   icon: <MinusCircle size={13} /> },
  absent:         { label: "غائب",       short: "غائب",   bg: "bg-rose-900/40",    text: "text-rose-400",   icon: <UserX size={13} /> },
};

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
  const [stats, setStats]             = useState<Stats | null>(null);
  const [employees, setEmployees]     = useState<Employee[]>([]);
  const [todayAtt, setTodayAtt]       = useState<AttRecord[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [boardSearch, setBoardSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const BASE = import.meta.env.BASE_URL;

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [s, emps, att, leaves] = await Promise.all([
        fetch(`${BASE}api/reports/dashboard`,       { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/employees`,               { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/attendance?date=${today}`,{ credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/leaves?status=pending`,   { credentials: "include" }).then(r => r.json()),
      ]);
      setStats(s);
      setEmployees(Array.isArray(emps) ? emps.filter((e: Employee) => e.isActive) : []);
      setTodayAtt(Array.isArray(att) ? att : []);
      setPendingLeaves(Array.isArray(leaves) ? leaves : []);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [BASE]);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 60 seconds
    timerRef.current = setInterval(() => fetchAll(true), 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll]);

  // ── Merge employees + attendance ───────────────────────────────────────────
  const attMap = new Map<number, AttRecord>(todayAtt.map(r => [r.employeeId, r]));

  const allRows: EmployeeRow[] = employees.map(emp => {
    const att = attMap.get(emp.id) ?? null;
    return { emp, att, computedStatus: computeStatus(att) };
  });

  // ── Stats computed from merged rows ────────────────────────────────────────
  const computed = {
    total:          allRows.length,
    present:        allRows.filter(r => r.computedStatus === "present" || r.computedStatus === "late" || r.computedStatus === "checked_out").length,
    presentOnly:    allRows.filter(r => r.computedStatus === "present" || r.computedStatus === "checked_out").length,
    absent:         allRows.filter(r => r.computedStatus === "not_checked_in" || r.computedStatus === "absent").length,
    late:           allRows.filter(r => r.computedStatus === "late").length,
    onLeave:        allRows.filter(r => r.computedStatus === "on_leave").length,
    activeNow:      allRows.filter(r => r.computedStatus === "present" || r.computedStatus === "late").length,
  };
  const rate = computed.total > 0 ? Math.round((computed.present / computed.total) * 1000) / 10 : 0;

  // ── Board filter ───────────────────────────────────────────────────────────
  const boardRows = allRows.filter(row => {
    const matchFilter =
      boardFilter === "all" ||
      (boardFilter === "present" && (row.computedStatus === "present" || row.computedStatus === "checked_out")) ||
      (boardFilter === "late" && row.computedStatus === "late") ||
      (boardFilter === "absent" && (row.computedStatus === "not_checked_in" || row.computedStatus === "absent")) ||
      (boardFilter === "not_checked_in" && row.computedStatus === "not_checked_in") ||
      (boardFilter === "on_leave" && row.computedStatus === "on_leave");
    const matchSearch = !boardSearch || row.emp.fullName.includes(boardSearch) || (row.emp.departmentName ?? "").includes(boardSearch);
    return matchFilter && matchSearch;
  });

  // ── Cards panel data ───────────────────────────────────────────────────────
  const presentRecords = todayAtt.filter(r => r.status === "present" || r.status === "late");
  const lateRecords    = todayAtt.filter(r => r.status === "late");
  const onLeaveRecords = todayAtt.filter(r => r.status === "on_leave");
  const attendedIds    = new Set(todayAtt.map(r => r.employeeId));
  const onLeaveIds     = new Set(onLeaveRecords.map(r => r.employeeId));
  const absentEmployees = employees.filter(e => !attendedIds.has(e.id) && !onLeaveIds.has(e.id));

  const cards = [
    { key: "all"           as FilterKey, title: "إجمالي الموظفين", value: stats?.totalEmployees ?? computed.total, icon: Users,         bg: "bg-blue-600",    ring: "ring-blue-500",    pill: "bg-blue-900/40 text-blue-300" },
    { key: "present"       as FilterKey, title: "حاضر اليوم",      value: stats?.presentToday ?? computed.present,  icon: UserCheck,     bg: "bg-emerald-600", ring: "ring-emerald-500", pill: "bg-emerald-900/40 text-emerald-300" },
    { key: "absent"        as FilterKey, title: "غائب اليوم",       value: stats?.absentToday ?? computed.absent,   icon: UserX,         bg: "bg-rose-600",    ring: "ring-rose-500",    pill: "bg-rose-900/40 text-rose-300" },
    { key: "late"          as FilterKey, title: "متأخر اليوم",      value: stats?.lateToday ?? computed.late,       icon: Clock,         bg: "bg-amber-600",   ring: "ring-amber-500",   pill: "bg-amber-900/40 text-amber-300" },
    { key: "onLeave"       as FilterKey, title: "في إجازة",         value: stats?.onLeaveToday ?? computed.onLeave,  icon: Plane,         bg: "bg-purple-600",  ring: "ring-purple-500",  pill: "bg-purple-900/40 text-purple-300" },
    { key: "pendingLeaves" as FilterKey, title: "إجازات معلقة",     value: stats?.pendingLeaves ?? pendingLeaves.length, icon: CalendarDays, bg: "bg-cyan-600", ring: "ring-cyan-500",    pill: "bg-cyan-900/40 text-cyan-300" },
  ];

  const activeCard = cards.find(c => c.key === activeFilter);

  const chartData = [
    { name: "حاضر",   value: computed.present,  color: "#10b981" },
    { name: "غائب",   value: computed.absent,   color: "#f43f5e" },
    { name: "متأخر",  value: computed.late,     color: "#f59e0b" },
    { name: "إجازة",  value: computed.onLeave,  color: "#a855f7" },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#00f5ff", filter: "drop-shadow(0 0 8px rgba(0,245,255,0.6))" }} />
          <span style={{ fontSize: 13, color: "rgba(0,245,255,0.5)" }}>جاري تحميل البيانات...</span>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-1" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#fff", textShadow: "0 0 30px rgba(0,245,255,0.15)" }}>لوحة التحكم</h2>
          <p className="mt-0.5 text-sm" style={{ color: "rgba(0,245,255,0.45)" }}>
            {new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              آخر تحديث: {fmt12(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(0,245,255,0.15)",
              background: "rgba(0,245,255,0.05)", color: "rgba(0,245,255,0.6)",
              fontSize: 12, cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((card, idx) => {
          const isActive = activeFilter === card.key;
          const NEON_COLORS: Record<string, { border: string; glow: string; icon: string; bg: string }> = {
            "bg-blue-600":    { border: "rgba(59,130,246,0.4)",  glow: "rgba(59,130,246,0.12)",  icon: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
            "bg-emerald-600": { border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.12)",  icon: "#10b981", bg: "rgba(16,185,129,0.12)" },
            "bg-rose-600":    { border: "rgba(244,63,94,0.4)",   glow: "rgba(244,63,94,0.12)",   icon: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
            "bg-amber-600":   { border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.12)",  icon: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
            "bg-purple-600":  { border: "rgba(168,85,247,0.4)",  glow: "rgba(168,85,247,0.12)",  icon: "#a855f7", bg: "rgba(168,85,247,0.12)" },
            "bg-cyan-600":    { border: "rgba(0,245,255,0.4)",   glow: "rgba(0,245,255,0.12)",   icon: "#00f5ff", bg: "rgba(0,245,255,0.12)" },
          };
          const nc = NEON_COLORS[card.bg] ?? NEON_COLORS["bg-cyan-600"];
          return (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => setActiveFilter(isActive ? null : card.key)}
              style={{
                position: "relative", width: "100%", textAlign: "right",
                borderRadius: 16, padding: 16, border: "none", cursor: "pointer",
                background: isActive ? nc.glow : "rgba(255,255,255,0.02)",
                outline: isActive ? `1.5px solid ${nc.border}` : "1px solid rgba(255,255,255,0.06)",
                boxShadow: isActive ? `0 0 24px ${nc.glow}, inset 0 1px 0 ${nc.border}` : "none",
                transition: "all 0.2s",
              }}
            >
              {isActive && (
                <span style={{
                  position: "absolute", top: 10, left: 10,
                  width: 7, height: 7, borderRadius: "50%",
                  background: nc.icon, boxShadow: `0 0 8px ${nc.icon}`,
                  animation: "pulse 1.5s infinite",
                }} />
              )}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500, marginBottom: 6 }}>{card.title}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{card.value}</p>
                  <span style={{
                    display: "inline-block", marginTop: 8, fontSize: 10, padding: "2px 8px",
                    borderRadius: 20, background: nc.bg, color: nc.icon, fontWeight: 600,
                  }}>
                    {isActive ? "إغلاق" : "التفاصيل"}
                  </span>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: nc.bg, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid ${nc.border}`,
                }}>
                  <card.icon size={18} style={{ color: nc.icon }} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Cards Detail Panel ── */}
      <AnimatePresence>
        {activeFilter && (
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.14)", borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(0,245,255,0.08)" }}>
                <div className="flex items-center gap-2">
                  {activeCard && (
                    <div className={`w-7 h-7 rounded-lg ${activeCard.bg} flex items-center justify-center`}>
                      <activeCard.icon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-sm">{activeCard?.title}</h3>
                    <p className="text-gray-400 text-xs">
                      {activeFilter === "pendingLeaves" ? `${pendingLeaves.length} طلب`
                       : activeFilter === "all"          ? `${employees.length} موظف`
                       : activeFilter === "absent"       ? `${absentEmployees.length} موظف`
                       : activeFilter === "present"      ? `${presentRecords.length} موظف`
                       : activeFilter === "late"         ? `${lateRecords.length} موظف`
                       : `${onLeaveRecords.length} موظف`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveFilter(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                  <X size={15} />
                </button>
              </div>
              <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                {activeFilter === "all" && (
                  employees.length === 0
                    ? <EmptyMsg label="لا يوجد موظفون" />
                    : employees.map(emp => <EmpRow key={emp.id} emp={emp} />)
                )}
                {activeFilter === "present" && (
                  presentRecords.length === 0
                    ? <EmptyMsg label="لا يوجد حاضرون اليوم" />
                    : presentRecords.map(r => <AttRowComp key={r.id} r={r} />)
                )}
                {activeFilter === "absent" && (
                  absentEmployees.length === 0
                    ? <EmptyMsg label="لا يوجد غائبون اليوم" />
                    : absentEmployees.map(emp => <EmpRow key={emp.id} emp={emp} absent />)
                )}
                {activeFilter === "late" && (
                  lateRecords.length === 0
                    ? <EmptyMsg label="لا يوجد متأخرون اليوم" />
                    : lateRecords.map(r => <AttRowComp key={r.id} r={r} showLate />)
                )}
                {activeFilter === "onLeave" && (
                  onLeaveRecords.length === 0
                    ? <EmptyMsg label="لا يوجد في إجازة اليوم" />
                    : onLeaveRecords.map(r => <AttRowComp key={r.id} r={r} />)
                )}
                {activeFilter === "pendingLeaves" && (
                  pendingLeaves.length === 0
                    ? <EmptyMsg label="لا توجد إجازات معلقة" />
                    : pendingLeaves.map(l => <LeaveRowComp key={l.id} l={l} />)
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════════
          LIVE ATTENDANCE BOARD — كل الموظفين + حالتهم تلقائياً
      ══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ background: "rgba(2,8,23,0.6)", border: "1px solid rgba(0,245,255,0.1)", borderRadius: 18, overflow: "hidden", backdropFilter: "blur(16px)" }}
      >
        {/* Board Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2" style={{ borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={14} style={{ color: "#00f5ff" }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">سجل الحضور اليوم</h3>
              <p className="text-gray-400 text-xs">
                {computed.activeNow} موظف يعمل الآن · {computed.absent} غائب · تحديث تلقائي كل دقيقة
              </p>
            </div>
          </div>

          {/* Live indicator */}
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#00ff9f" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9f", boxShadow: "0 0 6px #00ff9f", display: "inline-block" }} />
            مباشر
          </motion.div>
        </div>

        {/* Board Filters */}
        <div className="px-4 py-2 flex items-center gap-2 flex-wrap" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {[
            { k: "all"      as BoardFilter, label: `الكل (${allRows.length})` },
            { k: "present"  as BoardFilter, label: `حاضر (${computed.presentOnly})` },
            { k: "late"     as BoardFilter, label: `متأخر (${computed.late})` },
            { k: "absent"   as BoardFilter, label: `غائب (${computed.absent})` },
            { k: "on_leave" as BoardFilter, label: `إجازة (${computed.onLeave})` },
          ].map(f => (
            <button key={f.k} onClick={() => setBoardFilter(f.k)}
              style={{
                padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                border: "none", cursor: "pointer", transition: "all 0.15s",
                background: boardFilter === f.k ? "rgba(0,245,255,0.15)" : "rgba(255,255,255,0.04)",
                color: boardFilter === f.k ? "#00f5ff" : "rgba(255,255,255,0.4)",
                outline: boardFilter === f.k ? "1px solid rgba(0,245,255,0.3)" : "1px solid transparent",
              }}>
              {f.label}
            </button>
          ))}
          <input
            value={boardSearch}
            onChange={e => setBoardSearch(e.target.value)}
            placeholder="بحث..."
            className="neon-input"
            style={{
              marginRight: "auto", padding: "4px 12px",
              borderRadius: 8, fontSize: 12, width: 120,
            }}
          />
        </div>

        {/* Board Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["الموظف","الفرع / القسم","الحالة","الدخول","الخروج","مدة العمل","تأخير"].map(h => (
                  <th key={h} style={{ textAlign: "right", color: "rgba(0,245,255,0.35)", fontWeight: 500, padding: "10px 16px", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderTop: "none" }}>
              {boardRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500 text-sm">
                    لا توجد نتائج
                  </td>
                </tr>
              ) : boardRows.map(({ emp, att, computedStatus }) => {
                const meta = STATUS_META[computedStatus];
                const isActiveNow = (computedStatus === "present" || computedStatus === "late") && att?.checkInTime && !att.checkOutTime;

                return (
                  <tr key={emp.id}
                    className={`hover:bg-white/[0.03] transition-colors ${isActiveNow ? "bg-emerald-950/20" : ""}`}>
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${meta.bg} ${meta.text}`}>
                          {emp.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{emp.fullName}</p>
                          {emp.jobTitle && <p className="text-gray-500 text-xs">{emp.jobTitle}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Branch / Dept */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {emp.branchName && (
                          <p className="flex items-center gap-1 text-xs text-gray-400">
                            <Building2 size={10} className="flex-shrink-0" />{emp.branchName}
                          </p>
                        )}
                        {emp.departmentName && (
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <Briefcase size={10} className="flex-shrink-0" />{emp.departmentName}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                    </td>

                    {/* Check-in */}
                    <td className="px-4 py-3">
                      {att?.checkInTime ? (
                        <span className="text-green-400 text-sm font-medium">
                          {fmt12(att.checkInTime)}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>

                    {/* Check-out */}
                    <td className="px-4 py-3">
                      {att?.checkOutTime ? (
                        <span className="text-red-400 text-sm font-medium">
                          {fmt12(att.checkOutTime)}
                        </span>
                      ) : att?.checkInTime ? (
                        <span className="text-gray-500 text-xs">جارٍ</span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>

                    {/* Working duration */}
                    <td className="px-4 py-3">
                      {isActiveNow && att?.checkInTime ? (
                        <LiveTimer checkInTime={att.checkInTime} />
                      ) : att?.workingHours && att.workingHours > 0 ? (
                        <span className="text-blue-400 text-xs font-medium">
                          {att.workingHours.toFixed(1)}h
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>

                    {/* Late minutes */}
                    <td className="px-4 py-3">
                      {(att?.lateMinutes ?? 0) > 0 ? (
                        <span className="text-amber-400 text-xs font-medium">
                          {att!.lateMinutes} د
                        </span>
                      ) : att?.checkInTime ? (
                        <span className="text-emerald-500 text-xs">في الوقت</span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Board Footer */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 11 }}>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>
            عرض {boardRows.length} من {allRows.length} موظف
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {[
              { color: "#10b981", label: "جارٍ العمل" },
              { color: "#f59e0b", label: "متأخر" },
              { color: "#3b82f6", label: "انصرف" },
              { color: "#6b7280", label: "غائب" },
            ].map(b => (
              <span key={b.label} style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.3)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: b.color, boxShadow: `0 0 4px ${b.color}` }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
          style={{ background: "rgba(2,8,23,0.6)", border: "1px solid rgba(0,245,255,0.1)", borderRadius: 18, padding: 20, backdropFilter: "blur(16px)" }}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16, opacity: 0.85 }}>إحصائيات الحضور</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  cursor={{ fill: "rgba(0,245,255,0.03)" }}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,245,255,0.2)", background: "rgba(2,8,23,0.95)", color: "#fff", fontSize: 12, backdropFilter: "blur(12px)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            borderRadius: 18, padding: 24, position: "relative", overflow: "hidden",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(0,245,255,0.08) 0%, rgba(168,85,247,0.06) 100%)",
            border: "1px solid rgba(0,245,255,0.2)",
            boxShadow: "0 0 40px rgba(0,245,255,0.06)",
          }}
        >
          {/* Glow blobs */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, background: "rgba(0,245,255,0.08)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 120, height: 120, background: "rgba(168,85,247,0.08)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>نسبة الحضور</h3>
            <p style={{ fontSize: 12, color: "rgba(0,245,255,0.5)" }}>الموظفون النشطون اليوم</p>
          </div>

          <div style={{ position: "relative", zIndex: 1, marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: "#00f5ff", lineHeight: 1, textShadow: "0 0 30px rgba(0,245,255,0.4)" }}>{rate}%</span>
              <span style={{
                marginBottom: 4, padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                background: rate >= 80 ? "rgba(16,185,129,0.15)" : rate >= 50 ? "rgba(245,158,11,0.15)" : "rgba(244,63,94,0.15)",
                color: rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#f43f5e",
              }}>
                {rate >= 80 ? "ممتاز" : rate >= 50 ? "متوسط" : "ضعيف"}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ width: "100%", height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <motion.div
                style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #00f5ff, #a855f7)" }}
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ delay: 0.7, duration: 0.9, ease: "easeOut" }}
              />
            </div>

            {/* Mini stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "يعمل الآن", val: computed.activeNow,  color: "#10b981" },
                { label: "انصرف",     val: allRows.filter(r => r.computedStatus === "checked_out").length, color: "#00f5ff" },
                { label: "غائب",      val: computed.absent,      color: "#f43f5e" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: s.color, textShadow: `0 0 12px ${s.color}50` }}>{s.val}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              {computed.present} حاضر من أصل {computed.total} موظف
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Tiny sub-components ───────────────────────────────────────────────────────
function EmptyMsg({ label }: { label: string }) {
  return <div className="text-center py-8 text-gray-400 text-sm">{label}</div>;
}

function EmpRow({ emp, absent }: { emp: Employee; absent?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${absent ? "bg-rose-900/50 text-rose-300" : "bg-blue-900/50 text-blue-300"}`}>
        {emp.fullName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{emp.fullName}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {emp.jobTitle     && <span className="text-gray-400 text-xs">{emp.jobTitle}</span>}
          {emp.departmentName && <span className="text-gray-500 text-xs">· {emp.departmentName}</span>}
        </div>
      </div>
      {absent && <span className="text-xs bg-rose-900/40 text-rose-400 px-2 py-0.5 rounded-full">غائب</span>}
      {emp.phone && <span className="flex items-center gap-1 text-gray-500 text-xs"><Phone size={10} />{emp.phone}</span>}
    </div>
  );
}

function AttRowComp({ r, showLate }: { r: AttRecord; showLate?: boolean }) {
  const statusColor =
    r.status === "late" ? "bg-amber-900/40 text-amber-400"
    : r.status === "on_leave" ? "bg-purple-900/40 text-purple-400"
    : "bg-emerald-900/40 text-emerald-400";
  const statusLabel =
    r.status === "late" ? "متأخر" : r.status === "on_leave" ? "إجازة" : "حاضر";
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      <div className="w-8 h-8 rounded-full bg-[#0f1623] border border-white/10 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
        {(r.employeeName || "?").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{r.employeeName}</p>
        <div className="flex items-center gap-2 text-gray-500 text-xs flex-wrap">
          {r.departmentName && <span>{r.departmentName}</span>}
          <span>دخول: <span className="text-green-400">{fmt12(r.checkInTime)}</span></span>
          {r.checkOutTime && <span>· خروج: <span className="text-red-400">{fmt12(r.checkOutTime)}</span></span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
        {showLate && (r.lateMinutes ?? 0) > 0 && <span className="text-xs text-amber-400">{r.lateMinutes} د</span>}
        {r.workingHours != null && r.workingHours > 0 && <span className="text-xs text-gray-500">{r.workingHours.toFixed(1)}h</span>}
      </div>
    </div>
  );
}

function LeaveRowComp({ l }: { l: LeaveRecord }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      <div className="w-8 h-8 rounded-full bg-cyan-900/40 flex items-center justify-center text-xs font-bold text-cyan-300 flex-shrink-0">
        {(l.employeeName || "?").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{l.employeeName}</p>
        <p className="text-gray-500 text-xs">{l.startDate} ← {l.endDate} ({l.totalDays} يوم)</p>
        {l.reason && <p className="text-gray-500 text-xs truncate">"{l.reason}"</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded-full">
          {LEAVE_TYPE_AR[l.leaveType] ?? l.leaveType}
        </span>
        <span className="text-xs text-amber-400">{l.totalDays} يوم</span>
      </div>
    </div>
  );
}
