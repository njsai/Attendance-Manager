import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Clock, MapPin, LogIn, LogOut, AlertTriangle, Calendar, CheckCircle, XCircle, Timer, Camera } from "lucide-react";

interface AttendanceRecord {
  id: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number | null;
  lateMinutes: number | null;
  status: string;
}

interface Stats {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkingHours: number;
  totalLateMinutes: number;
  recentRecords: AttendanceRecord[];
  month: string;
}

interface TodayRecord {
  id: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number | null;
  lateMinutes: number | null;
  status: string;
  checkInLat: number | null;
  checkInLng: number | null;
}

function fmt12(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return "—"; }
}

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function statusLabel(s: string) {
  if (s === "present") return { text: "حاضر", color: "text-green-400" };
  if (s === "late") return { text: "متأخر", color: "text-yellow-400" };
  if (s === "absent") return { text: "غائب", color: "text-red-400" };
  if (s === "leave") return { text: "إجازة", color: "text-blue-400" };
  return { text: s, color: "text-gray-400" };
}

function WorkTimer({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(checkInTime).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [checkInTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-1">مدة الدوام</p>
      <div className="text-4xl font-mono font-bold text-green-400 tracking-widest">{pad(h)}:{pad(m)}:{pad(s)}</div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const BASE = import.meta.env.BASE_URL;

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, statsRes] = await Promise.all([
        fetch(`${BASE}api/attendance/today`, { credentials: "include" }),
        fetch(`${BASE}api/attendance/my-stats`, { credentials: "include" }),
      ]);
      setToday(await todayRes.json());
      setStats(await statsRes.json());
    } catch { setError("فشل تحميل البيانات"); }
    finally { setLoading(false); }
  }, [BASE]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve(null), { timeout: 8000 }
      );
    });

  const doAction = async (endpoint: string) => {
    setActionLoading(true); setError(""); setSuccess("");
    try {
      const loc = await getLocation();
      const res = await fetch(`${BASE}api/attendance/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(loc || {}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "فشل"); return; }
      setSuccess(endpoint === "check-in" ? "تم تسجيل الحضور بنجاح ✓" : "تم تسجيل الانصراف بنجاح ✓");
      await fetchData();
    } catch { setError("خطأ في الاتصال"); }
    finally { setActionLoading(false); }
  };

  const isCheckedIn = !!today?.checkInTime && !today?.checkOutTime;
  const isCheckedOut = !!today?.checkOutTime;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto" dir="rtl">
      <div className="text-center mb-2">
        <h1 className="text-xl font-bold text-white">مرحباً، {user?.fullName}</h1>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {error && <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-400 shrink-0" /><p className="text-red-300 text-sm">{error}</p></div>}
      {success && <div className="bg-green-900/50 border border-green-500/50 rounded-xl p-3 flex items-center gap-2"><CheckCircle size={16} className="text-green-400 shrink-0" /><p className="text-green-300 text-sm">{success}</p></div>}

      {/* Today Card */}
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-400" />
          <h2 className="text-white font-semibold">حضور اليوم</h2>
        </div>

        {isCheckedIn && today?.checkInTime && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
            <WorkTimer checkInTime={today.checkInTime} />
            <p className="text-center text-xs text-green-300 mt-2">وقت الدخول: {fmt12(today.checkInTime)}</p>
            {(today.lateMinutes ?? 0) > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <AlertTriangle size={14} className="text-yellow-400" />
                <p className="text-yellow-400 text-sm font-bold">تأخير {today.lateMinutes} دقيقة</p>
              </div>
            )}
          </div>
        )}

        {isCheckedOut && (
          <div className="bg-gray-800/50 border border-white/10 rounded-xl p-4 grid grid-cols-2 gap-3 text-center">
            <div><p className="text-xs text-gray-400 mb-1">وقت الدخول</p><p className="text-green-400 font-bold">{fmt12(today?.checkInTime)}</p></div>
            <div><p className="text-xs text-gray-400 mb-1">وقت الخروج</p><p className="text-red-400 font-bold">{fmt12(today?.checkOutTime)}</p></div>
            <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">ساعات العمل</p><p className="text-blue-400 font-bold text-xl">{today?.workingHours?.toFixed(1) ?? "—"} ساعة</p></div>
            {(today?.lateMinutes ?? 0) > 0 && (
              <div className="col-span-2 flex items-center justify-center gap-1">
                <AlertTriangle size={14} className="text-yellow-400" />
                <p className="text-yellow-400 text-sm">تأخير {today?.lateMinutes} دقيقة</p>
              </div>
            )}
          </div>
        )}

        {!today && (
          <div className="text-center py-4"><XCircle size={32} className="text-gray-500 mx-auto mb-2" /><p className="text-gray-400 text-sm">لم تسجل حضورك اليوم بعد</p></div>
        )}

        {today?.checkInLat && today?.checkInLng && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2">
            <MapPin size={12} className="text-blue-400" />
            <span>الموقع: {today.checkInLat.toFixed(5)}, {today.checkInLng.toFixed(5)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={() => doAction("check-in")} disabled={actionLoading || isCheckedIn || isCheckedOut}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all">
            <LogIn size={18} /><span>تسجيل الحضور</span>
          </button>
          <button onClick={() => doAction("check-out")} disabled={actionLoading || !isCheckedIn || isCheckedOut}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all">
            <LogOut size={18} /><span>تسجيل الانصراف</span>
          </button>
        </div>

        <button className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-blue-400/50 text-gray-400 hover:text-blue-300 py-2 rounded-xl text-sm transition-all">
          <Camera size={16} /><span>التحقق ببصمة الوجه (قريباً)</span>
        </button>
      </div>

      {/* Monthly Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <CheckCircle size={20} className="text-green-400 mx-auto mb-1" />, val: stats.presentDays, label: "أيام الحضور" },
            { icon: <XCircle size={20} className="text-red-400 mx-auto mb-1" />, val: stats.absentDays, label: "أيام الغياب" },
            { icon: <AlertTriangle size={20} className="text-yellow-400 mx-auto mb-1" />, val: stats.lateDays, label: "أيام التأخير" },
            { icon: <Timer size={20} className="text-blue-400 mx-auto mb-1" />, val: stats.totalWorkingHours.toFixed(1), label: "ساعات العمل" },
          ].map((item, i) => (
            <div key={i} className="bg-[#1a2234] border border-white/10 rounded-2xl p-4 text-center">
              {item.icon}
              <p className="text-2xl font-bold text-white">{item.val}</p>
              <p className="text-xs text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Records */}
      {stats && stats.recentRecords.length > 0 && (
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-purple-400" />
            <h3 className="text-white font-semibold text-sm">السجل الأخير</h3>
          </div>
          <div className="space-y-2">
            {stats.recentRecords.map((r) => {
              const st = statusLabel(r.status);
              return (
                <div key={r.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${st.color}`}>{st.text}</span>
                    <span className="text-gray-400">{fmtDate(r.date)}</span>
                  </div>
                  <div className="flex gap-3 text-gray-400">
                    <span>{fmt12(r.checkInTime)}</span>
                    <span>{fmt12(r.checkOutTime)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
