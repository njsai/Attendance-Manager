import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, User, KeyRound, Zap, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { getAndClearCompanyInactiveFlag } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

async function fetchWithTimeout(input: RequestInfo, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function apiPost(url: string, body: object) {
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "error");
  return data;
}

async function apiFetch(url: string) {
  const res = await fetchWithTimeout(url, { credentials: "include" });
  if (!res.ok) throw new Error("unauthorized");
  return res.json();
}

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { t, dir } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    if (getAndClearCompanyInactiveFlag()) {
      setError(t("companyInactive"));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      await apiPost(`${BASE}api/auth/login`, { username, password });
      const user = await apiFetch(`${BASE}api/auth/me`);
      queryClient.setQueryData(["/api/auth/me"], user);
      setLocation("/");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "timeout") setError(t("connectionTimeout"));
      else setError(t("invalidCredentials"));
    } finally {
      setIsPending(false);
    }
  };

  const bg = isDark
    ? "linear-gradient(135deg, #020817 0%, #050d1f 50%, #080318 100%)"
    : "linear-gradient(135deg, #f0f9ff 0%, #fefefe 50%, #fdf4ff 100%)";
  const cardBg = isDark ? "rgba(5,13,31,0.85)" : "rgba(255,255,255,0.95)";
  const cardBorder = isDark ? "rgba(0,245,255,0.15)" : "rgba(0,180,200,0.2)";
  const cardShadow = isDark
    ? "0 0 60px rgba(0,245,255,0.06), 0 32px 80px rgba(0,0,0,0.5)"
    : "0 0 40px rgba(0,180,200,0.08), 0 20px 60px rgba(0,0,0,0.1)";
  const topLine = isDark
    ? "linear-gradient(90deg, transparent, #00f5ff, #a855f7, transparent)"
    : "linear-gradient(90deg, transparent, #0891b2, #9333ea, transparent)";
  const headerBorder = isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.12)";
  const titleColor = isDark ? "#fff" : "#0f172a";
  const subtitleColor = isDark ? "rgba(0,245,255,0.5)" : "rgba(8,145,178,0.7)";
  const labelColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.55)";
  const inputBg = isDark ? "rgba(0,245,255,0.03)" : "rgba(0,0,0,0.02)";
  const inputBorder = isDark ? "rgba(0,245,255,0.12)" : "rgba(0,180,200,0.2)";
  const inputColor = isDark ? "white" : "#0f172a";
  const iconColor = isDark ? "rgba(0,245,255,0.4)" : "rgba(8,145,178,0.5)";
  const footerColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.35)";
  const superAdminColor = isDark ? "rgba(168,85,247,0.5)" : "rgba(147,51,234,0.5)";
  const superAdminHover = isDark ? "#a855f7" : "#9333ea";

  return (
    <div
      dir={dir}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: bg,
        fontFamily: "'Tajawal', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow blobs */}
      {isDark && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, rgba(0,245,255,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 85% 80%, rgba(168,85,247,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 70%)
          `,
        }} />
      )}

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: i % 2 === 0 ? 3 : 2,
            height: i % 2 === 0 ? 3 : 2,
            borderRadius: "50%",
            background: i % 3 === 0 ? (isDark ? "#00f5ff" : "#0891b2") : i % 3 === 1 ? (isDark ? "#a855f7" : "#9333ea") : (isDark ? "#f97316" : "#ea580c"),
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            opacity: 0.4,
          }}
          animate={{ y: [-10, 10, -10], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}
      >
        {/* Card */}
        <div style={{
          background: cardBg,
          backdropFilter: "blur(32px)",
          border: `1px solid ${cardBorder}`,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: cardShadow,
        }}>

          {/* Neon top line */}
          <div style={{ height: 2, background: topLine }} />

          {/* Header */}
          <div style={{
            padding: "36px 32px 28px",
            textAlign: "center",
            borderBottom: `1px solid ${headerBorder}`,
            position: "relative",
          }}>
            <motion.div
              animate={{ boxShadow: isDark
                ? ["0 0 20px rgba(0,245,255,0.3)", "0 0 40px rgba(0,245,255,0.6)", "0 0 20px rgba(0,245,255,0.3)"]
                : ["0 0 12px rgba(0,180,200,0.2)", "0 0 24px rgba(0,180,200,0.35)", "0 0 12px rgba(0,180,200,0.2)"]
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: isDark
                  ? "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(59,130,246,0.1))"
                  : "linear-gradient(135deg, rgba(0,180,200,0.12), rgba(59,130,246,0.08))",
                border: `1px solid ${isDark ? "rgba(0,245,255,0.3)" : "rgba(0,180,200,0.25)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Zap size={32} color={isDark ? "#00f5ff" : "#0891b2"} style={{ filter: isDark ? "drop-shadow(0 0 8px rgba(0,245,255,0.8))" : "none" }} />
            </motion.div>

            <h1 style={{
              fontSize: 22, fontWeight: 800, color: titleColor, margin: 0,
              textShadow: isDark ? "0 0 30px rgba(0,245,255,0.2)" : "none",
            }}>
              {t("systemName")}
            </h1>
            <p style={{ fontSize: 13, color: subtitleColor, margin: "6px 0 0" }}>
              {t("enterCredentials")}
            </p>
          </div>

          {/* Form */}
          <div style={{ padding: "28px 32px 32px" }}>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 12, marginBottom: 20,
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.25)",
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
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: labelColor, marginBottom: 8 }}>
                  {t("usernameField")}
                </label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{
                    position: "absolute",
                    insetInlineEnd: 14,
                    top: "50%", transform: "translateY(-50%)",
                    color: iconColor,
                  }} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t("enterUsername")}
                    className="neon-input"
                    style={{
                      width: "100%",
                      paddingInlineEnd: 42,
                      paddingInlineStart: 14,
                      paddingTop: 12, paddingBottom: 12,
                      borderRadius: 12, fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: labelColor, marginBottom: 8 }}>
                  {t("passwordField")}
                </label>
                <div style={{ position: "relative" }}>
                  <KeyRound size={16} style={{
                    position: "absolute",
                    insetInlineEnd: 14,
                    top: "50%", transform: "translateY(-50%)",
                    color: iconColor,
                  }} />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    className="neon-input"
                    style={{
                      width: "100%",
                      paddingInlineEnd: 42,
                      paddingInlineStart: 42,
                      paddingTop: 12, paddingBottom: 12,
                      borderRadius: 12, fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: "absolute",
                      insetInlineStart: 12,
                      top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.3)", padding: 2,
                    }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isPending}
                whileHover={{ scale: isPending ? 1 : 1.02 }}
                whileTap={{ scale: isPending ? 1 : 0.98 }}
                className="btn-neon"
                style={{
                  width: "100%", padding: "14px",
                  borderRadius: 14, border: "none",
                  fontSize: 15, cursor: isPending ? "not-allowed" : "pointer",
                  marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {isPending ? (
                  <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> {t("loggingIn")}</>
                ) : (
                  <><Zap size={16} /> {t("loginBtn")}</>
                )}
              </motion.button>
            </form>

            {/* Footer links */}
            <div style={{ textAlign: "center", marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 11, color: footerColor }}>
                {t("forgotCredentials")}
              </p>
              <a
                href="/super-admin/login"
                style={{
                  fontSize: 11, color: superAdminColor,
                  textDecoration: "none", transition: "color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = superAdminHover)}
                onMouseLeave={e => (e.currentTarget.style.color = superAdminColor)}
              >
                {t("superAdminLoginLink")}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom glow */}
        {isDark && (
          <div style={{
            position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 60,
            background: "radial-gradient(ellipse, rgba(0,245,255,0.15), transparent 70%)",
            pointerEvents: "none",
          }} />
        )}
      </motion.div>
    </div>
  );
}
