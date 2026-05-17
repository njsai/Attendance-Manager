import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Building2, Plus, Trash2, Edit, Users, LogOut, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, EyeOff, Key, Loader2, RefreshCw, MessageCircle, ShieldAlert, HardDrive, Download, Archive, Activity, CreditCard, Bell, Globe, Settings, Calendar, AlertTriangle, Infinity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SuperAdminChat from "./Chat";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { SA_T, getSAColors } from "@/lib/sa-utils";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

interface Company {
  id: number; name: string; address?: string; phone?: string; email?: string;
  isActive: boolean; createdAt: string; employeeCount: number;
  subId?: number | null; planName?: string | null; planType?: string | null;
  subStatus?: string | null; endDate?: string | null; daysRemaining?: number | null;
}

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { lang, dir, setLang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = getSAColors(isDark);
  const T = SA_T[lang];
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [companyEmployees, setCompanyEmployees] = useState<Record<number, any[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState<Company | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<{ companyId: number; empId: number; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<"companies" | "backups">("companies");
  const [backups, setBackups] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupCompanyId, setBackupCompanyId] = useState<string>("0");
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const showMsg = (msg: string, ok = true) => { setFeedback({ msg, ok }); setTimeout(() => setFeedback(null), 3000); };

  const loadUnreadCount = async () => {
    try {
      const data = await apiFetch("api/super-admin/notifications");
      setUnreadNotifCount(data.unreadCount ?? 0);
    } catch { /* silent */ }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try { setCompanies(await apiFetch("api/super-admin/companies")); }
    catch { showMsg("فشل تحميل الشركات", false); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadCompanies();
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadEmployees = async (cId: number) => {
    if (companyEmployees[cId]) return;
    try {
      const emps = await apiFetch(`api/super-admin/companies/${cId}/employees`);
      setCompanyEmployees(prev => ({ ...prev, [cId]: emps }));
    } catch { showMsg("فشل تحميل الموظفين", false); }
  };

  const toggleExpand = (cId: number) => {
    if (expandedId === cId) { setExpandedId(null); return; }
    setExpandedId(cId);
    loadEmployees(cId);
  };

  const toggleCompany = async (c: Company) => {
    try {
      await apiFetch(`api/super-admin/companies/${c.id}/toggle`, { method: "PUT" });
      setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, isActive: !co.isActive } : co));
      showMsg(`تم ${c.isActive ? "إيقاف" : "تفعيل"} الشركة`);
    } catch (err: any) { showMsg(err.message, false); }
  };

  const deleteCompany = async (c: Company) => {
    try {
      await apiFetch(`api/super-admin/companies/${c.id}`, { method: "DELETE" });
      setCompanies(prev => prev.filter(co => co.id !== c.id));
      setShowDeleteConfirm(null);
      showMsg("تم حذف الشركة");
    } catch (err: any) { showMsg(err.message, false); }
  };

  const logout = async () => {
    await fetch(`${BASE}api/auth/logout`, { method: "POST", credentials: "include" });
    queryClient.clear();
    setLocation("/super-admin/login");
  };

  const loadBackups = async () => {
    setBackupsLoading(true);
    try { setBackups(await apiFetch("api/super-admin/backups")); }
    catch { showMsg("فشل تحميل النسخ الاحتياطية", false); }
    finally { setBackupsLoading(false); }
  };

  const createBackup = async () => {
    setCreatingBackup(true);
    try {
      const bk = await apiFetch("api/super-admin/backups", {
        method: "POST", body: JSON.stringify({ companyId: parseInt(backupCompanyId) }),
      });
      setBackups(prev => [bk, ...prev]);
      showMsg("تم إنشاء النسخة الاحتياطية بنجاح");
    } catch (err: any) { showMsg(err.message || "فشل إنشاء النسخة", false); }
    finally { setCreatingBackup(false); }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm("حذف هذه النسخة الاحتياطية؟")) return;
    try {
      await apiFetch(`api/super-admin/backups/${encodeURIComponent(filename)}`, { method: "DELETE" });
      setBackups(prev => prev.filter(b => b.filename !== filename));
      showMsg("تم حذف النسخة");
    } catch (err: any) { showMsg(err.message, false); }
  };

  const downloadBackup = (filename: string) => {
    window.open(`${BASE}api/super-admin/backups/${encodeURIComponent(filename)}/download`, "_blank");
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div dir={dir} style={{
      minHeight: "100vh",
      background: C.pageBg,
      fontFamily: "'Tajawal', sans-serif",
      position: "relative",
      color: C.textPrimary,
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 55% 45% at 8% 12%, rgba(168,85,247,0.06) 0%, transparent 70%), radial-gradient(ellipse 45% 55% at 92% 88%, rgba(0,245,255,0.05) 0%, transparent 70%)" }} />

      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${isDark ? "rgba(168,85,247,0.15)" : C.headerBorder}`, backdropFilter: isDark ? "blur(20px)" : "none", position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(168,85,247,0.2)" }}>
              <Shield size={20} style={{ color: "#a855f7", filter: "drop-shadow(0 0 6px rgba(168,85,247,0.6))" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{T.dashboardTitle}</h1>
              <p style={{ fontSize: 11, color: isDark ? "rgba(168,85,247,0.5)" : "#7c3aed", margin: 0 }}>{T.manageAllCompanies}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button onClick={loadCompanies} style={{ padding: 8, borderRadius: 9, border: `1px solid ${C.cardBorder}`, background: C.cardBg, color: C.textSecondary, cursor: "pointer" }}>
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setLocation("/super-admin/monitoring")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(0,245,255,0.2)", background: "rgba(0,245,255,0.06)", color: "#00f5ff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Activity size={14} /> {T.monitoring}
            </button>
            <button onClick={() => setLocation("/super-admin/subscriptions")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.06)", color: "#a855f7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <CreditCard size={14} /> {T.subscriptions}
            </button>
            <button onClick={() => setLocation("/super-admin/notifications")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)", color: "#f59e0b", fontSize: 12, fontWeight: 600, cursor: "pointer", position: "relative" }}>
              <Bell size={14} />
              {unreadNotifCount > 0 && (
                <span style={{ position: "absolute", top: -5, insetInlineEnd: -5, minWidth: 17, height: 17, borderRadius: 9, background: "#f87171", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid rgba(5,8,23,0.9)" }}>
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}
              {T.notifications}
            </button>
            <button onClick={() => setLocation("/super-admin/security")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <ShieldAlert size={14} /> {T.security}
            </button>
            <button onClick={() => setLocation("/super-admin/settings")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.08)", color: "#a855f7", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Settings size={14} /> {lang === "ar" ? "الإعدادات" : "Settings"}
            </button>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Globe size={13} /> {lang === "ar" ? "EN" : "عر"}
            </button>
            <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <LogOut size={14} /> {T.signOut}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" style={{ position: "relative", zIndex: 1 }}>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: T.totalCompanies,    value: companies.length,                                    icon: Building2,   color: "#a855f7", bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.25)" },
            { label: T.activeCompanies,   value: companies.filter(c => c.isActive).length,            icon: CheckCircle, color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
            { label: T.suspendedCompanies,value: companies.filter(c => !c.isActive).length,           icon: XCircle,     color: "#f43f5e", bg: "rgba(244,63,94,0.1)",  border: "rgba(244,63,94,0.25)" },
            { label: T.totalEmployees,    value: companies.reduce((s, c) => s + c.employeeCount, 0), icon: Users,       color: "#00f5ff", bg: "rgba(0,245,255,0.08)", border: "rgba(0,245,255,0.2)" },
          ].map(s => (
            <div key={s.label} style={{ background: isDark ? s.bg : "#fff", border: `1px solid ${isDark ? s.border : "#e2e8f0"}`, borderRadius: 16, padding: 16, boxShadow: isDark ? `0 0 20px ${s.bg}` : "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1, textShadow: isDark ? `0 0 20px ${s.color}60` : "none" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "companies" as const, label: T.companiesTab, icon: Building2 },
            { key: "backups" as const, label: T.backupsTab, icon: HardDrive },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); if (t.key === "backups") loadBackups(); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 11,
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", border: "none",
                background: activeTab === t.key ? "rgba(168,85,247,0.18)" : C.cardBg,
                color: activeTab === t.key ? "#a855f7" : C.textMuted,
                outline: activeTab === t.key ? "1px solid rgba(168,85,247,0.35)" : `1px solid ${C.cardBorder}`,
                boxShadow: activeTab === t.key ? "0 0 16px rgba(168,85,247,0.12)" : "none",
              }}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Backups Tab */}
        {activeTab === "backups" && (
          <div className="space-y-4">
            {/* Create Backup */}
            <div style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: 20 }}>
              <h3 style={{ color: C.textPrimary, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <Archive size={16} style={{ color: "#a855f7" }} />
                {T.createBackup}
              </h3>
              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-48">
                  <label style={{ color: C.textMuted, fontSize: 11, display: "block", marginBottom: 6 }}>{T.backupsTab}</label>
                  <select
                    value={backupCompanyId}
                    onChange={e => setBackupCompanyId(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.inputText, fontSize: 13, outline: "none" }}
                  >
                    <option value="0" style={{ background: isDark ? "#050d1f" : "#fff" }}>{T.allCompanies}</option>
                    {companies.map(c => (
                      <option key={c.id} value={String(c.id)} style={{ background: "#050d1f" }}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={createBackup}
                  disabled={creatingBackup}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(139,92,246,0.8))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: creatingBackup ? "not-allowed" : "pointer", opacity: creatingBackup ? 0.6 : 1, boxShadow: "0 4px 16px rgba(168,85,247,0.3)" }}
                >
                  {creatingBackup ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
                  {creatingBackup ? T.loading : T.createBackup}
                </button>
              </div>
            </div>

            {/* Backups List */}
            {backupsLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={28} style={{ color: "#a855f7" }} className="animate-spin" /></div>
            ) : backups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.textMuted }}>
                <HardDrive size={48} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
                <p style={{ fontSize: 14 }}>{T.noBackups}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map(bk => (
                  <div key={bk.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Archive size={16} style={{ color: "#a855f7" }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {bk.companyId === 0 ? T.allCompanies : companies.find(c => c.id === bk.companyId)?.name || `#${bk.companyId}`}
                        </p>
                        <p style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                          {new Date(bk.createdAt).toLocaleString(lang === "ar" ? "ar-IQ" : "en-US")} · {formatSize(bk.sizeBytes)}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => downloadBackup(bk.filename)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)", color: "#10b981", fontSize: 11, cursor: "pointer" }}>
                        <Download size={12} /> تنزيل
                      </button>
                      <button onClick={() => deleteBackup(bk.filename)} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Companies Tab Content */}
        {activeTab === "companies" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 18, margin: 0 }}>{T.companiesTab}</h2>
              <button onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.8), rgba(59,130,246,0.8))", color: isDark ? "#020817" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,245,255,0.25)" }}>
                <Plus size={15} /> {T.createCompany}
              </button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: feedback.ok ? "rgba(16,185,129,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${feedback.ok ? "rgba(16,185,129,0.2)" : "rgba(248,113,113,0.2)"}`, color: feedback.ok ? "#10b981" : "#f87171" }}>
                  {feedback.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {feedback.msg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Companies list */}
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
                <Loader2 size={36} style={{ color: "#a855f7" }} className="animate-spin" />
              </div>
            ) : companies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
                <Building2 size={48} style={{ margin: "0 auto 12px", opacity: 0.2 }} />
                <p style={{ fontSize: 14 }}>{T.noCompanies}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {companies.map(company => (
                  <div key={company.id} style={{ background: company.isActive ? "rgba(0,245,255,0.02)" : "rgba(255,255,255,0.02)", border: `1px solid ${company.isActive ? "rgba(0,245,255,0.1)" : "rgba(255,255,255,0.06)"}`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Building2 size={20} style={{ color: "#00f5ff" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: 14, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company.name}</h3>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: company.isActive ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)", color: company.isActive ? "#10b981" : "#f87171", border: `1px solid ${company.isActive ? "rgba(16,185,129,0.25)" : "rgba(248,113,113,0.25)"}`, flexShrink: 0 }}>
                            {company.isActive ? T.active : T.suspended}
                          </span>
                          {/* Subscription expiry badge */}
                          {company.subStatus === "active" && company.planType === "lifetime" && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: "rgba(0,245,255,0.08)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.2)", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                              <Infinity size={9} /> دائم
                            </span>
                          )}
                          {company.subStatus === "active" && company.planType !== "lifetime" && company.daysRemaining !== null && company.daysRemaining !== undefined && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
                              background: company.daysRemaining <= 1 ? "rgba(248,113,113,0.15)" : company.daysRemaining <= 7 ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.08)",
                              color: company.daysRemaining <= 1 ? "#f87171" : company.daysRemaining <= 7 ? "#f59e0b" : "#10b981",
                              border: `1px solid ${company.daysRemaining <= 1 ? "rgba(248,113,113,0.3)" : company.daysRemaining <= 7 ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.2)"}`,
                              display: "flex", alignItems: "center", gap: 3,
                              animation: company.daysRemaining <= 1 ? "pulse 1.5s infinite" : "none",
                            }}>
                              {company.daysRemaining <= 7 && <AlertTriangle size={9} />}
                              {company.daysRemaining <= 0 ? "منتهي" : `${company.daysRemaining} يوم`}
                            </span>
                          )}
                          {company.subStatus === "expired" && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", flexShrink: 0 }}>
                              انتهى الاشتراك
                            </span>
                          )}
                          {!company.subId && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: "rgba(156,163,175,0.1)", color: "#9ca3af", border: "1px solid rgba(156,163,175,0.2)", flexShrink: 0 }}>
                              بدون اشتراك
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                          {company.phone && <span style={{ fontSize: 11, color: C.textMuted }}>📞 {company.phone}</span>}
                          {company.email && <span style={{ fontSize: 11, color: C.textMuted }}>✉️ {company.email}</span>}
                          <span style={{ fontSize: 11, color: "#00f5ff", display: "flex", alignItems: "center", gap: 3 }}><Users size={10} /> {company.employeeCount} {T.employees}</span>
                          {company.endDate && company.planType !== "lifetime" && (
                            <span style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 3 }}>
                              <Calendar size={9} /> {new Date(company.endDate).toLocaleDateString("ar-IQ")}
                            </span>
                          )}
                          {company.planName && (
                            <span style={{ fontSize: 11, color: "rgba(168,85,247,0.7)", display: "flex", alignItems: "center", gap: 3 }}>
                              <CreditCard size={9} /> {company.planName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {[
                          { icon: company.isActive ? EyeOff : Eye, color: company.isActive ? "#f59e0b" : "#10b981", action: () => toggleCompany(company), title: "تفعيل/إيقاف" },
                          { icon: Edit, color: "#3b82f6", action: () => setShowEditModal(company), title: "تعديل" },
                          { icon: Trash2, color: "#f87171", action: () => setShowDeleteConfirm(company), title: "حذف" },
                        ].map(({ icon: Icon, color, action, title }) => (
                          <button key={title} onClick={action} title={title} style={{ padding: 7, borderRadius: 8, border: "none", background: "transparent", color, cursor: "pointer" }}>
                            <Icon size={15} />
                          </button>
                        ))}
                        <button onClick={() => toggleExpand(company.id)} style={{ padding: 7, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                          {expandedId === company.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === company.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px" }}>
                            <h4 style={{ color: C.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                              <Users size={13} /> {T.employees} ({companyEmployees[company.id]?.length ?? "..."})
                            </h4>
                            {companyEmployees[company.id] ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {companyEmployees[company.id].map(emp => (
                                  <div key={emp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", borderRadius: 10, border: `1px solid ${C.cardBorder}` }}>
                                    <div>
                                      <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>{emp.fullName}</div>
                                      <div style={{ color: C.textMuted, fontSize: 11 }}>@{emp.username} · {emp.role === "admin" ? T.roleAdmin : emp.role === "manager" ? T.roleManager : T.roleEmployee}</div>
                                    </div>
                                    <button onClick={() => setShowPasswordModal({ companyId: company.id, empId: emp.id, name: emp.fullName })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(0,245,255,0.15)", background: "rgba(0,245,255,0.05)", color: "rgba(0,245,255,0.6)", fontSize: 11, cursor: "pointer" }}>
                                      <Key size={11} /> {T.password}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                                <Loader2 size={20} style={{ color: "#a855f7" }} className="animate-spin" />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Chat Section */}
        {activeTab === "companies" && !loading && companies.length > 0 && (
          <div className="space-y-4">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <MessageCircle size={18} style={{ color: "#a855f7" }} />
              <h2 style={{ color: C.textPrimary, fontWeight: 800, fontSize: 18, margin: 0 }}>{T.supportCenter}</h2>
            </div>
            <SuperAdminChat companies={companies.map(c => ({ id: c.id, name: c.name, isActive: c.isActive }))} />
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreateModal && <CreateCompanyModal onClose={() => setShowCreateModal(false)} onCreated={(c) => { setCompanies(prev => [c, ...prev]); setShowCreateModal(false); showMsg("تم إنشاء الشركة بنجاح"); }} />}

      {/* Edit Modal */}
      {showEditModal && <EditCompanyModal company={showEditModal} onClose={() => setShowEditModal(null)} onUpdated={(c) => { setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, ...c } : co)); setShowEditModal(null); showMsg("تم تحديث الشركة"); }} />}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} dir={dir}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: isDark ? "rgba(5,13,31,0.95)" : "#fff", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, textAlign: "center", backdropFilter: "blur(20px)" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} style={{ color: "#f87171" }} />
            </div>
            <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.deleteCompany}</h3>
            <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>{T.confirmDeleteMsg} "<strong style={{ color: C.textPrimary }}>{showDeleteConfirm.name}</strong>"؟ {T.confirmDeleteData}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowDeleteConfirm(null)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${C.cardBorder}`, background: C.cardBg, color: C.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{T.cancel}</button>
              <button onClick={() => deleteCompany(showDeleteConfirm)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(239,68,68,0.3)" }}>{T.deleteBtn}</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && <ChangePasswordModal {...showPasswordModal} onClose={() => setShowPasswordModal(null)} onChanged={() => { setShowPasswordModal(null); showMsg("تم تغيير كلمة المرور"); }} />}
    </div>
  );
}

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: any) => void }) {
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", adminUsername: "", adminPassword: "", adminFullName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await apiFetch("api/super-admin/companies", { method: "POST", body: JSON.stringify(form) });
      onCreated({ ...data.company, employeeCount: 1 });
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.12)", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16, overflowY: "auto" }} dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(0,245,255,0.15)", borderRadius: 22, width: "100%", maxWidth: 520, backdropFilter: "blur(24px)", boxShadow: "0 0 60px rgba(0,245,255,0.08)", overflow: "hidden" }}>
        {/* Top neon line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #00f5ff, #a855f7, transparent)" }} />
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,245,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Building2 size={16} style={{ color: "#00f5ff" }} /> إضافة شركة جديدة
          </h2>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><XCircle size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 12 }}>{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "name", l: "اسم الشركة *", t: "text" }, { k: "address", l: "العنوان", t: "text" },
              { k: "phone", l: "الهاتف", t: "text" }, { k: "email", l: "البريد الإلكتروني", t: "email" },
            ].map(f => (
              <div key={f.k} className={f.k === "name" || f.k === "address" ? "col-span-2" : ""}>
                <label style={labelStyle}>{f.l}</label>
                <input type={f.t} value={(form as any)[f.k]} onChange={set(f.k)} required={f.l.includes("*")} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(0,245,255,0.08)", paddingTop: 14 }}>
            <p style={{ fontSize: 11, color: "rgba(0,245,255,0.5)", fontWeight: 600, marginBottom: 12 }}>بيانات مدير الشركة</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "adminFullName", l: "الاسم الكامل *", t: "text" },
                { k: "adminUsername", l: "اسم المستخدم *", t: "text" },
                { k: "adminPassword", l: "كلمة المرور *", t: "password" },
              ].map(f => (
                <div key={f.k} className={f.k === "adminFullName" ? "col-span-2" : ""}>
                  <label style={labelStyle}>{f.l}</label>
                  <input type={f.t} value={(form as any)[f.k]} onChange={set(f.k)} required style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>إلغاء</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "11px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.85), rgba(59,130,246,0.85))", color: "#020817", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 16px rgba(0,245,255,0.2)" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} إنشاء الشركة
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function EditCompanyModal({ company, onClose, onUpdated }: { company: Company; onClose: () => void; onUpdated: (c: any) => void }) {
  const [form, setForm] = useState({ name: company.name, address: company.address || "", phone: company.phone || "", email: company.email || "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { onUpdated(await apiFetch(`api/super-admin/companies/${company.id}`, { method: "PUT", body: JSON.stringify(form) })); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.12)", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(0,245,255,0.15)", borderRadius: 20, width: "100%", maxWidth: 440, backdropFilter: "blur(24px)", overflow: "hidden" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #00f5ff, transparent)" }} />
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(0,245,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Edit size={15} style={{ color: "#00f5ff" }} /> تعديل {company.name}
          </h2>
          <button onClick={onClose} style={{ padding: 5, borderRadius: 7, border: "none", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><XCircle size={17} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {error && <div style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 12 }}>{error}</div>}
          {[{ k: "name", l: "اسم الشركة *" }, { k: "address", l: "العنوان" }, { k: "phone", l: "الهاتف" }, { k: "email", l: "البريد" }].map(f => (
            <div key={f.k}>
              <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 5 }}>{f.l}</label>
              <input type="text" value={(form as any)[f.k]} onChange={set(f.k)} required={f.l.includes("*")} style={inputStyle} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>إلغاء</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.85), rgba(59,130,246,0.85))", color: "#020817", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {loading && <Loader2 size={13} className="animate-spin" />} حفظ
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ChangePasswordModal({ companyId, empId, name, onClose, onChanged }: { companyId: number; empId: number; name: string; onClose: () => void; onChanged: () => void }) {
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await apiFetch(`api/super-admin/companies/${companyId}/employees/${empId}/change-password`, { method: "PUT", body: JSON.stringify({ newPassword: newPass }) });
      onChanged();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} dir="rtl">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 18, width: "100%", maxWidth: 360, backdropFilter: "blur(24px)", padding: 24, boxShadow: "0 0 40px rgba(249,115,22,0.08)" }}>
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Key size={15} style={{ color: "#f97316" }} /> تغيير كلمة مرور {name}
        </h3>
        {error && <div style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="كلمة المرور الجديدة" required minLength={6}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(249,115,22,0.2)", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>إلغاء</button>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(249,115,22,0.85), rgba(234,88,12,0.85))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {loading && <Loader2 size={13} className="animate-spin" />} حفظ
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
