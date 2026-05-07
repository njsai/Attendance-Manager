import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Clock, LogIn, LogOut, AlertTriangle, CheckCircle, XCircle, Timer, Camera, Users, UserCheck } from "lucide-react";

interface TodayRecord {
  id: number; checkInTime: string | null; checkOutTime: string | null;
  workingHours: number | null; lateMinutes: number | null; status: string;
  checkInLat: number | null; checkInLng: number | null;
}
interface AttRecord { id: number; employeeName: string; date: string; checkInTime: string | null; checkOutTime: string | null; lateMinutes: number | null; status: string; }
interface Stats { presentDays: number; absentDays: number; lateDays: number; totalWorkingHours: number; recentRecords: any[]; }

function fmt12(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function WorkTimer({ checkInTime }: { checkInTime: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(checkInTime).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update(); const id = setInterval(update, 1000); return () => clearInterval(id);
  }, [checkInTime]);
  const h = Math.floor(elapsed / 3600), m = Math.floor((elapsed % 3600) / 60), s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return <div className="text-4xl font-mono font-bold text-green-400 tracking-widest text-center">{pad(h)}:{pad(m)}:{pad(s)}</div>;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayTeam, setTodayTeam] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<"me" | "team">("me");
  const BASE = import.meta.env.BASE_URL;

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const [tRes, sRes, teamRes] = await Promise.all([
      fetch(`${BASE}api/attendance/today`, { credentials: "include" }),
      fetch(`${BASE}api/attendance/my-stats`, { credentials: "include" }),
      fetch(`${BASE}api/attendance?date=${today}`, { credentials: "include" }),
    ]);
    const t = await tRes.json();
    const s = await sRes.json();
    const team = await teamRes.json();
    setToday(tRes.ok ? t : null);
    setStats(sRes.ok ? {
      presentDays: s.presentDays ?? 0,
      absentDays: s.absentDays ?? 0,
      lateDays: s.lateDays ?? 0,
      totalWorkingHours: s.totalWorkingHours ?? 0,
      recentRecords: Array.isArray(s.recentRecords) ? s.recentRecords : [],
    } : null);
    setTodayTeam(Array.isArray(team) ? team : []);
    setLoading(false);
  }, [BASE]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => resolve(null), { timeout: 8000 });
    });

  const doAction = async (endpoint: string) => {
    setActionLoading(true); setError(""); setSuccess("");
    try {
      const loc = await getLocation();
      const res = await fetch(`${BASE}api/attendance/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(loc || {}) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "فشل"); return; }
      setSuccess(endpoint === "check-in" ? "تم تسجيل الحضور ✓" : "تم تسجيل الانصراف ✓");
      await fetchData();
    } catch { setError("خطأ في الاتصال"); }
    finally { setActionLoading(false); }
  };

  const isCheckedIn = !!today?.checkInTime && !today?.checkOutTime;
  const isCheckedOut = !!today?.checkOutTime;
  const presentCount = todayTeam.filter(r => r.status === "present" || r.status === "late").length;
  const lateCount = todayTeam.filter(r => r.status === "late").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto" dir="rtl">
      <div className="text-center mb-2">
        <h1 className="text-xl font-bold text-white">مرحباً، {user?.fullName}</h1>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
        {[{ k: "me", label: "حضوري" }, { k: "team", label: "الفريق" }].map(t2 => (
          <button key={t2.k} onClick={() => setTab(t2.k as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t2.k ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {t2.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm">{error}</div>}
      {success && <div className="bg-green-900/50 border border-green-500/50 rounded-xl p-3 text-green-300 text-sm">{success}</div>}

      {tab === "me" && (
        <div className="space-y-4">
          <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2"><Clock size={18} className="text-blue-400" /><h2 className="text-white font-semibold">حضور اليوم</h2></div>
            {isCheckedIn && today?.checkInTime && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5 space-y-2">
                <p className="text-xs text-gray-400 text-center">مدة الدوام</p>
                <WorkTimer checkInTime={today.checkInTime} />
                <p className="text-center text-xs text-green-300">وقت الدخول: {fmt12(today.checkInTime)}</p>
                {(today.lateMinutes ?? 0) > 0 && <p className="text-center text-yellow-400 text-sm font-bold">⚠ تأخير {today.lateMinutes} دقيقة</p>}
              </div>
            )}
            {isCheckedOut && (
              <div className="grid grid-cols-3 gap-3 text-center bg-gray-800/50 rounded-xl p-4">
                <div><p className="text-xs text-gray-400">دخول</p><p className="text-green-400 font-bold">{fmt12(today?.checkInTime)}</p></div>
                <div><p className="text-xs text-gray-400">خروج</p><p className="text-red-400 font-bold">{fmt12(today?.checkOutTime)}</p></div>
                <div><p className="text-xs text-gray-400">ساعات</p><p className="text-blue-400 font-bold">{today?.workingHours?.toFixed(1)}h</p></div>
              </div>
            )}
            {!today && <div className="text-center py-4 text-gray-400 text-sm">لم تسجل حضورك اليوم</div>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => doAction("check-in")} disabled={actionLoading || isCheckedIn || isCheckedOut}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all">
                <LogIn size={18} /><span>تسجيل الحضور</span>
              </button>
              <button onClick={() => doAction("check-out")} disabled={actionLoading || !isCheckedIn || isCheckedOut}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl transition-all">
                <LogOut size={18} /><span>تسجيل الانصراف</span>
              </button>
            </div>
            <button className="w-full flex items-center justify-center gap-2 border border-white/10 text-gray-400 py-2 rounded-xl text-sm">
              <Camera size={16} /><span>بصمة الوجه (قريباً)</span>
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <CheckCircle size={20} className="text-green-400 mx-auto mb-1" />, val: stats.presentDays, label: "أيام الحضور" },
                { icon: <XCircle size={20} className="text-red-400 mx-auto mb-1" />, val: stats.absentDays, label: "أيام الغياب" },
                { icon: <AlertTriangle size={20} className="text-yellow-400 mx-auto mb-1" />, val: stats.lateDays, label: "أيام التأخير" },
                { icon: <Timer size={20} className="text-blue-400 mx-auto mb-1" />, val: (stats.totalWorkingHours ?? 0).toFixed(1), label: "ساعات العمل" },
              ].map((item, i) => (
                <div key={i} className="bg-[#1a2234] border border-white/10 rounded-2xl p-4 text-center">
                  {item.icon}<p className="text-2xl font-bold text-white">{item.val}</p><p className="text-xs text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-4 text-center">
              <UserCheck size={20} className="text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{presentCount}</p>
              <p className="text-xs text-gray-400">حاضر اليوم</p>
            </div>
            <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-4 text-center">
              <AlertTriangle size={20} className="text-yellow-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{lateCount}</p>
              <p className="text-xs text-gray-400">متأخر اليوم</p>
            </div>
          </div>
          <div className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <Users size={16} className="text-blue-400" /><h3 className="text-white font-semibold text-sm">حضور الفريق اليوم</h3>
            </div>
            {todayTeam.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">لا توجد سجلات اليوم</p>
            ) : (
              <div className="divide-y divide-white/5">
                {todayTeam.map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-white font-medium">{r.employeeName}</p>
                      <p className="text-gray-400 text-xs">دخول: {fmt12(r.checkInTime)} — خروج: {fmt12(r.checkOutTime)}</p>
                    </div>
                    <div className="text-left">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === "present" ? "bg-green-900/50 text-green-400" : r.status === "late" ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}>
                        {r.status === "present" ? "حاضر" : r.status === "late" ? `متأخر ${r.lateMinutes}د` : "غائب"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
