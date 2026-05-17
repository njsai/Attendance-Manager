import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, CheckCircle, XCircle, Clock, AlertCircle, X } from "lucide-react";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const api = (p: string) => `${BASE}api/loans${p}`;

type Loan = {
  id: number;
  amount: number;
  reason?: string;
  status: string;
  installmentsCount: number;
  installmentsPaid: number;
  monthlyDeduction: number;
  createdAt: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending:  { label: "قيد المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)",  icon: Clock },
  approved: { label: "مقبول",        color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)",  icon: CheckCircle },
  rejected: { label: "مرفوض",        color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", icon: XCircle },
};

function fmt(n: number) {
  return n.toLocaleString("ar-IQ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " د.ع";
}

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>الأقساط المدفوعة</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>{paid} / {total}</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #059669)", borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

export default function EmployeeLoans() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const bg        = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const border    = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const textPrim  = isDark ? "#fff" : "#0f172a";
  const textMuted = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd   = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputC    = isDark ? "#fff" : "#0f172a";
  const labelC    = isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [error, setError] = useState("");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500);
  };

  const fetchLoans = useCallback(async () => {
    try {
      const r = await fetch(api(""), { credentials: "include" });
      const d = await r.json();
      setLoans(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const handleSubmit = async () => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) { setError("الرجاء إدخال مبلغ صحيح"); return; }
    setSaving(true);
    try {
      const r = await fetch(api(""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: parseFloat(amount), reason }),
      });
      if (r.ok) {
        showToast("تم تقديم طلب السلفة بنجاح");
        setShowForm(false); setAmount(""); setReason("");
        fetchLoans();
      } else {
        const d = await r.json();
        setError(d.message || "حدث خطأ");
      }
    } finally { setSaving(false); }
  };

  const inpSt: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBd}`,
    color: inputC, fontSize: 13, outline: "none", boxSizing: "border-box",
    colorScheme: isDark ? "dark" : "light",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} dir="rtl">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, backdropFilter: "blur(12px)", background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${toast.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: toast.ok ? "#10b981" : "#f87171", fontFamily: "'Tajawal', sans-serif" }}>
            {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textPrim, margin: 0 }}>طلبات السلف</h1>
          <p style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>تقديم طلبات سلف وتتبع حالتها</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(""); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.7))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={15} /> طلب سلفة
        </button>
      </div>

      {/* Request form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ color: textPrim, fontWeight: 700, fontSize: 14, margin: 0 }}>طلب سلفة جديدة</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer" }}><X size={15} /></button>
            </div>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12 }}>
                <AlertCircle size={13} />{error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label style={{ display: "block", fontSize: 11, color: labelC, marginBottom: 4 }}>المبلغ المطلوب (د.ع) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="أدخل المبلغ" style={inpSt} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: labelC, marginBottom: 4 }}>سبب الطلب</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="اشرح سبب طلب السلفة..." style={{ ...inpSt, resize: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${inputBd}`, background: inputBg, color: isDark ? "rgba(255,255,255,0.4)" : "#475569", fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>إلغاء</button>
              <button onClick={handleSubmit} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(99,102,241,0.7))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
                تقديم الطلب
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loans list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <Loader2 size={28} style={{ color: cyanColor, animation: "spin 1s linear infinite" }} />
        </div>
      ) : loans.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: isDark ? "rgba(0,245,255,0.06)" : "rgba(8,145,178,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={24} style={{ color: cyanColor }} />
          </div>
          <p style={{ color: textMuted, fontSize: 14 }}>لا توجد طلبات سلف</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loans.map(loan => {
            const st = STATUS_MAP[loan.status] ?? STATUS_MAP.pending;
            const StIcon = st.icon;
            const remaining = Math.max(0, loan.installmentsCount - loan.installmentsPaid);
            const remainingAmount = Math.round(remaining * loan.monthlyDeduction * 100) / 100;
            return (
              <motion.div key={loan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: cyanColor }}>{fmt(loan.amount)}</div>
                    {loan.reason && <p style={{ fontSize: 12, color: textMuted, marginTop: 4, maxWidth: 300 }}>{loan.reason}</p>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontSize: 11, fontWeight: 700 }}>
                    <StIcon size={12} />
                    {st.label}
                  </div>
                </div>
                {loan.status === "approved" && (
                  <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 12 }}>
                    {[
                      { label: "القسط الشهري", value: fmt(loan.monthlyDeduction) },
                      { label: "الأقساط المتبقية", value: `${remaining} قسط` },
                      { label: "المبلغ المتبقي", value: fmt(remainingAmount) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", borderRadius: 10, padding: "8px 10px" }}>
                        <p style={{ fontSize: 10, color: textMuted, margin: 0 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: textPrim, marginTop: 2 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {loan.status === "approved" && <ProgressBar paid={loan.installmentsPaid} total={loan.installmentsCount} />}
                <p style={{ fontSize: 10, color: textMuted, marginTop: 8 }}>
                  {new Date(loan.createdAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
