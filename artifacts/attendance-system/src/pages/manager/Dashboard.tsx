import { useGetDashboardStats, useGetAttendanceRecords, useGetEmployees } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, Users, UserCheck, UserX, Clock, CheckCircle2, XCircle, AlarmClock } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { useAuth } from "@/lib/auth";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  present:  { label: "حاضر",   color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  dot: "bg-emerald-500" },
  late:     { label: "متأخر",  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",      dot: "bg-amber-500"   },
  absent:   { label: "غائب",   color: "text-red-700",     bg: "bg-red-50 border-red-200",           dot: "bg-red-500"     },
  on_leave: { label: "إجازة",  color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",    dot: "bg-purple-500"  },
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const today = new Date().toISOString().split("T")[0];
  const { data: attendance, isLoading: attLoading } = useGetAttendanceRecords({ date: today } as any);
  const { data: employees } = useGetEmployees();

  if (statsLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const statCards = [
    { title: "إجمالي الموظفين", value: stats?.totalEmployees ?? 0, icon: Users,      color: "from-blue-500 to-blue-600"     },
    { title: "حاضر اليوم",     value: stats?.presentToday  ?? 0, icon: UserCheck,   color: "from-emerald-500 to-emerald-600" },
    { title: "غائب اليوم",     value: stats?.absentToday   ?? 0, icon: UserX,       color: "from-red-500 to-red-600"         },
    { title: "متأخر اليوم",    value: stats?.lateToday     ?? 0, icon: AlarmClock,  color: "from-amber-500 to-amber-600"     },
  ];

  const attRecords = Array.isArray(attendance) ? attendance : [];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">مرحباً، {user?.fullName} 👋</h1>
        <p className="text-muted-foreground mt-1">
          {format(new Date(), "EEEE، d MMMM yyyy", { locale: arSA })} · لوحة المشرف
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`bg-gradient-to-br ${c.color} rounded-2xl p-6 text-white shadow-lg`}
          >
            <c.icon className="w-7 h-7 opacity-80 mb-3" />
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm opacity-80 mt-1">{c.title}</div>
          </motion.div>
        ))}
      </div>

      {/* Attendance rate bar */}
      {stats && (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-foreground">نسبة الحضور اليوم</h3>
            <span className="text-2xl font-extrabold text-primary">{stats.attendanceRate}%</span>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.attendanceRate}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span><span>100%</span>
          </div>
        </div>
      )}

      {/* Today's attendance list */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">حضور اليوم</h3>
          {attLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>

        {attRecords.length === 0 && !attLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <UserX className="w-12 h-12 mb-3 opacity-30" />
            <p>لا توجد سجلات حضور لهذا اليوم</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-right">
                  <th className="px-6 py-3 text-muted-foreground font-medium">الموظف</th>
                  <th className="px-6 py-3 text-muted-foreground font-medium">الحالة</th>
                  <th className="px-6 py-3 text-muted-foreground font-medium">وقت الحضور</th>
                  <th className="px-6 py-3 text-muted-foreground font-medium">وقت الانصراف</th>
                  <th className="px-6 py-3 text-muted-foreground font-medium">ساعات العمل</th>
                  <th className="px-6 py-3 text-muted-foreground font-medium">التأخير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attRecords.map((r: any) => {
                  const s = STATUS_MAP[r.status] ?? { label: r.status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" };
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                            {r.employeeName?.charAt(0) ?? "؟"}
                          </div>
                          <span className="font-medium">{r.employeeName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 tabular-nums">
                        {r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "—"}
                      </td>
                      <td className="px-6 py-4 tabular-nums">
                        {r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "—"}
                      </td>
                      <td className="px-6 py-4 tabular-nums">
                        {r.workingHours != null ? `${Number(r.workingHours).toFixed(1)} س` : "—"}
                      </td>
                      <td className="px-6 py-4 tabular-nums">
                        {r.lateMinutes
                          ? <span className="text-amber-600 font-medium">{r.lateMinutes} د</span>
                          : <span className="text-emerald-600 font-medium">في الوقت</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
