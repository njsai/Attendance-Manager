import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, User, KeyRound, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

async function apiPost(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const BASE = import.meta.env.BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      const data = await apiPost(`${BASE}api/auth/super-admin/login`, { username, password });
      queryClient.setQueryData(["/api/auth/me"], { ...data.superAdmin, role: "super_admin" });
      setLocation("/super-admin");
    } catch (err: any) {
      setError(err?.message || "بيانات الدخول غير صحيحة");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "linear-gradient(135deg, #020817 0%, #050d1f 50%, #080318 100%)",
        fontFamily: "'Tajawal', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow — purple theme for super admin */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 60% 50% at 15% 20%, rgba(168,85,247,0.1) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 85% 80%, rgba(0,245,255,0.06) 0%, transparent 70%)
        `,
      }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: i % 2 === 0 ? 3 : 2,
            height: i % 2 === 0 ? 3 : 2,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#a855f7" : "#00f5ff",
            left: `${10 + i * 15}%`,
            top: `${15 + (i % 3) * 28}%`,
            opacity: 0.5,
          }}
          animate={{ y: [-12, 12, -12], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}
      >
        <div style={{
          background: "rgba(5,13,31,0.88)",
          backdropFilter: "blur(32px)",
          border: "1px solid rgba(168,85,247,0.2)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(168,85,247,0.08), 0 32px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Top neon line — purple for super admin */}
          <div style={{
            height: 2,
            background: "linear-gradient(90deg, transparent, #a855f7, #00f5ff, transparent)",
          }} />

          {/* Header */}
          <div style={{
            padding: "36px 32px 28px",
            textAlign: "center",
            borderBottom: "1px solid rgba(168,85,247,0.1)",
          }}>
            <motion.div
              animate={{ boxShadow: ["0 0 20px rgba(168,85,247,0.3)", "0 0 40px rgba(168,85,247,0.6)", "0 0 20px rgba(168,85,247,0.3)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.1))",
                border: "1px solid rgba(168,85,247,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Shield size={32} color="#a855f7" style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.8))" }} />
            </motion.div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, textShadow: "0 0 30px rgba(168,85,247,0.2)" }}>
              لوحة التحكم الرئيسية
            </h1>
            <p style={{ fontSize: 13, color: "rgba(168,85,247,0.55)", margin: "6px 0 0" }}>
              مدير النظام العام
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: "28px 32px 32px" }}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 12, marginBottom: 20,
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
                  color: "#f87171", fontSize: 13,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", flexShrink: 0, boxShadow: "0 0 6px #f87171" }} />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Username */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                  اسم المستخدم
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(168,85,247,0.5)" }} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    style={{
                      width: "100%", paddingRight: 42, paddingLeft: 14,
                      paddingTop: 12, paddingBottom: 12,
                      borderRadius: 12, fontSize: 14,
                      background: "rgba(168,85,247,0.04)",
                      border: "1px solid rgba(168,85,247,0.15)",
                      color: "#fff", outline: "none",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "rgba(168,85,247,0.5)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.1), 0 0 20px rgba(168,85,247,0.1)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(168,85,247,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                  الرمز السري
                </label>
                <div style={{ position: "relative" }}>
                  <KeyRound size={16} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(168,85,247,0.5)" }} />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", paddingRight: 42, paddingLeft: 42,
                      paddingTop: 12, paddingBottom: 12,
                      borderRadius: 12, fontSize: 14,
                      background: "rgba(168,85,247,0.04)",
                      border: "1px solid rgba(168,85,247,0.15)",
                      color: "#fff", outline: "none",
                      transition: "all 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "rgba(168,85,247,0.5)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.1)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(168,85,247,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 2 }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit — purple gradient for super admin */}
              <motion.button
                type="submit"
                disabled={isPending}
                whileHover={{ scale: isPending ? 1 : 1.02 }}
                whileTap={{ scale: isPending ? 1 : 0.98 }}
                style={{
                  width: "100%", padding: "14px",
                  borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, rgba(168,85,247,0.9), rgba(139,92,246,0.9))",
                  color: "#fff", fontWeight: 700, fontSize: 15,
                  cursor: isPending ? "not-allowed" : "pointer",
                  marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
                  opacity: isPending ? 0.6 : 1,
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                {isPending ? (
                  <><Loader2 size={18} className="animate-spin" /> جاري الدخول...</>
                ) : (
                  <><Shield size={16} /> دخول لوحة التحكم</>
                )}
              </motion.button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => setLocation("/login")}
                style={{ fontSize: 11, color: "rgba(0,245,255,0.4)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s", fontFamily: "'Tajawal', sans-serif" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(0,245,255,0.8)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,245,255,0.4)")}
              >
                الدخول كموظف →
              </button>
            </div>
          </div>
        </div>

        {/* Bottom glow */}
        <div style={{
          position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)",
          width: 200, height: 60,
          background: "radial-gradient(ellipse, rgba(168,85,247,0.15), transparent 70%)",
          pointerEvents: "none",
        }} />
      </motion.div>
    </div>
  );
}
