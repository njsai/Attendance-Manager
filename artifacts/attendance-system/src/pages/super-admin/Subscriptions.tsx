import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CreditCard, Building2, Clock, CheckCircle, XCircle, AlertTriangle,
  Plus, ChevronLeft, RefreshCw, Calendar, DollarSign, Users, Layers,
  ArrowRight, FileText, Printer, TrendingUp, Edit2, Save, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface Plan {
  id: number; name: string; type: string; price: number; currency: string;
  max_employees: number; max_branches: number; storage_gb: number;
  features: string[]; is_active: boolean;
}

interface SubOverview {
  id: number; company_name: string; is_active: boolean;
  sub_id: number | null; plan_name: string | null; plan_type: string | null;
  status: string | null; end_date: string | null; price: number | null;
  currency: string | null; days_remaining: number | null;
}

interface Payment {
  id: number; invoice_number: string; amount: number; currency: string;
  payment_method: string; status: string; plan_name: string; plan_type: string;
  company_name: string; period_start: string | null; period_end: string | null;
  created_at: string; paid_at: string | null;
}

const PLAN_LABELS_AR: Record<string, string> = {
  monthly: "شهري", semi_annual: "نصف سنوي", annual: "سنوي", lifetime: "مدى الحياة"
};
const PLAN_LABELS_EN: Record<string, string> = {
  monthly: "Monthly", semi_annual: "Semi-Annual", annual: "Annual", lifetime: "Lifetime"
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:    { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  expired:   { bg: "rgba(248,113,113,0.12)", text: "#f87171" },
  cancelled: { bg: "rgba(156,163,175,0.12)", text: "#9ca3af" },
  trial:     { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },
};

const card = (extra?: any) => ({
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16, padding: 20, backdropFilter: "blur(12px)", ...extra,
});

export default function SubscriptionsPage() {
  const [, setLocation] = useLocation();
  const { lang, dir, setLang } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = getSAColors(isDark);
  const T = SA_T[lang];
  const [tab, setTab] = useState<"overview" | "plans" | "payments">("overview");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [overview, setOverview] = useState<SubOverview[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<SubOverview | null>(null);
  const [companyPayments, setCompanyPayments] = useState<Payment[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<SubOverview | null>(null);
  const [showExtendModal, setShowExtendModal] = useState<SubOverview | null>(null);
  const [showInvoice, setShowInvoice] = useState<Payment | null>(null);
  const [assignForm, setAssignForm] = useState({ planId: "", startDate: new Date().toISOString().slice(0,10), endDate: "", autoRenew: false });
  const [extendForm, setExtendForm] = useState({ months: "1", amount: "", paymentMethod: "manual" });
  const [saving, setSaving] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", maxEmployees: "", maxBranches: "", storageGb: "", features: "" });

  const showMsg = (msg: string, ok = true) => { setFeedback({ msg, ok }); setTimeout(() => setFeedback(null), 4000); };
  const PLAN_LABELS = lang === "ar" ? PLAN_LABELS_AR : PLAN_LABELS_EN;
  const STATUS_LABELS: Record<string, string> = {
    active: T.statusActive, expired: T.statusExpired,
    cancelled: T.statusCancelled, trial: T.statusTrial,
  };
  const timeLocale = lang === "ar" ? "ar-IQ" : "en-US";
  const cardStyle = (extra?: any) => ({
    background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0"}`,
    borderRadius: 16, padding: 20,
    backdropFilter: isDark ? "blur(12px)" : "none",
    ...extra,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o, pay] = await Promise.all([
        apiFetch("api/super-admin/plans"),
        apiFetch("api/super-admin/subscriptions-overview"),
        apiFetch("api/super-admin/payments"),
      ]);
      setPlans(p); setOverview(o); setPayments(pay);
    } catch (err: any) { showMsg(err.message, false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadCompanyPayments = async (cId: number) => {
    try { setCompanyPayments(await apiFetch(`api/super-admin/companies/${cId}/payments`)); }
    catch {}
  };

  const handleAssign = async () => {
    if (!showAssignModal || !assignForm.planId) return;
    setSaving(true);
    try {
      const plan = plans.find(p => p.id === parseInt(assignForm.planId));
      const endDate = plan?.type === "lifetime" ? null : assignForm.endDate || null;
      await apiFetch(`api/super-admin/companies/${showAssignModal.id}/subscription`, {
        method: "POST", body: JSON.stringify({ planId: parseInt(assignForm.planId), startDate: assignForm.startDate, endDate, autoRenew: assignForm.autoRenew }),
      });
      showMsg(T.subscriptionActivated);
      setShowAssignModal(null);
      load();
    } catch (err: any) { showMsg(err.message, false); }
    finally { setSaving(false); }
  };

  const openEditPlan = (plan: Plan) => {
    setEditPlan(plan);
    setEditForm({
      name: plan.name,
      price: String(plan.price),
      maxEmployees: String(plan.max_employees),
      maxBranches: String(plan.max_branches),
      storageGb: String(plan.storage_gb),
      features: Array.isArray(plan.features) ? plan.features.join("\n") : "",
    });
  };

  const handleEditPlan = async () => {
    if (!editPlan) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`api/super-admin/plans/${editPlan.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name,
          price: parseFloat(editForm.price),
          maxEmployees: parseInt(editForm.maxEmployees),
          maxBranches: parseInt(editForm.maxBranches),
          storageGb: parseFloat(editForm.storageGb),
          features: editForm.features.split("\n").map(f => f.trim()).filter(Boolean),
          isActive: editPlan.is_active,
        }),
      });
      setPlans(prev => prev.map(p => p.id === editPlan.id ? { ...p, ...updated } : p));
      showMsg(T.changesSaved);
      setEditPlan(null);
    } catch (err: any) { showMsg(err.message, false); }
    finally { setSaving(false); }
  };

  const handleExtend = async () => {
    if (!showExtendModal) return;
    setSaving(true);
    try {
      await apiFetch(`api/super-admin/companies/${showExtendModal.id}/subscription/extend`, {
        method: "POST", body: JSON.stringify({ months: parseInt(extendForm.months), amount: parseFloat(extendForm.amount) || undefined, paymentMethod: extendForm.paymentMethod }),
      });
      showMsg(T.subscriptionExtended);
      setShowExtendModal(null);
      load();
    } catch (err: any) { showMsg(err.message, false); }
    finally { setSaving(false); }
  };

  // Summaries
  const activeCount = overview.filter(o => o.status === "active").length;
  const expiredCount = overview.filter(o => o.status === "expired").length;
  const expiringCount = overview.filter(o => o.days_remaining !== null && o.days_remaining >= 0 && o.days_remaining <= 7).length;
  const totalRevenue = payments.filter(p => p.status === "paid").reduce((a, b) => a + (b.amount ?? 0), 0);

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: C.pageBg, fontFamily: "'Tajawal', sans-serif", color: C.textPrimary }}>
      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100,
              background: feedback.ok ? "rgba(16,185,129,0.9)" : "rgba(248,113,113,0.9)",
              color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ background: C.headerBg, borderBottom: `1px solid ${C.headerBorder}`, backdropFilter: isDark ? "blur(20px)" : "none", position: "sticky", top: 0, zIndex: 10, boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.07)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setLocation("/super-admin")} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.textSecondary }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={20} style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.textPrimary }}>{T.subscriptionsSystem}</h1>
              <p style={{ fontSize: 11, color: isDark ? "rgba(168,85,247,0.5)" : "#7c3aed", margin: 0 }}>{T.managePlansInvoices}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Globe size={13} /> {lang === "ar" ? "EN" : "عر"}
            </button>
            <button onClick={load} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.06)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#a855f7" }}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", gap: 0, borderTop: `1px solid ${C.cardBorder}` }}>
          {[
            { k: "overview", l: T.overviewTab, icon: <Building2 size={13}/> },
            { k: "plans",    l: T.plansTab,    icon: <Layers size={13}/> },
            { k: "payments", l: T.paymentsTab, icon: <DollarSign size={13}/> },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: "none", background: "none", color: tab === t.k ? "#a855f7" : C.textMuted,
              borderBottom: `2px solid ${tab === t.k ? "#a855f7" : "transparent"}`, transition: "all 0.2s",
            }}>
              {t.icon}{t.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: T.activeSubsCount,  value: activeCount, color: "#10b981", icon: <CheckCircle size={16}/> },
            { label: T.expiredSubsCount, value: expiredCount, color: "#f87171", icon: <XCircle size={16}/> },
            { label: T.expiresIn7Days,   value: expiringCount, color: "#f59e0b", icon: <AlertTriangle size={16}/> },
            { label: T.totalRevenueLabel,value: `$${totalRevenue.toLocaleString()}`, color: "#a855f7", icon: <TrendingUp size={16}/> },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: item.color, marginBottom: 8 }}>
                {item.icon}<span style={{ fontSize: 11, color: C.textMuted }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
            </motion.div>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div style={cardStyle()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{T.companySubStatus}</span>
            </div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 32, color: C.textMuted }}>{T.loading}</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: C.textMuted, fontSize: 11, background: isDark ? "transparent" : "#f8fafc" }}>
                      {[T.companyCol, T.planCol, T.typeCol, T.statusCol, T.expiryDateCol, T.daysRemainingCol, T.actionsCol].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: dir === "rtl" ? "right" : "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.map((row, i) => {
                      const sc = row.status ? STATUS_COLORS[row.status] : null;
                      const statusLabel = row.status ? STATUS_LABELS[row.status] : null;
                      const warning = row.days_remaining !== null && row.days_remaining >= 0 && row.days_remaining <= 7;
                      return (
                        <tr key={row.id} style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}`, background: i % 2 === 0 ? (isDark ? "rgba(255,255,255,0.01)" : "#fafbfc") : "transparent" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.is_active ? "#10b981" : "#f87171", flexShrink: 0 }} />
                              <span style={{ fontWeight: 600, color: C.textPrimary }}>{row.company_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", color: C.textSecondary }}>{row.plan_name ?? "—"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            {row.plan_type && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(0,245,255,0.1)", color: "#00f5ff" }}>{PLAN_LABELS[row.plan_type] ?? row.plan_type}</span>}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {sc && statusLabel ? <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700, background: sc.bg, color: sc.text }}>{statusLabel}</span> : <span style={{ color: C.textMuted }}>{T.noSubscription}</span>}
                          </td>
                          <td style={{ padding: "10px 12px", color: warning ? "#f59e0b" : C.textMuted }}>
                            {row.plan_type === "lifetime" ? T.lifetimeDisplay : row.end_date ? new Date(row.end_date).toLocaleDateString(timeLocale) : "—"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {row.plan_type === "lifetime" ? "—" : row.days_remaining !== null
                              ? <span style={{ fontWeight: 700, color: warning ? "#f59e0b" : row.days_remaining < 0 ? "#f87171" : "#10b981" }}>
                                  {row.days_remaining < 0 ? `${Math.abs(row.days_remaining)}` : `${row.days_remaining}`}
                                </span>
                              : "—"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => { setShowAssignModal(row); setAssignForm({ planId: "", startDate: new Date().toISOString().slice(0,10), endDate: "", autoRenew: false }); }}
                                style={{ fontSize: 10, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)", color: "#a855f7", cursor: "pointer" }}>
                                {T.assignPlanBtn}
                              </button>
                              {row.sub_id && (
                                <button onClick={() => { setShowExtendModal(row); setExtendForm({ months: "1", amount: String(row.price ?? ""), paymentMethod: "manual" }); }}
                                  style={{ fontSize: 10, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(0,245,255,0.3)", background: "rgba(0,245,255,0.08)", color: "#00f5ff", cursor: "pointer" }}>
                                  {T.extendBtn}
                                </button>
                              )}
                              <button onClick={async () => { setSelectedCompany(row); await loadCompanyPayments(row.id); }}
                                style={{ fontSize: 10, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer" }}>
                                {T.invoicesBtn}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PLANS TAB */}
        {tab === "plans" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                style={{ ...cardStyle(), borderColor: plan.type === "lifetime" ? "rgba(168,85,247,0.4)" : plan.type === "annual" ? "rgba(0,245,255,0.2)" : (isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0"), position: "relative", overflow: "hidden" }}>
                {plan.type === "lifetime" && (
                  <div style={{ position: "absolute", top: 12, [dir === "rtl" ? "left" : "right"]: 12, fontSize: 10, fontWeight: 700, background: "rgba(168,85,247,0.2)", color: "#a855f7", padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(168,85,247,0.3)" }}>
                    {T.bestValue}
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{plan.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{PLAN_LABELS[plan.type]}</div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: plan.type === "lifetime" ? "#a855f7" : plan.type === "annual" ? "#00f5ff" : C.textPrimary, marginBottom: 16 }}>
                  ${plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>/{plan.type === "lifetime" ? T.once : plan.type === "monthly" ? T.month : plan.type === "semi_annual" ? T.sixMonths : T.year}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {[
                    { icon: <Users size={12}/>, label: `${plan.max_employees === 999 ? T.unlimited : plan.max_employees} ${T.employeeUnit}` },
                    { icon: <Building2 size={12}/>, label: `${plan.max_branches === 99 ? T.unlimited : plan.max_branches} ${T.branchUnit}` },
                    { icon: <HardDrive size={12}/>, label: `${plan.storage_gb} GB ${T.storageUnit}` },
                  ].map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textSecondary }}>
                      <span style={{ color: "#10b981" }}>{f.icon}</span>{f.label}
                    </div>
                  ))}
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {plan.features.map((f: string, j: number) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.textMuted }}>
                        <CheckCircle size={11} style={{ color: "#10b981", flexShrink: 0 }} />{f}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, display: "inline-block",
                    background: plan.is_active ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
                    color: plan.is_active ? "#10b981" : "#f87171" }}>
                    {plan.is_active ? T.statusActive : T.statusDisabled}
                  </div>
                  <button onClick={() => openEditPlan(plan)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8,
                      border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)",
                      color: "#a855f7", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    <Edit2 size={12}/> {T.editBtn}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <div style={cardStyle()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.textPrimary }}>{T.allPaymentsRecord} ({payments.length} {T.invoiceUnit})</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ color: C.textMuted, fontSize: 11, background: isDark ? "transparent" : "#f8fafc" }}>
                    {[T.invoiceNumberCol, T.companyCol, T.planCol, T.amountCol, T.paymentMethodCol, T.statusCol, T.dateCol, ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: dir === "rtl" ? "right" : "left", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay, i) => (
                    <tr key={pay.id} style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}`, background: i % 2 === 0 ? (isDark ? "rgba(255,255,255,0.01)" : "#fafbfc") : "transparent" }}>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: 11, color: "#00f5ff" }}>{pay.invoice_number}</td>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: C.textPrimary }}>{pay.company_name}</td>
                      <td style={{ padding: "9px 12px", color: C.textSecondary }}>{pay.plan_name} <span style={{ fontSize: 10, color: C.textMuted }}>({PLAN_LABELS[pay.plan_type] ?? pay.plan_type})</span></td>
                      <td style={{ padding: "9px 12px", fontWeight: 700, color: "#10b981" }}>${pay.amount?.toFixed(2)}</td>
                      <td style={{ padding: "9px 12px", color: C.textMuted }}>{pay.payment_method}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                          background: pay.status === "paid" ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
                          color: pay.status === "paid" ? "#10b981" : "#f87171" }}>
                          {pay.status === "paid" ? T.paidStatus : pay.status}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: C.textMuted, whiteSpace: "nowrap" }}>
                        {new Date(pay.created_at).toLocaleDateString(timeLocale)}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <button onClick={() => setShowInvoice(pay)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.25)", background: "rgba(168,85,247,0.08)", color: "#a855f7", cursor: "pointer" }}>
                          <FileText size={10}/> {T.invoiceBtn}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Assign Plan Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => e.target === e.currentTarget && setShowAssignModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              dir={dir} style={{ background: C.modalBg, border: `1px solid ${C.modalBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, fontFamily: "'Tajawal', sans-serif", color: C.textPrimary }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: C.textPrimary }}>
                {T.assignPlanTitle} — {showAssignModal.company_name}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.planLabel}</label>
                  <select value={assignForm.planId} onChange={e => setAssignForm(f => ({ ...f, planId: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 13, colorScheme: isDark ? "dark" : "light" }}>
                    <option value="">{T.selectPlan}</option>
                    {plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price} ({PLAN_LABELS[p.type]})</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.startDate}</label>
                    <input type="date" value={assignForm.startDate} onChange={e => setAssignForm(f => ({ ...f, startDate: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 13, colorScheme: isDark ? "dark" : "light" }} />
                  </div>
                  {assignForm.planId && plans.find(p => p.id === parseInt(assignForm.planId))?.type !== "lifetime" && (
                    <div>
                      <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.endDate}</label>
                      <input type="date" value={assignForm.endDate} onChange={e => setAssignForm(f => ({ ...f, endDate: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 13, colorScheme: isDark ? "dark" : "light" }} />
                    </div>
                  )}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.textPrimary }}>
                  <input type="checkbox" checked={assignForm.autoRenew} onChange={e => setAssignForm(f => ({ ...f, autoRenew: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#a855f7" }} />
                  {T.autoRenew}
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={handleAssign} disabled={saving || !assignForm.planId}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? T.saving : T.activateSubscription}
                </button>
                <button onClick={() => setShowAssignModal(null)} style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.cardBg, color: C.textSecondary, cursor: "pointer" }}>
                  {T.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Extend Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showExtendModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => e.target === e.currentTarget && setShowExtendModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              dir={dir} style={{ background: C.modalBg, border: "1px solid rgba(0,245,255,0.2)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, fontFamily: "'Tajawal', sans-serif", color: C.textPrimary }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: C.textPrimary }}>
                {T.extendSubTitle} — {showExtendModal.company_name}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.monthsCount}</label>
                  <select value={extendForm.months} onChange={e => setExtendForm(f => ({ ...f, months: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, colorScheme: isDark ? "dark" : "light" }}>
                    {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} {T.month}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.amountPaid}</label>
                  <input type="number" value={extendForm.amount} onChange={e => setExtendForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder={String(showExtendModal.price ?? 0)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.paymentMethod}</label>
                  <select value={extendForm.paymentMethod} onChange={e => setExtendForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, colorScheme: isDark ? "dark" : "light" }}>
                    {["manual", "cash", "transfer", "card"].map(m => <option key={m} value={m}>{T.paymentMethods[m as keyof typeof T.paymentMethods] ?? m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={handleExtend} disabled={saving}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#00f5ff,#0891b2)", color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {saving ? T.extending : T.extendSubscription}
                </button>
                <button onClick={() => setShowExtendModal(null)} style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.cardBg, color: C.textSecondary, cursor: "pointer" }}>
                  {T.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invoice Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => e.target === e.currentTarget && setShowInvoice(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              dir={dir} style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 520, color: "#0f172a", fontFamily: "'Tajawal', sans-serif" }}
              id="invoice-print">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#1e40af" }}>{T.taxInvoice}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{T.attendanceSystem}</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{T.invoiceNumberCol}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", fontFamily: "monospace" }}>{showInvoice.invoice_number}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {new Date(showInvoice.created_at).toLocaleDateString(timeLocale)}
                  </div>
                </div>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{T.issuedTo}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{showInvoice.company_name}</div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                <thead>
                  <tr style={{ background: "#1e40af", color: "#fff" }}>
                    <th style={{ padding: "8px 12px", textAlign: dir === "rtl" ? "right" : "left", fontSize: 12 }}>{T.serviceCol}</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 12 }}>{T.typeCol}</th>
                    <th style={{ padding: "8px 12px", textAlign: dir === "rtl" ? "left" : "right", fontSize: 12 }}>{T.amountCol}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px", fontSize: 13, color: "#0f172a" }}>
                      {T.subscriptionOf} {showInvoice.plan_name}
                      {showInvoice.period_start && <div style={{ fontSize: 10, color: "#64748b" }}>{showInvoice.period_start} — {showInvoice.period_end ?? "∞"}</div>}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "#64748b" }}>{PLAN_LABELS[showInvoice.plan_type] ?? showInvoice.plan_type}</td>
                    <td style={{ padding: "12px", textAlign: dir === "rtl" ? "left" : "right", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>${showInvoice.amount?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
                <div style={{ background: "#1e40af", color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 18, fontWeight: 900 }}>
                  {T.total}: ${showInvoice.amount?.toFixed(2)} {showInvoice.currency}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => window.print()}
                  style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#1e40af", color: "#fff", fontWeight: 700, cursor: "pointer", justifyContent: "center" }}>
                  <Printer size={15} /> {T.printDownloadPdf}
                </button>
                <button onClick={() => setShowInvoice(null)} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", cursor: "pointer" }}>
                  {T.close}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Plan Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => e.target === e.currentTarget && setEditPlan(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              dir={dir} style={{ background: C.modalBg, border: `1px solid ${C.modalBorder}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, fontFamily: "'Tajawal', sans-serif", color: C.textPrimary }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Edit2 size={16} style={{ color: "#a855f7" }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{T.editPlanTitle} — {editPlan.name}</h3>
                  <p style={{ margin: 0, fontSize: 11, color: isDark ? "rgba(168,85,247,0.5)" : "#7c3aed" }}>{PLAN_LABELS[editPlan.type]}</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{T.planNameLabel}</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 14, boxSizing: "border-box" }} />
                </div>

                <div style={{ background: isDark ? "rgba(168,85,247,0.08)" : "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, padding: "14px 16px" }}>
                  <label style={{ fontSize: 12, color: "#a855f7", display: "block", marginBottom: 6, fontWeight: 700 }}>💰 {T.priceLabel}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: C.textMuted }}>$</span>
                    <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                      min={0} step={0.01}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)", color: "#a855f7", fontSize: 22, fontWeight: 800, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 5 }}>{T.maxEmployees}</label>
                    <input type="number" value={editForm.maxEmployees} onChange={e => setEditForm(f => ({ ...f, maxEmployees: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 5 }}>{T.maxBranches}</label>
                    <input type="number" value={editForm.maxBranches} onChange={e => setEditForm(f => ({ ...f, maxBranches: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 5 }}>{T.storageGbLabel}</label>
                    <input type="number" value={editForm.storageGb} onChange={e => setEditForm(f => ({ ...f, storageGb: e.target.value }))}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 5 }}>{T.featuresLabel}</label>
                  <textarea value={editForm.features} onChange={e => setEditForm(f => ({ ...f, features: e.target.value }))}
                    rows={4}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.inputBorder}`, background: C.inputBg, color: C.inputText, fontSize: 12, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
                <button onClick={handleEditPlan} disabled={saving}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "12px 0", borderRadius: 11, border: "none",
                    background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff",
                    fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                  <Save size={15}/> {saving ? T.saving : T.saveChanges}
                </button>
                <button onClick={() => setEditPlan(null)}
                  style={{ padding: "12px 20px", borderRadius: 11, border: `1px solid ${C.cardBorder}`, background: C.cardBg, color: C.textSecondary, cursor: "pointer" }}>
                  {T.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Company Payments Drawer ───────────────────────────────────── */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            onClick={e => e.target === e.currentTarget && setSelectedCompany(null)}>
            <motion.div initial={{ x: 100 }} animate={{ x: 0 }} exit={{ x: 100 }}
              dir={dir} style={{ background: C.modalBg, border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 600, maxHeight: "80vh", overflow: "auto", fontFamily: "'Tajawal', sans-serif", color: C.textPrimary }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{T.companyInvoices} {selectedCompany.company_name}</h3>
                <button onClick={() => setSelectedCompany(null)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
              {companyPayments.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: C.textMuted }}>{T.noInvoicesForCompany}</div>
              ) : companyPayments.map(pay => (
                <div key={pay.id} style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${C.cardBorder}`, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00f5ff" }}>{pay.invoice_number}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: C.textPrimary }}>{pay.plan_name}</div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{new Date(pay.created_at).toLocaleDateString(timeLocale)}</div>
                  </div>
                  <div style={{ textAlign: dir === "rtl" ? "left" : "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>${pay.amount?.toFixed(2)}</div>
                    <button onClick={() => { setSelectedCompany(null); setShowInvoice(pay); }}
                      style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.1)", color: "#a855f7", cursor: "pointer", marginTop: 4 }}>
                      <FileText size={10} style={{ display: "inline", marginInlineEnd: 3 }} />{T.viewBtn}
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Missing import for HardDrive in Plans tab
function HardDrive({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
}
