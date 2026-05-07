import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowRight, User, KeyRound, Eye, EyeOff, CheckCircle, XCircle, Loader2, Save, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { getSAColors } from "@/lib/sa-utils";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

interface Profile {
  id: number;
  username: string;
  fullName: string;
  email: string;
}

interface Feedback { msg: string; ok: boolean }

export default function AccountSettings() {
  const [, setLocation] = useLocation();
  const { lang, dir } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = getSAColors(isDark);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Username change form
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [showUsernamePass, setShowUsernamePass] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameFeedback, setUsernameFeedback] = useState<Feedback | null>(null);

  // Password change form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  const isAr = lang === "ar";

  const showMsg = (
    setter: (f: Feedback | null) => void,
    msg: string,
    ok: boolean
  ) => {
    setter({ msg, ok });
    setTimeout(() => setter(null), 4000);
  };

  useEffect(() => {
    (async () => {
      try {
        const p = await apiFetch("api/super-admin/profile");
        setProfile(p);
        setNewUsername(p.username);
      } catch {
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUsername(true);
    try {
      const updated = await apiFetch("api/super-admin/profile", {
        method: "PUT",
        body: JSON.stringify({ newUsername, currentPassword: usernamePassword }),
      });
      setProfile(prev => prev ? { ...prev, username: updated.username } : prev);
      setUsernamePassword("");
      showMsg(setUsernameFeedback, isAr ? "تم تغيير اسم المستخدم بنجاح" : "Username updated successfully", true);
    } catch (err: any) {
      showMsg(setUsernameFeedback, err.message, false);
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg(setPasswordFeedback, isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match", false);
      return;
    }
    if (newPassword.length < 6) {
      showMsg(setPasswordFeedback, isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters", false);
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("api/super-admin/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      showMsg(setPasswordFeedback, isAr ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully", true);
    } catch (err: any) {
      showMsg(setPasswordFeedback, err.message, false);
    } finally {
      setSavingPassword(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    paddingTop: 11, paddingBottom: 11,
    paddingInlineStart: 14, paddingInlineEnd: 42,
    borderRadius: 11, fontSize: 14,
    background: isDark ? "rgba(168,85,247,0.04)" : "#f8f5ff",
    border: `1px solid ${isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.2)"}`,
    color: isDark ? "#fff" : "#1e1b2e",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box" as const,
    fontFamily: "'Tajawal', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(30,27,46,0.55)",
    marginBottom: 7,
  };

  const iconStyle: React.CSSProperties = {
    position: "absolute",
    insetInlineEnd: 13,
    top: "50%", transform: "translateY(-50%)",
    color: isDark ? "rgba(168,85,247,0.45)" : "rgba(168,85,247,0.5)",
    pointerEvents: "none",
  };

  const cardStyle: React.CSSProperties = {
    background: isDark ? "rgba(168,85,247,0.04)" : "#fff",
    border: `1px solid ${isDark ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.15)"}`,
    borderRadius: 18,
    padding: "28px 28px 24px",
    boxShadow: isDark ? "0 0 30px rgba(168,85,247,0.04)" : "0 2px 12px rgba(168,85,247,0.07)",
  };

  const FeedbackBanner = ({ fb }: { fb: Feedback | null }) => (
    <AnimatePresence>
      {fb && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "11px 14px", borderRadius: 11, fontSize: 13, fontWeight: 600,
            marginTop: 16,
            background: fb.ok ? "rgba(16,185,129,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${fb.ok ? "rgba(16,185,129,0.2)" : "rgba(248,113,113,0.2)"}`,
            color: fb.ok ? "#10b981" : "#f87171",
          }}
        >
          {fb.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {fb.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        background: C.pageBg,
        fontFamily: "'Tajawal', sans-serif",
        color: C.textPrimary,
        position: "relative",
      }}
    >
      {/* Ambient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 55% 45% at 8% 12%, rgba(168,85,247,0.06) 0%, transparent 70%), radial-gradient(ellipse 45% 55% at 92% 88%, rgba(0,245,255,0.04) 0%, transparent 70%)",
      }} />

      {/* Header */}
      <div style={{
        background: isDark ? "rgba(5,13,31,0.9)" : "rgba(255,255,255,0.95)",
        borderBottom: `1px solid ${isDark ? "rgba(168,85,247,0.15)" : "#ede8fb"}`,
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 10,
        boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => setLocation("/super-admin")}
            style={{
              width: 38, height: 38, borderRadius: 11,
              border: `1px solid ${C.cardBorder}`, background: C.cardBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: C.textSecondary,
              flexShrink: 0,
            }}
          >
            <ArrowRight size={16} style={{ transform: dir === "rtl" ? "none" : "rotate(180deg)" }} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(168,85,247,0.18)",
            }}>
              <Shield size={18} style={{ color: "#a855f7", filter: "drop-shadow(0 0 5px rgba(168,85,247,0.6))" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                {isAr ? "إعدادات الحساب" : "Account Settings"}
              </h1>
              <p style={{ fontSize: 11, color: isDark ? "rgba(168,85,247,0.5)" : "#7c3aed", margin: 0 }}>
                {isAr ? "مدير النظام العام" : "Super Administrator"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6" style={{ position: "relative", zIndex: 1 }}>

        {/* Current profile card */}
        {loadingProfile ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <Loader2 size={28} style={{ color: "#a855f7" }} className="animate-spin" />
          </div>
        ) : profile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: isDark ? "rgba(168,85,247,0.07)" : "#faf7ff",
              border: `1px solid ${isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.2)"}`,
              borderRadius: 18, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 16,
            }}
          >
            <div style={{
              width: 54, height: 54, borderRadius: 16,
              background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(139,92,246,0.15))",
              border: "2px solid rgba(168,85,247,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(168,85,247,0.2)",
              flexShrink: 0,
            }}>
              <Shield size={24} style={{ color: "#a855f7", filter: "drop-shadow(0 0 6px rgba(168,85,247,0.7))" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: isDark ? "rgba(168,85,247,0.5)" : "#7c3aed", margin: "0 0 3px", fontWeight: 600 }}>
                {isAr ? "الحساب الحالي" : "Current Account"}
              </p>
              <p style={{ fontSize: 17, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                {profile.fullName}
              </p>
              <p style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(30,27,46,0.5)", margin: "2px 0 0", direction: "ltr", textAlign: "start" }}>
                @{profile.username}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Section 1: Change Username ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={cardStyle}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={16} style={{ color: "#00f5ff" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                {isAr ? "تغيير اسم المستخدم" : "Change Username"}
              </h2>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                {isAr ? "يجب تأكيد كلمة المرور الحالية" : "Current password required to confirm"}
              </p>
            </div>
          </div>

          <form onSubmit={handleUsernameChange} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* New username */}
            <div>
              <label style={labelStyle}>{isAr ? "اسم المستخدم الجديد" : "New Username"}</label>
              <div style={{ position: "relative" }}>
                <User size={15} style={iconStyle} />
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder={isAr ? "أدخل اسم المستخدم الجديد" : "Enter new username"}
                  style={inputStyle}
                  autoComplete="username"
                  onFocus={e => { e.target.style.borderColor = "rgba(0,245,255,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,245,255,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.2)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                {isAr ? "أحرف إنجليزية وأرقام فقط (a-z, 0-9, _ . -)، 3 أحرف على الأقل" : "English letters, numbers, _ . - only, minimum 3 chars"}
              </p>
            </div>

            {/* Current password for confirmation */}
            <div>
              <label style={labelStyle}>{isAr ? "كلمة المرور الحالية (للتأكيد)" : "Current Password (to confirm)"}</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={iconStyle} />
                <input
                  type={showUsernamePass ? "text" : "password"}
                  required
                  value={usernamePassword}
                  onChange={e => setUsernamePassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingInlineStart: 42 }}
                  autoComplete="current-password"
                  onFocus={e => { e.target.style.borderColor = "rgba(0,245,255,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,245,255,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.2)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowUsernamePass(p => !p)}
                  style={{
                    position: "absolute", insetInlineStart: 11,
                    top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: isDark ? "rgba(255,255,255,0.25)" : "rgba(30,27,46,0.3)", padding: 2,
                  }}
                >
                  {showUsernamePass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={savingUsername}
              whileHover={{ scale: savingUsername ? 1 : 1.01 }}
              whileTap={{ scale: savingUsername ? 1 : 0.98 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, rgba(0,245,255,0.8), rgba(59,130,246,0.8))",
                color: isDark ? "#020817" : "#fff",
                fontWeight: 700, fontSize: 14, cursor: savingUsername ? "not-allowed" : "pointer",
                opacity: savingUsername ? 0.6 : 1,
                fontFamily: "'Tajawal', sans-serif",
                alignSelf: "flex-start",
              }}
            >
              {savingUsername ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {savingUsername ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ اسم المستخدم" : "Save Username")}
            </motion.button>

            <FeedbackBanner fb={usernameFeedback} />
          </form>
        </motion.div>

        {/* ── Section 2: Change Password ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={cardStyle}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <KeyRound size={16} style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                {isAr ? "تغيير كلمة المرور" : "Change Password"}
              </h2>
              <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                {isAr ? "6 أحرف على الأقل" : "Minimum 6 characters"}
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Old password */}
            <div>
              <label style={labelStyle}>{isAr ? "كلمة المرور الحالية" : "Current Password"}</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={iconStyle} />
                <input
                  type={showOld ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingInlineStart: 42 }}
                  autoComplete="current-password"
                  onFocus={e => { e.target.style.borderColor = "rgba(168,85,247,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.2)"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowOld(p => !p)}
                  style={{ position: "absolute", insetInlineStart: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: isDark ? "rgba(255,255,255,0.25)" : "rgba(30,27,46,0.3)", padding: 2 }}>
                  {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={labelStyle}>{isAr ? "كلمة المرور الجديدة" : "New Password"}</label>
              <div style={{ position: "relative" }}>
                <KeyRound size={15} style={iconStyle} />
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingInlineStart: 42 }}
                  autoComplete="new-password"
                  onFocus={e => { e.target.style.borderColor = "rgba(168,85,247,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.2)"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowNew(p => !p)}
                  style={{ position: "absolute", insetInlineStart: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: isDark ? "rgba(255,255,255,0.25)" : "rgba(30,27,46,0.3)", padding: 2 }}>
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div>
              <label style={labelStyle}>{isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}</label>
              <div style={{ position: "relative" }}>
                <KeyRound size={15} style={iconStyle} />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    ...inputStyle,
                    paddingInlineStart: 42,
                    borderColor: confirmPassword && confirmPassword !== newPassword
                      ? "rgba(248,113,113,0.5)"
                      : confirmPassword && confirmPassword === newPassword
                        ? "rgba(16,185,129,0.5)"
                        : (isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.2)"),
                  }}
                  autoComplete="new-password"
                  onFocus={e => { e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.08)"; }}
                  onBlur={e => { e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position: "absolute", insetInlineStart: 11, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: isDark ? "rgba(255,255,255,0.25)" : "rgba(30,27,46,0.3)", padding: 2 }}>
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>
                  {isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"}
                </p>
              )}
              {confirmPassword && confirmPassword === newPassword && (
                <p style={{ fontSize: 11, color: "#10b981", marginTop: 5 }}>
                  {isAr ? "كلمتا المرور متطابقتان ✓" : "Passwords match ✓"}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={savingPassword}
              whileHover={{ scale: savingPassword ? 1 : 1.01 }}
              whileTap={{ scale: savingPassword ? 1 : 0.98 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, rgba(168,85,247,0.9), rgba(139,92,246,0.9))",
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: savingPassword ? "not-allowed" : "pointer",
                opacity: savingPassword ? 0.6 : 1,
                fontFamily: "'Tajawal', sans-serif",
                boxShadow: "0 4px 16px rgba(168,85,247,0.3)",
                alignSelf: "flex-start",
              }}
            >
              {savingPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {savingPassword ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "تغيير كلمة المرور" : "Change Password")}
            </motion.button>

            <FeedbackBanner fb={passwordFeedback} />
          </form>
        </motion.div>

      </div>
    </div>
  );
}
