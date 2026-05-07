import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Clock, MapPin, LogIn, LogOut, AlertTriangle, Calendar, CheckCircle, XCircle, Timer, ScanFace } from "lucide-react";
import FaceCapture from "@/components/FaceCapture";
import { motion, AnimatePresence } from "framer-motion";

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

interface KnownDescriptor {
  id: number;
  fullName: string;
  faceDescriptor: number[];
}

function fmt12(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  catch { return "—"; }
}

function fmtDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return dateStr; }
}

function statusLabel(s: string) {
  if (s === "present") return { text: "حاضر", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" };
  if (s === "late") return { text: "متأخر", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" };
  if (s === "absent") return { text: "غائب", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" };
  if (s === "leave") return { text: "إجازة", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" };
  return { text: s, color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" };
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
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 11, color: "rgba(16,185,129,0.6)", marginBottom: 8 }}>مدة الدوام</p>
      <motion.div
        animate={{ textShadow: ["0 0 10px rgba(0,245,255,0.3)", "0 0 20px rgba(0,245,255,0.6)", "0 0 10px rgba(0,245,255,0.3)"] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: 40, fontFamily: "monospace", fontWeight: 800, color: "#00f5ff", letterSpacing: 4 }}
      >
        {pad(h)}:{pad(m)}:{pad(s)}
      </motion.div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [today, setToday] = useState<TodayRecord | null>(null);
  const [stats, setStats] = useState<Stats>({
    presentDays: 0, absentDays: 0, lateDays: 0,
    totalWorkingHours: 0, totalLateMinutes: 0,
    recentRecords: [], month: "",
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFace, setShowFace] = useState(false);
  const [faceMode, setFaceMode] = useState<"check-in" | "check-out">("check-in");
  const [knownDescriptors, setKnownDescriptors] = useState<KnownDescriptor[]>([]);
  const BASE = import.meta.env.BASE_URL;

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, statsRes] = await Promise.all([
        fetch(`${BASE}api/attendance/today`, { credentials: "include" }),
        fetch(`${BASE}api/attendance/my-stats`, { credentials: "include" }),
      ]);
      const todayData = await todayRes.json();
      const statsData = await statsRes.json();
      setToday(todayRes.ok ? todayData : null);
      setStats(statsRes.ok ? {
        presentDays: statsData.presentDays ?? 0,
        absentDays: statsData.absentDays ?? 0,
        lateDays: statsData.lateDays ?? 0,
        totalWorkingHours: statsData.totalWorkingHours ?? 0,
        totalLateMinutes: statsData.totalLateMinutes ?? 0,
        recentRecords: Array.isArray(statsData.recentRecords) ? statsData.recentRecords : [],
        month: statsData.month ?? "",
      } : { presentDays: 0, absentDays: 0, lateDays: 0, totalWorkingHours: 0, totalLateMinutes: 0, recentRecords: [], month: "" });
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

  const openFace = async (mode: "check-in" | "check-out") => {
    setFaceMode(mode);
    try {
      const res = await fetch(`${BASE}api/employees/face-descriptors/all`, { credentials: "include" });
      if (res.ok) setKnownDescriptors(await res.json());
    } catch { }
    setShowFace(true);
  };

  const handleFaceVerified = async (result: { matched: boolean; employeeId?: number; employeeName?: string }) => {
    setShowFace(false);
    if (!result.matched || !result.employeeId) { setError("لم يتم التعرف على الوجه — حاول مجدداً أو استخدم الدخول اليدوي"); return; }
    if (result.employeeId !== user?.id) { setError(`تم التعرف على: ${result.employeeName}، لكنها ليست بياناتك`); return; }
    await doAction(faceMode);
  };

  const isCheckedIn = !!today?.checkInTime && !today?.checkOutTime;
  const isCheckedOut = !!today?.checkOutTime;
  const hasFaceDescriptor = !!(user as any)?.faceDescriptor;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(0,245,255,0.2)", borderTopColor: "#00f5ff" }}
      />
    </div>
  );

  const cardStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(0,245,255,0.08)",
    borderRadius: 18,
    padding: 20,
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, margin: "0 auto" }} dir="rtl">
      {showFace && (
        <FaceCapture
          mode="verify"
          knownDescriptors={knownDescriptors}
          onVerify={handleFaceVerified}
          onClose={() => setShowFace(false)}
        />
      )}

      {/* Header */}
      <div style={{ textAlign: "center", paddingBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>
          مرحباً، <span style={{ color: "#00f5ff", textShadow: "0 0 20px rgba(0,245,255,0.4)" }}>{user?.fullName}</span>
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
          {new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
            <AlertTriangle size={15} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 13 }}>
            <CheckCircle size={15} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today Card */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={16} style={{ color: "#00f5ff" }} />
          </div>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>حضور اليوم</h2>
        </div>

        {/* Active timer */}
        {isCheckedIn && today?.checkInTime && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: 20, borderRadius: 14, background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)", display: "flex", flexDirection: "column", gap: 8 }}>
            <WorkTimer checkInTime={today.checkInTime} />
            <p style={{ textAlign: "center", fontSize: 12, color: "rgba(0,245,255,0.5)" }}>وقت الدخول: {fmt12(today.checkInTime)}</p>
            {(today.lateMinutes ?? 0) > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>تأخير {today.lateMinutes} دقيقة</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Checked out summary */}
        {isCheckedOut && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "وقت الدخول", val: fmt12(today?.checkInTime), color: "#10b981" },
              { label: "وقت الخروج", val: fmt12(today?.checkOutTime), color: "#f87171" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color }}>{val}</p>
              </div>
            ))}
            <div style={{ gridColumn: "1/-1", padding: "12px", borderRadius: 12, background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>ساعات العمل</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#00f5ff" }}>{today?.workingHours?.toFixed(1) ?? "—"} <span style={{ fontSize: 13, opacity: 0.6 }}>ساعة</span></p>
            </div>
            {(today?.lateMinutes ?? 0) > 0 && (
              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
                <p style={{ fontSize: 12, color: "#f59e0b" }}>تأخير {today?.lateMinutes} دقيقة</p>
              </div>
            )}
          </div>
        )}

        {!today && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <XCircle size={36} style={{ color: "rgba(255,255,255,0.15)", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>لم تسجل حضورك اليوم بعد</p>
          </div>
        )}

        {today?.checkInLat && today?.checkInLng && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
            <MapPin size={12} style={{ color: "#00f5ff" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>الموقع: {today.checkInLat.toFixed(5)}, {today.checkInLng.toFixed(5)}</span>
          </div>
        )}

        {/* Manual buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={() => doAction("check-in")}
            disabled={actionLoading || isCheckedIn || isCheckedOut}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 13, border: "none", fontWeight: 700, fontSize: 13,
              background: actionLoading || isCheckedIn || isCheckedOut
                ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, rgba(16,185,129,0.85), rgba(5,150,105,0.85))",
              color: actionLoading || isCheckedIn || isCheckedOut ? "rgba(255,255,255,0.2)" : "#fff",
              cursor: actionLoading || isCheckedIn || isCheckedOut ? "not-allowed" : "pointer",
              boxShadow: actionLoading || isCheckedIn || isCheckedOut ? "none" : "0 4px 16px rgba(16,185,129,0.25)",
              transition: "all 0.2s", fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <LogIn size={16} /> تسجيل الحضور
          </button>
          <button
            onClick={() => doAction("check-out")}
            disabled={actionLoading || !isCheckedIn || isCheckedOut}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 13, border: "none", fontWeight: 700, fontSize: 13,
              background: actionLoading || !isCheckedIn || isCheckedOut
                ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, rgba(248,113,113,0.85), rgba(220,38,38,0.85))",
              color: actionLoading || !isCheckedIn || isCheckedOut ? "rgba(255,255,255,0.2)" : "#fff",
              cursor: actionLoading || !isCheckedIn || isCheckedOut ? "not-allowed" : "pointer",
              boxShadow: actionLoading || !isCheckedIn || isCheckedOut ? "none" : "0 4px 16px rgba(248,113,113,0.25)",
              transition: "all 0.2s", fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <LogOut size={16} /> تسجيل الانصراف
          </button>
        </div>

        {/* Face recognition buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={() => openFace("check-in")}
            disabled={actionLoading || isCheckedIn || isCheckedOut}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", borderRadius: 11, cursor: actionLoading || isCheckedIn || isCheckedOut ? "not-allowed" : "pointer",
              opacity: actionLoading || isCheckedIn || isCheckedOut ? 0.35 : 1,
              border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.05)",
              color: "#00f5ff", fontSize: 12, fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <ScanFace size={15} /> حضور بالوجه
          </button>
          <button
            onClick={() => openFace("check-out")}
            disabled={actionLoading || !isCheckedIn || isCheckedOut}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px", borderRadius: 11, cursor: actionLoading || !isCheckedIn || isCheckedOut ? "not-allowed" : "pointer",
              opacity: actionLoading || !isCheckedIn || isCheckedOut ? 0.35 : 1,
              border: "1px solid rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.05)",
              color: "#f97316", fontSize: 12, fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <ScanFace size={15} /> انصراف بالوجه
          </button>
        </div>

        {!hasFaceDescriptor && (
          <p style={{ fontSize: 11, textAlign: "center", color: "rgba(245,158,11,0.5)" }}>
            ⚠️ لم يتم تسجيل بصمة وجهك بعد — تواصل مع المدير لتسجيلها
          </p>
        )}
      </div>

      {/* Monthly Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { icon: CheckCircle, val: stats.presentDays, label: "أيام الحضور", color: "#10b981", glow: "rgba(16,185,129,0.15)" },
          { icon: XCircle, val: stats.absentDays, label: "أيام الغياب", color: "#f87171", glow: "rgba(248,113,113,0.15)" },
          { icon: AlertTriangle, val: stats.lateDays, label: "أيام التأخير", color: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
          { icon: Timer, val: (stats.totalWorkingHours ?? 0).toFixed(1), label: "ساعات العمل", color: "#00f5ff", glow: "rgba(0,245,255,0.15)" },
        ].map(({ icon: Icon, val, label, color, glow }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${glow}`, borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
            <Icon size={20} style={{ color, margin: "0 auto 8px", display: "block", filter: `drop-shadow(0 0 6px ${color})` }} />
            <p style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>{val}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Records */}
      {stats.recentRecords.length > 0 && (
        <div style={{ ...cardStyle }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Calendar size={15} style={{ color: "#a855f7" }} />
            <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: 0 }}>السجل الأخير</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.recentRecords.map((r) => {
              const st = statusLabel(r.status);
              return (
                <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>{st.text}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{fmtDate(r.date)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{fmt12(r.checkInTime)}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{fmt12(r.checkOutTime)}</span>
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
