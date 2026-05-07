import { useState, useEffect, useCallback } from "react";
import {
  Users, UserCheck, UserX, Clock, Plane, CalendarDays,
  Loader2, X, ChevronLeft, MapPin, Phone, Briefcase,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
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
}

interface AttRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  lateMinutes: number | null;
  workingHours: number | null;
  status: string;
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

type FilterKey = "all" | "present" | "absent" | "late" | "onLeave" | "pendingLeaves";

function fmt12(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const LEAVE_TYPE_AR: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة", unpaid: "بدون راتب", other: "أخرى",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAtt, setTodayAtt] = useState<AttRecord[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const BASE = import.meta.env.BASE_URL;

  const fetchAll = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [s, emps, att, leaves] = await Promise.all([
        fetch(`${BASE}api/reports/dashboard`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/employees`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/attendance?date=${today}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/leaves?status=pending`, { credentials: "include" }).then(r => r.json()),
      ]);
      setStats(s);
      setEmployees(Array.isArray(emps) ? emps.filter((e: Employee) => e.isActive) : []);
      setTodayAtt(Array.isArray(att) ? att : []);
      setPendingLeaves(Array.isArray(leaves) ? leaves : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Compute filtered lists ──────────────────────────────────────────────────
  const presentRecords = todayAtt.filter(r => r.status === "present" || r.status === "late");
  const lateRecords    = todayAtt.filter(r => r.status === "late");
  const onLeaveRecords = todayAtt.filter(r => r.status === "on_leave");

  // Employees with attendance record IDs
  const attendedIds = new Set(todayAtt.map(r => r.employeeId));
  const onLeaveIds  = new Set(onLeaveRecords.map(r => r.employeeId));
  const absentEmployees = employees.filter(
    e => !attendedIds.has(e.id) && !onLeaveIds.has(e.id),
  );

  // ── Stat cards config ───────────────────────────────────────────────────────
  const cards = [
    {
      key: "all" as FilterKey,
      title: "إجمالي الموظفين",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      color: "blue",
      bg: "bg-blue-600",
      ring: "ring-blue-500",
      glow: "shadow-blue-500/30",
      pill: "bg-blue-900/40 text-blue-300",
    },
    {
      key: "present" as FilterKey,
      title: "حاضر اليوم",
      value: stats?.presentToday ?? 0,
      icon: UserCheck,
      color: "emerald",
      bg: "bg-emerald-600",
      ring: "ring-emerald-500",
      glow: "shadow-emerald-500/30",
      pill: "bg-emerald-900/40 text-emerald-300",
    },
    {
      key: "absent" as FilterKey,
      title: "غائب اليوم",
      value: stats?.absentToday ?? 0,
      icon: UserX,
      color: "rose",
      bg: "bg-rose-600",
      ring: "ring-rose-500",
      glow: "shadow-rose-500/30",
      pill: "bg-rose-900/40 text-rose-300",
    },
    {
      key: "late" as FilterKey,
      title: "متأخر اليوم",
      value: stats?.lateToday ?? 0,
      icon: Clock,
      color: "amber",
      bg: "bg-amber-600",
      ring: "ring-amber-500",
      glow: "shadow-amber-500/30",
      pill: "bg-amber-900/40 text-amber-300",
    },
    {
      key: "onLeave" as FilterKey,
      title: "في إجازة",
      value: stats?.onLeaveToday ?? 0,
      icon: Plane,
      color: "purple",
      bg: "bg-purple-600",
      ring: "ring-purple-500",
      glow: "shadow-purple-500/30",
      pill: "bg-purple-900/40 text-purple-300",
    },
    {
      key: "pendingLeaves" as FilterKey,
      title: "إجازات معلقة",
      value: stats?.pendingLeaves ?? 0,
      icon: CalendarDays,
      color: "cyan",
      bg: "bg-cyan-600",
      ring: "ring-cyan-500",
      glow: "shadow-cyan-500/30",
      pill: "bg-cyan-900/40 text-cyan-300",
    },
  ];

  const activeCard = cards.find(c => c.key === activeFilter);

  // ── Panel content ───────────────────────────────────────────────────────────
  function renderPanelContent() {
    if (!activeFilter) return null;

    if (activeFilter === "all") {
      return employees.map(emp => (
        <EmployeeRow key={emp.id} emp={emp} />
      ));
    }

    if (activeFilter === "present") {
      if (presentRecords.length === 0) return <Empty label="لا يوجد حاضرون اليوم" />;
      return presentRecords.map(r => (
        <AttRow key={r.id} r={r} />
      ));
    }

    if (activeFilter === "absent") {
      if (absentEmployees.length === 0) return <Empty label="لا يوجد غائبون اليوم" />;
      return absentEmployees.map(emp => (
        <EmployeeRow key={emp.id} emp={emp} absent />
      ));
    }

    if (activeFilter === "late") {
      if (lateRecords.length === 0) return <Empty label="لا يوجد متأخرون اليوم" />;
      return lateRecords.map(r => (
        <AttRow key={r.id} r={r} showLate />
      ));
    }

    if (activeFilter === "onLeave") {
      if (onLeaveRecords.length === 0) return <Empty label="لا يوجد موظفون في إجازة اليوم" />;
      return onLeaveRecords.map(r => (
        <AttRow key={r.id} r={r} />
      ));
    }

    if (activeFilter === "pendingLeaves") {
      if (pendingLeaves.length === 0) return <Empty label="لا توجد إجازات معلقة" />;
      return pendingLeaves.map(l => (
        <LeaveRow key={l.id} l={l} />
      ));
    }

    return null;
  }

  const chartData = [
    { name: "حاضر", value: stats?.presentToday ?? 0, color: "#10b981" },
    { name: "غائب", value: stats?.absentToday ?? 0, color: "#f43f5e" },
    { name: "متأخر", value: stats?.lateToday ?? 0, color: "#f59e0b" },
    { name: "إجازة", value: stats?.onLeaveToday ?? 0, color: "#a855f7" },
  ];

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-1" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">لوحة التحكم</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── Stat Cards (Clickable) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const isActive = activeFilter === card.key;
          return (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              onClick={() => setActiveFilter(isActive ? null : card.key)}
              className={`
                relative w-full text-right rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer
                ${isActive
                  ? `ring-2 ${card.ring} border-transparent bg-[#1e2d44] shadow-lg ${card.glow}`
                  : "border-white/10 bg-[#1a2234] hover:bg-[#1e2d44] hover:border-white/20 shadow-sm"}
              `}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className={`absolute top-3 left-3 w-2 h-2 rounded-full ${card.bg} animate-pulse`} />
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-400 font-medium mb-1">{card.title}</p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-white leading-none">
                    {card.value}
                  </p>
                  <p className={`text-xs mt-2 px-2 py-0.5 rounded-full inline-block font-medium ${card.pill}`}>
                    {isActive ? "اضغط للإغلاق" : "اضغط للتفاصيل"}
                  </p>
                </div>
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${card.bg} flex items-center justify-center text-white shadow-inner flex-shrink-0`}>
                  <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Detail Panel ── */}
      <AnimatePresence>
        {activeFilter && (
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden">
              {/* Panel header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b border-white/10`}>
                <div className="flex items-center gap-2">
                  {activeCard && (
                    <div className={`w-7 h-7 rounded-lg ${activeCard.bg} flex items-center justify-center`}>
                      <activeCard.icon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-sm">{activeCard?.title}</h3>
                    <p className="text-gray-400 text-xs">
                      {activeFilter === "pendingLeaves"
                        ? `${pendingLeaves.length} طلب`
                        : activeFilter === "all"
                        ? `${employees.length} موظف`
                        : activeFilter === "absent"
                        ? `${absentEmployees.length} موظف`
                        : activeFilter === "present"
                        ? `${presentRecords.length} موظف`
                        : activeFilter === "late"
                        ? `${lateRecords.length} موظف`
                        : `${onLeaveRecords.length} موظف`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveFilter(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Panel body */}
              <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                {renderPanelContent()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bar chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-5 shadow-lg border border-border"
        >
          <h3 className="text-base font-bold mb-5 text-foreground">إحصائيات اليوم</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 13 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "#1e293b", color: "#fff", fontSize: 13 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Attendance rate */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-7 shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-36 h-36 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h3 className="text-lg font-bold text-white mb-1">نسبة الحضور</h3>
            <p className="text-blue-200 text-sm">معدل الالتزام بالدوام اليوم</p>
          </div>

          <div className="relative z-10 mt-4">
            <div className="flex items-end gap-3">
              <span className="text-6xl font-extrabold text-white leading-none">
                {stats?.attendanceRate ?? 0}%
              </span>
              <span className={`mb-1 px-3 py-1 rounded-lg text-sm font-bold ${
                (stats?.attendanceRate ?? 0) >= 80
                  ? "bg-emerald-400/20 text-emerald-300"
                  : (stats?.attendanceRate ?? 0) >= 50
                  ? "bg-amber-400/20 text-amber-300"
                  : "bg-rose-400/20 text-rose-300"
              }`}>
                {(stats?.attendanceRate ?? 0) >= 80 ? "ممتاز" : (stats?.attendanceRate ?? 0) >= 50 ? "متوسط" : "ضعيف"}
              </span>
            </div>

            <div className="w-full bg-white/15 h-3 rounded-full mt-5 overflow-hidden">
              <motion.div
                className="bg-white h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats?.attendanceRate ?? 0}%` }}
                transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              />
            </div>

            <div className="flex justify-between text-xs text-blue-200 mt-2">
              <span>{stats?.presentToday ?? 0} حاضر</span>
              <span>من {stats?.totalEmployees ?? 0} موظف</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-gray-400 text-sm">{label}</div>
  );
}

function EmployeeRow({ emp, absent }: { emp: Employee; absent?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        absent ? "bg-rose-900/50 text-rose-300" : "bg-blue-900/50 text-blue-300"
      }`}>
        {emp.fullName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{emp.fullName}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {emp.jobTitle && (
            <span className="flex items-center gap-1 text-gray-400 text-xs">
              <Briefcase size={10} />{emp.jobTitle}
            </span>
          )}
          {emp.departmentName && (
            <span className="text-gray-500 text-xs">· {emp.departmentName}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {emp.phone && (
          <span className="flex items-center gap-1 text-gray-400 text-xs">
            <Phone size={10} />{emp.phone}
          </span>
        )}
        {absent && (
          <span className="text-xs bg-rose-900/40 text-rose-400 px-2 py-0.5 rounded-full">غائب</span>
        )}
      </div>
    </div>
  );
}

function AttRow({ r, showLate }: { r: AttRecord; showLate?: boolean }) {
  const statusColor =
    r.status === "present" ? "bg-emerald-900/40 text-emerald-400"
    : r.status === "late" ? "bg-amber-900/40 text-amber-400"
    : r.status === "on_leave" ? "bg-purple-900/40 text-purple-400"
    : "bg-gray-800 text-gray-400";

  const statusLabel =
    r.status === "present" ? "حاضر"
    : r.status === "late" ? "متأخر"
    : r.status === "on_leave" ? "في إجازة"
    : r.status;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#0f1623] border border-white/10 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
        {(r.employeeName || "?").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{r.employeeName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {r.departmentName && <span className="text-gray-400 text-xs">{r.departmentName}</span>}
          <span className="text-gray-600 text-xs">
            دخول: <span className="text-green-400">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—"}</span>
            {r.checkOutTime && (
              <> · خروج: <span className="text-red-400">{new Date(r.checkOutTime).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true })}</span></>
            )}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
        {showLate && (r.lateMinutes ?? 0) > 0 && (
          <span className="text-xs text-amber-400">{r.lateMinutes} د تأخير</span>
        )}
        {r.workingHours != null && r.workingHours > 0 && (
          <span className="text-xs text-gray-500">{r.workingHours.toFixed(1)}h</span>
        )}
      </div>
    </div>
  );
}

function LeaveRow({ l }: { l: LeaveRecord }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
      <div className="w-9 h-9 rounded-full bg-cyan-900/40 flex items-center justify-center text-sm font-bold text-cyan-300 flex-shrink-0">
        {(l.employeeName || "?").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{l.employeeName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {l.departmentName && <span className="text-gray-400 text-xs">{l.departmentName}</span>}
          <span className="text-gray-500 text-xs">
            {l.startDate} → {l.endDate} ({l.totalDays} يوم)
          </span>
        </div>
        {l.reason && (
          <p className="text-gray-500 text-xs mt-0.5 truncate">"{l.reason}"</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
          {LEAVE_TYPE_AR[l.leaveType] ?? l.leaveType}
        </span>
        <span className="text-xs text-amber-400">{l.totalDays} يوم</span>
      </div>
    </div>
  );
}
