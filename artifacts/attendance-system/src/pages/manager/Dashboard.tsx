import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import {
  Clock, LogIn, LogOut, AlertTriangle, CheckCircle, XCircle,
  Timer, Users, UserCheck, ScanFace, MapPin, Calendar
} from "lucide-react";
import FaceCapture from "@/components/FaceCapture";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

interface TodayRecord {
  id: number; checkInTime: string | null; checkOutTime: string | null;
  workingHours: number | null; lateMinutes: number | null; status: string;
  checkInLat: number | null; checkInLng: number | null;
}
interface AttRecord {
  id: number; employeeName: string; date: string;
  checkInTime: string | null; checkOutTime: string | null;
  lateMinutes: number | null; status: string;
}
interface Stats {
  presentDays: number; absentDays: number; lateDays: number;
  totalWorkingHours: number; recentRecords: AttRecord[];
}
interface KnownDescriptor { id: number; fullName: string; faceDescriptor: number[]; }

function WorkTimer({ checkInTime, label }: { checkInTime: string; label: string }) {
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
      <p style={{ fontSize: 11, color: "rgba(0,245,255,0.5)", marginBottom: 8 }}>{label}</p>
      <motion.div
        animate={{ textShadow: ["0 0 10px rgba(0,245,255,0.3)", "0 0 24px rgba(0,245,255,0.7)", "0 0 10px rgba(0,245,255,0.3)"] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: 40, fontFamily: "monospace", fontWeight: 800, color: "#00f5ff", letterSpacing: 4 }}
      >
        {pad(h)}:{pad(m)}:{pad(s)}
      </motion.div>
    </div>
  );
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { t, dir, locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [today, setToday] = useState<TodayRecord | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayTeam, setTodayTeam] = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<"me" | "team">("me");
  const [showFace, setShowFace] = useState(false);
  const [faceMode, setFaceMode] = useState<"check-in" | "check-out">("check-in");
  const [knownDescriptors, setKnownDescriptors] = useState<KnownDescriptor[]>([]);
  const BASE = import.meta.env.BASE_URL;

  function fmt12(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" }); }
    catch { return d; }
  }

  const fetchData = useCallback(async () => {
    const todayDate = new Date().toISOString().split("T")[0];
    try {
      const [tRes, sRes, teamRes] = await Promise.all([
        fetch(`${BASE}api/attendance/today`, { credentials: "include" }),
        fetch(`${BASE}api/attendance/my-stats`, { credentials: "include" }),
        fetch(`${BASE}api/attendance?date=${todayDate}`, { credentials: "include" }),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      const team = await teamRes.json();
      setToday(tRes.ok ? tData : null);
      setStats(sRes.ok ? {
        presentDays: sData.presentDays ?? 0, absentDays: sData.absentDays ?? 0,
        lateDays: sData.lateDays ?? 0, totalWorkingHours: sData.totalWorkingHours ?? 0,
        recentRecords: Array.isArray(sData.recentRecords) ? sData.recentRecords : [],
      } : null);
      setTodayTeam(Array.isArray(team) ? team : []);
    } catch { setError(t("failedLoad")); }
    finally { setLoading(false); }
  }, [BASE, locale]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve(null), { timeout: 8000 }
      );
    });

  const doAction = async (endpoint: string) => {
    setActionLoading(true); setError(""); setSuccess("");
    try {
      const loc = await getLocation();
      const res = await fetch(`${BASE}api/attendance/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(loc || {}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || t("failedLoad")); return; }
      setSuccess(endpoint === "check-in" ? t("checkInSuccess") : t("checkOutSuccess"));
      await fetchData();
    } catch { setError(t("connectionError")); }
    finally { setActionLoading(false); }
  };

  const openFace = async (mode: "check-in" | "check-out") => {
    setFaceMode(mode); setError(""); setSuccess("");
    try {
      const res = await fetch(`${BASE}api/employees/face-descriptors/all`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setKnownDescriptors(Array.isArray(data) ? data : []);
      }
    } catch { }
    setShowFace(true);
  };

  const handleFaceVerified = async (result: { matched: boolean; employeeId?: number; employeeName?: string }) => {
    setShowFace(false);
    if (!result.matched || !result.employeeId) { setError(t("faceNotRecognized")); return; }
    if (result.employeeId !== (user as any)?.id) { setError(`${result.employeeName}`); return; }
    await doAction(faceMode);
  };

  const isCheckedIn = !!today?.checkInTime && !today?.checkOutTime;
  const isCheckedOut = !!today?.checkOutTime;
  const hasFaceDescriptor = !!(user as any)?.faceDescriptor;
  const presentCount = todayTeam.filter(r => r.status === "present" || r.status === "late").length;
  const absentCount = todayTeam.filter(r => r.status === "absent").length;
  const lateCount = todayTeam.filter(r => r.status === "late").length;

  const statusMeta: Record<string, { text: string; color: string; bg: string; border: string }> = {
    present: { text: t("present"), color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
    late:    { text: t("late"),    color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" },
    absent:  { text: t("absent"),  color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
    leave:   { text: t("onLeave"), color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)" },
  };

  const textPrimary = isDark ? "#ffffff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.4)";
  const textMuted = isDark ? "rgba(255,255,255,0.3)" : "rgba(15,23,42,0.3)";
  const accentColor = isDark ? "#a855f7" : "#9333ea";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";

  const cardStyle = {
    background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)",
    border: isDark ? "1px solid rgba(0,245,255,0.08)" : "1px solid rgba(0,180,200,0.15)",
    borderRadius: 18,
    padding: 18,
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 280 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(0,245,255,0.15)", borderTopColor: "#00f5ff" }} />
    </div>
  );

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 720, margin: "0 auto" }} dir={dir}>
      {showFace && (
        <FaceCapture mode="verify" knownDescriptors={knownDescriptors} onVerify={handleFaceVerified} onClose={() => setShowFace(false)} />
      )}

      {/* Header */}
      <div style={{ textAlign: "center", paddingBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0 }}>
          {t("welcome")}، <span style={{ color: accentColor, textShadow: isDark ? "0 0 20px rgba(168,85,247,0.4)" : "none" }}>{user?.fullName}</span>
        </h1>
        <p style={{ fontSize: 12, color: textMuted, marginTop: 6 }}>
          {new Date().toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 14, padding: 4, gap: 4 }}>
        {[{ k: "me", label: t("myAttendanceTab") }, { k: "team", label: t("teamTab") }].map(t2 => (
          <button key={t2.k} onClick={() => setTab(t2.k as any)}
            style={{
              flex: 1, padding: "9px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
              background: tab === t2.k
                ? isDark ? "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(168,85,247,0.15))" : "rgba(255,255,255,0.95)"
                : "transparent",
              color: tab === t2.k ? textPrimary : textSecondary,
              borderBottom: tab === t2.k ? `1px solid ${isDark ? "rgba(0,245,255,0.3)" : "rgba(0,180,200,0.25)"}` : "1px solid transparent",
              fontFamily: "'Tajawal', sans-serif", transition: "all 0.2s",
            }}>
            {t2.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
          <AlertTriangle size={14} /> {error}
        </motion.div>}
        {success && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 13 }}>
          <CheckCircle size={14} /> {success}
        </motion.div>}
      </AnimatePresence>

      {/* ── MY ATTENDANCE TAB ── */}
      {tab === "me" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={16} style={{ color: accentColor }} />
              </div>
              <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, margin: 0 }}>{t("todayAttendanceCard")}</h2>
            </div>

            {isCheckedIn && today?.checkInTime && (
              <div style={{ padding: 20, borderRadius: 14, background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.1)", display: "flex", flexDirection: "column", gap: 8 }}>
                <WorkTimer checkInTime={today.checkInTime} label={t("workDurationLabel")} />
                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(0,245,255,0.5)" }}>{t("entryTime")} {fmt12(today.checkInTime)}</p>
                {(today.lateMinutes ?? 0) > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{t("lateBy")} {today.lateMinutes} {t("minutes")}</p>
                  </div>
                )}
              </div>
            )}

            {isCheckedOut && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)" }}>
                {[
                  { label: t("entryShort"),  val: fmt12(today?.checkInTime),  color: "#10b981" },
                  { label: t("exitShort"),   val: fmt12(today?.checkOutTime), color: "#f87171" },
                  { label: t("hoursShort"), val: `${today?.workingHours?.toFixed(1)}h`, color: cyanColor },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: textMuted, marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color }}>{val}</p>
                  </div>
                ))}
                {(today?.lateMinutes ?? 0) > 0 && (
                  <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <AlertTriangle size={12} style={{ color: "#f59e0b" }} />
                    <p style={{ fontSize: 11, color: "#f59e0b" }}>{t("lateBy")} {today?.lateMinutes} {t("minutes")}</p>
                  </div>
                )}
              </div>
            )}

            {!today && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <XCircle size={32} style={{ color: textSecondary, margin: "0 auto 10px" }} />
                <p style={{ fontSize: 13, color: textMuted }}>{t("notCheckedInToday")}</p>
              </div>
            )}

            {today?.checkInLat && today?.checkInLng && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", borderRadius: 9, background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.07)" }}>
                <MapPin size={11} style={{ color: cyanColor }} />
                <span style={{ fontSize: 10, color: textMuted }}>{t("locationLabel")} {today.checkInLat.toFixed(5)}, {today.checkInLng.toFixed(5)}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: t("checkIn"),  icon: LogIn,  action: "check-in",  disabled: actionLoading || isCheckedIn || isCheckedOut, grad: "linear-gradient(135deg, rgba(16,185,129,0.85), rgba(5,150,105,0.85))", shadow: "0 4px 14px rgba(16,185,129,0.25)" },
                { label: t("checkOut"), icon: LogOut, action: "check-out", disabled: actionLoading || !isCheckedIn || isCheckedOut, grad: "linear-gradient(135deg, rgba(248,113,113,0.85), rgba(220,38,38,0.85))", shadow: "0 4px 14px rgba(248,113,113,0.25)" },
              ].map(({ label, icon: Icon, action, disabled, grad, shadow }) => (
                <button key={action} onClick={() => doAction(action)} disabled={disabled}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "rgba(255,255,255,0.04)" : grad, color: disabled ? textSecondary : "#fff", boxShadow: disabled ? "none" : shadow, transition: "all 0.2s", fontFamily: "'Tajawal', sans-serif" }}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: t("faceCheckIn"),  mode: "check-in"  as const, disabled: actionLoading || isCheckedIn || isCheckedOut, color: cyanColor, borderColor: "rgba(0,245,255,0.2)", bg: "rgba(0,245,255,0.05)" },
                { label: t("faceCheckOut"), mode: "check-out" as const, disabled: actionLoading || !isCheckedIn || isCheckedOut, color: isDark ? "#f97316" : "#ea580c", borderColor: "rgba(249,115,22,0.2)", bg: "rgba(249,115,22,0.05)" },
              ].map(({ label, mode, disabled, color, borderColor, bg }) => (
                <button key={mode} onClick={() => openFace(mode)} disabled={disabled}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: `1px solid ${disabled ? "rgba(255,255,255,0.05)" : borderColor}`, background: disabled ? "transparent" : bg, color: disabled ? textSecondary : color, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Tajawal', sans-serif", transition: "all 0.2s" }}>
                  <ScanFace size={14} /> {label}
                </button>
              ))}
            </div>

            {!hasFaceDescriptor && (
              <p style={{ fontSize: 11, textAlign: "center", color: "rgba(245,158,11,0.45)" }}>⚠️ {t("faceNotRegistered")}</p>
            )}
          </div>

          {/* Monthly stats */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: CheckCircle,   val: stats.presentDays,                       label: t("presentDays"), color: "#10b981", glow: "rgba(16,185,129,0.12)" },
                { icon: XCircle,       val: stats.absentDays,                        label: t("absentDays"),  color: "#f87171", glow: "rgba(248,113,113,0.12)" },
                { icon: AlertTriangle, val: stats.lateDays,                          label: t("lateDays"),    color: "#f59e0b", glow: "rgba(245,158,11,0.12)" },
                { icon: Timer,         val: (stats.totalWorkingHours ?? 0).toFixed(1), label: t("workingHours"), color: cyanColor, glow: "rgba(0,245,255,0.12)" },
              ].map(({ icon: Icon, val, label, color, glow }) => (
                <div key={label} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)", border: `1px solid ${glow}`, borderRadius: 16, padding: "14px 10px", textAlign: "center" }}>
                  <Icon size={18} style={{ color, margin: "0 auto 6px", display: "block" }} />
                  <p style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>{val}</p>
                  <p style={{ fontSize: 10, color: textSecondary, marginTop: 3 }}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent records */}
          {stats && stats.recentRecords.length > 0 && (
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Calendar size={14} style={{ color: accentColor }} />
                <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 13, margin: 0 }}>{t("recentRecord")}</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {stats.recentRecords.map((r: any) => {
                  const m = statusMeta[r.status] || { text: r.status, color: textSecondary, bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" };
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 11px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 600, background: m.bg, border: `1px solid ${m.border}`, color: m.color }}>{m.text}</span>
                        <span style={{ fontSize: 11, color: textMuted }}>{fmtDate(r.date)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, color: textMuted }}>{fmt12(r.checkInTime)}</span>
                        <span style={{ fontSize: 11, color: textSecondary }}>{fmt12(r.checkOutTime)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {tab === "team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { icon: UserCheck,     val: presentCount, label: t("present"), color: "#10b981", glow: "rgba(16,185,129,0.12)" },
              { icon: AlertTriangle, val: lateCount,    label: t("late"),    color: "#f59e0b", glow: "rgba(245,158,11,0.12)" },
              { icon: XCircle,       val: absentCount,  label: t("absent"),  color: "#f87171", glow: "rgba(248,113,113,0.12)" },
            ].map(({ icon: Icon, val, label, color, glow }) => (
              <div key={label} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)", border: `1px solid ${glow}`, borderRadius: 15, padding: "14px 8px", textAlign: "center" }}>
                <Icon size={18} style={{ color, margin: "0 auto 6px", display: "block" }} />
                <p style={{ fontSize: 22, fontWeight: 800, color: textPrimary, margin: 0 }}>{val}</p>
                <p style={{ fontSize: 10, color: textSecondary, marginTop: 3 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: isDark ? "1px solid rgba(0,245,255,0.07)" : "1px solid rgba(0,180,200,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={15} style={{ color: cyanColor }} />
              <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 13, margin: 0 }}>{t("teamAttendanceToday")}</h3>
            </div>
            {todayTeam.length === 0 ? (
              <p style={{ textAlign: "center", color: textMuted, fontSize: 13, padding: "32px 0" }}>{t("noRecordsToday")}</p>
            ) : (
              <div>
                {todayTeam.map((r, i) => {
                  const m = statusMeta[r.status] || { text: r.status, color: textSecondary, bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" };
                  return (
                    <div key={r.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: i < todayTeam.length - 1 ? (isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)") : "none" }}>
                      <div>
                        <p style={{ color: textPrimary, fontSize: 13, fontWeight: 600, margin: 0 }}>{r.employeeName}</p>
                        <p style={{ color: textSecondary, fontSize: 11, marginTop: 3 }}>
                          {t("entryShort")} {fmt12(r.checkInTime)} — {t("exitShort")} {fmt12(r.checkOutTime)}
                        </p>
                      </div>
                      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, fontWeight: 600, background: m.bg, border: `1px solid ${m.border}`, color: m.color }}>
                        {r.status === "late" ? `${t("late")} ${r.lateMinutes}${t("minuteShort")}` : m.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
