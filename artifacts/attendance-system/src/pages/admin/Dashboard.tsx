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
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 p-1" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground">لوحة التحكم</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a2234] border border-white/10 text-gray-400 hover:text-white text-xs transition-colors"
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
          return (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              onClick={() => setActiveFilter(isActive ? null : card.key)}
              className={`
                relative w-full text-right rounded-2xl p-4 border transition-all duration-200
                ${isActive
                  ? `ring-2 ${card.ring} border-transparent bg-[#1e2d44] shadow-lg`
                  : "border-white/10 bg-[#1a2234] hover:bg-[#1e2d44] hover:border-white/20"}
              `}
            >
              {isActive && (
                <span className={`absolute top-2.5 left-2.5 w-2 h-2 rounded-full ${card.bg} animate-pulse`} />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">{card.title}</p>
                  <p className="text-3xl font-extrabold text-white leading-none">{card.value}</p>
                  <p className={`text-xs mt-2 px-2 py-0.5 rounded-full inline-block font-medium ${card.pill}`}>
                    {isActive ? "اضغط للإغلاق" : "التفاصيل"}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center text-white flex-shrink-0`}>
                  <card.icon className="w-5 h-5" />
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
            <div className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
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
        className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden"
      >
        {/* Board Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Users size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">سجل الحضور اليوم</h3>
              <p className="text-gray-400 text-xs">
                {computed.activeNow} موظف يعمل الآن · {computed.absent} غائب · تحديث تلقائي كل دقيقة
              </p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            مباشر
          </div>
        </div>

        {/* Board Filters */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-wrap">
          {[
            { k: "all"           as BoardFilter, label: `الكل (${allRows.length})` },
            { k: "present"       as BoardFilter, label: `حاضر (${computed.presentOnly})` },
            { k: "late"          as BoardFilter, label: `متأخر (${computed.late})` },
            { k: "absent"        as BoardFilter, label: `غائب (${computed.absent})` },
            { k: "on_leave"      as BoardFilter, label: `إجازة (${computed.onLeave})` },
          ].map(f => (
            <button key={f.k} onClick={() => setBoardFilter(f.k)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                boardFilter === f.k ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white bg-white/5"
              }`}>
              {f.label}
            </button>
          ))}
          <input
            value={boardSearch}
            onChange={e => setBoardSearch(e.target.value)}
            placeholder="بحث..."
            className="mr-auto bg-[#0f1623] border border-white/10 rounded-lg px-3 py-1 text-white text-xs outline-none focus:border-blue-500 w-28"
          />
        </div>

        {/* Board Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">الموظف</th>
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">الفرع / القسم</th>
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">الحالة</th>
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">الدخول</th>
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">الخروج</th>
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">مدة العمل</th>
                <th className="text-right text-gray-500 font-medium px-4 py-2.5 text-xs">تأخير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
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
        <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
          <span>
            عرض {boardRows.length} من {allRows.length} موظف
          </span>
          <div className="flex items-center gap-3">
            {[
              { color: "bg-emerald-400", label: "جارٍ العمل" },
              { color: "bg-amber-400",   label: "متأخر" },
              { color: "bg-blue-400",    label: "انصرف" },
              { color: "bg-gray-500",    label: "غائب" },
            ].map(b => (
              <span key={b.label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${b.color}`} />
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
          className="bg-card rounded-2xl p-5 shadow-lg border border-border"
        >
          <h3 className="text-sm font-bold mb-4 text-foreground">إحصائيات الحضور</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "#fff", fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={44}>
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
          className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h3 className="text-base font-bold text-white mb-0.5">نسبة الحضور</h3>
            <p className="text-blue-200 text-xs">الموظفون النشطون اليوم</p>
          </div>

          <div className="relative z-10 mt-4 space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-extrabold text-white leading-none">{rate}%</span>
              <span className={`mb-0.5 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                rate >= 80 ? "bg-emerald-400/20 text-emerald-300"
                : rate >= 50 ? "bg-amber-400/20 text-amber-300"
                : "bg-rose-400/20 text-rose-300"
              }`}>
                {rate >= 80 ? "ممتاز" : rate >= 50 ? "متوسط" : "ضعيف"}
              </span>
            </div>

            <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
              <motion.div
                className="bg-white h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${rate}%` }}
                transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
              />
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "يعمل الآن", val: computed.activeNow, color: "text-emerald-300" },
                { label: "انصرف",     val: allRows.filter(r => r.computedStatus === "checked_out").length, color: "text-blue-200" },
                { label: "غائب",      val: computed.absent, color: "text-rose-300" },
              ].map(s => (
                <div key={s.label} className="text-center bg-white/10 rounded-lg py-1.5">
                  <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-blue-200 text-xs">{s.label}</p>
                </div>
              ))}
            </div>

            <p className="text-blue-200 text-xs text-center">
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
