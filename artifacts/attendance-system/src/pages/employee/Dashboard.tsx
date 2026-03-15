import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useCheckIn, useCheckOut, useStartBreak, useEndBreak, useGetTodayAttendance } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  LogIn, LogOut, Coffee, Clock, CalendarCheck,
  CalendarX, AlarmClock, Timer, CheckCircle2, AlertCircle, MapPin
} from "lucide-react";

interface MyStats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkingHours: number;
  totalLateMinutes: number;
  recentRecords: Array<{
    date: string;
    status: string;
    workingHours: number | null;
    lateMinutes: number | null;
    checkInTime: string | null;
    checkOutTime: string | null;
  }>;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: "حاضر", color: "text-emerald-700", bg: "bg-emerald-100" },
  late:    { label: "متأخر", color: "text-amber-700",  bg: "bg-amber-100"  },
  absent:  { label: "غائب",  color: "text-red-700",    bg: "bg-red-100"    },
  on_leave:{ label: "إجازة", color: "text-purple-700", bg: "bg-purple-100" },
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: todayRecord, isLoading: todayLoading } = useGetTodayAttendance();
  const [now, setNow] = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: stats } = useQuery<MyStats>({
    queryKey: ["/api/attendance/my-stats"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/my-stats", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError("المتصفح لا يدعم تحديد الموقع"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setLocationError("يرجى تفعيل الموقع الجغرافي")
    );
  }, []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
    queryClient.invalidateQueries({ queryKey: ["/api/attendance/my-stats"] });
  };

  const checkInMut  = useCheckIn ({ mutation: { onSuccess: invalidate } });
  const checkOutMut = useCheckOut({ mutation: { onSuccess: invalidate } });
  const startBreak  = useStartBreak({ mutation: { onSuccess: invalidate } });
  const endBreak    = useEndBreak  ({ mutation: { onSuccess: invalidate } });

  const handleAction = async (action: "in" | "out" | "sb" | "eb") => {
    setActionError("");
    try {
      if (action === "in")  await checkInMut.mutateAsync({ data: { latitude: coords?.lat, longitude: coords?.lng } });
      if (action === "out") await checkOutMut.mutateAsync({ data: { latitude: coords?.lat, longitude: coords?.lng } });
      if (action === "sb")  await startBreak.mutateAsync();
      if (action === "eb")  await endBreak.mutateAsync();
    } catch (e: any) {
      setActionError(e?.message ?? "حدث خطأ");
    }
  };

  const isIn    = !!todayRecord?.checkInTime;
  const isOut   = !!todayRecord?.checkOutTime;
  const onBreak = !!todayRecord?.breakStartTime && !todayRecord?.breakEndTime;

  const statCards = [
    { label: "أيام الحضور",     value: stats?.presentDays ?? 0,     icon: CalendarCheck, color: "from-emerald-500 to-emerald-600", sub: "هذا الشهر" },
    { label: "أيام الغياب",     value: stats?.absentDays  ?? 0,     icon: CalendarX,     color: "from-red-500 to-red-600",         sub: "هذا الشهر" },
    { label: "أيام التأخير",    value: stats?.lateDays    ?? 0,     icon: AlarmClock,    color: "from-amber-500 to-amber-600",     sub: "هذا الشهر" },
    { label: "ساعات العمل",     value: `${stats?.totalWorkingHours ?? 0}`, icon: Timer, color: "from-blue-500 to-blue-600",    sub: "هذا الشهر" },
  ];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مرحباً، {user?.fullName} 👋</h1>
          <p className="text-muted-foreground mt-1">
            {format(now, "EEEE، d MMMM yyyy", { locale: arSA })}
          </p>
        </div>
        <div className="text-4xl font-bold text-primary tabular-nums">
          {format(now, "HH:mm:ss")}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`bg-gradient-to-br ${c.color} rounded-2xl p-5 text-white shadow-lg`}
          >
            <div className="flex items-center justify-between mb-3">
              <c.icon className="w-6 h-6 opacity-80" />
              <span className="text-xs opacity-70">{c.sub}</span>
            </div>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm opacity-80 mt-1">{c.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Attendance Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action card */}
        <div className="bg-card rounded-3xl p-7 border border-border shadow-lg space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            تسجيل الحضور والانصراف
          </h2>

          {locationError && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl text-sm border border-amber-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {locationError}
            </div>
          )}
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {actionError}
            </div>
          )}

          {/* Check in / out buttons */}
          <div className="flex gap-4 justify-center">
            <button
              disabled={isIn || checkInMut.isPending}
              onClick={() => handleAction("in")}
              className={`flex flex-col items-center justify-center w-36 h-36 rounded-2xl shadow-lg text-white font-bold text-lg transition-all duration-200 ${
                isIn
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-b from-emerald-400 to-emerald-600 hover:-translate-y-1 hover:shadow-emerald-500/30 active:translate-y-0"
              }`}
            >
              {isIn ? <CheckCircle2 className="w-10 h-10 mb-2 text-gray-400" /> : <LogIn className="w-10 h-10 mb-2" />}
              حضور
            </button>

            <button
              disabled={!isIn || isOut || checkOutMut.isPending}
              onClick={() => handleAction("out")}
              className={`flex flex-col items-center justify-center w-36 h-36 rounded-2xl shadow-lg text-white font-bold text-lg transition-all duration-200 ${
                !isIn || isOut
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-b from-rose-400 to-rose-600 hover:-translate-y-1 hover:shadow-rose-500/30 active:translate-y-0"
              }`}
            >
              {isOut ? <CheckCircle2 className="w-10 h-10 mb-2 text-gray-400" /> : <LogOut className="w-10 h-10 mb-2" />}
              انصراف
            </button>
          </div>

          {/* Break */}
          <div className="flex justify-center">
            {!onBreak ? (
              <button
                disabled={!isIn || isOut || startBreak.isPending}
                onClick={() => handleAction("sb")}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-100 text-amber-700 font-semibold hover:bg-amber-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Coffee className="w-4 h-4" />
                بدء استراحة
              </button>
            ) : (
              <button
                onClick={() => handleAction("eb")}
                disabled={endBreak.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/25"
              >
                <Coffee className="w-4 h-4" />
                إنهاء الاستراحة
              </button>
            )}
          </div>

          {/* Today summary */}
          {todayRecord && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">الحضور</p>
                <p className="font-bold text-foreground">{todayRecord.checkInTime ? format(new Date(todayRecord.checkInTime), "HH:mm") : "--:--"}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">الانصراف</p>
                <p className="font-bold text-foreground">{todayRecord.checkOutTime ? format(new Date(todayRecord.checkOutTime), "HH:mm") : "--:--"}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">ساعات العمل</p>
                <p className="font-bold text-foreground">{todayRecord.workingHours?.toFixed(1) ?? "0.0"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-card rounded-3xl p-7 border border-border shadow-lg flex flex-col">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            موقعي الحالي
          </h2>
          <div className="flex-1 min-h-[220px] rounded-2xl overflow-hidden bg-gray-100 relative">
            {coords ? (
              <iframe
                width="100%" height="100%"
                frameBorder="0" scrolling="no"
                src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`}
                className="absolute inset-0"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MapPin className="w-8 h-8 opacity-30" />
                <span className="text-sm">{locationError || "جاري تحديد الموقع..."}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Records */}
      {stats?.recentRecords && stats.recentRecords.length > 0 && (
        <div className="bg-card rounded-3xl p-7 border border-border shadow-lg">
          <h2 className="text-lg font-bold text-foreground mb-5">سجل الحضور الأخير</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right">
                  <th className="pb-3 text-muted-foreground font-medium">التاريخ</th>
                  <th className="pb-3 text-muted-foreground font-medium">الحالة</th>
                  <th className="pb-3 text-muted-foreground font-medium">وقت الحضور</th>
                  <th className="pb-3 text-muted-foreground font-medium">وقت الانصراف</th>
                  <th className="pb-3 text-muted-foreground font-medium">ساعات العمل</th>
                  <th className="pb-3 text-muted-foreground font-medium">التأخير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentRecords.map((r) => {
                  const s = STATUS_MAP[r.status] ?? { label: r.status, color: "text-gray-600", bg: "bg-gray-100" };
                  return (
                    <tr key={r.date} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium">{r.date}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="py-3 tabular-nums">
                        {r.checkInTime ? format(new Date(r.checkInTime), "HH:mm") : "--"}
                      </td>
                      <td className="py-3 tabular-nums">
                        {r.checkOutTime ? format(new Date(r.checkOutTime), "HH:mm") : "--"}
                      </td>
                      <td className="py-3 tabular-nums">
                        {r.workingHours != null ? `${r.workingHours.toFixed(1)} س` : "--"}
                      </td>
                      <td className="py-3 tabular-nums">
                        {r.lateMinutes ? <span className="text-amber-600">{r.lateMinutes} د</span> : <span className="text-emerald-600">في الوقت</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
