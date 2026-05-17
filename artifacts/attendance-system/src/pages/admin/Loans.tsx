import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, XCircle, Clock, Search, X, AlertCircle, Check, CreditCard } from "lucide-react";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const api = (p: string) => `${BASE}api/loans${p}`;

type Loan = {
  id: number;
  companyId: number;
  employeeId: number;
  employeeName?: string;
  amount: number;
  reason?: string;
  status: string;
  installmentsCount: number;
  installmentsPaid: number;
  monthlyDeduction: number;
  approvedBy?: number;
  createdAt: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: "قيد المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)" },
  approved: { label: "مقبول",        color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)" },
  rejected: { label: "مرفوض",        color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
};

function fmt(n: number) {
  return n.toLocaleString("ar-IQ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " د.ع";
}

// ─── Approve Modal ─────────────────────────────────────────────────────────────
function ApproveModal({ loan, onClose, onDone }: { loan: Loan; onClose: () => void; onDone: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [installments, setInstallments] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const monthly = installments > 0 ? Math.round((loan.amount / installments) * 100) / 100 : 0;

  const modalBg = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBd = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleC  = isDark ? "#fff" : "#0f172a";
  const subC    = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const labelC  = isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputC  = isDark ? "#fff" : "#0f172a";
  const cyanC   = isDark ? "#00f5ff" : "#0891b2";

  const handleApprove = async () => {
    setError("");
    if (installments < 1) { setError("عدد الأقساط يجب أن يكون على الأقل 1"); return; }
    setSaving(true);
    try {
      const r = await fetch(api(`/${loan.id}/approve`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ installmentsCount: installments }),
      });
      if (r.ok) { onDone(); onClose(); }
      else { const d = await r.json(); setError(d.message || "حدث خطأ"); }
    } finally { setSaving(false); }
  };

  const inpSt: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBd}`,
    color: inputC, fontSize: 13, outline: "none", boxSizing: "border-box",
    colorScheme: isDark ? "dark" : "light",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: modalBg, border: `1px solid ${modalBd}`, borderRadius: 20, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <div>
            <h2 style={{ color: titleC, fontWeight: 700, fontSize: 15, margin: 0 }}>قبول طلب السلفة</h2>
            <p style={{ color: subC, fontSize: 12, marginTop: 2 }}>{loan.employeeName} — {fmt(loan.amount)}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: subC, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12 }}>
              <AlertCircle size={13} />{error}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 11, color: labelC, marginBottom: 4 }}>عدد الأقساط الشهرية</label>
            <input type="number" min={1} max={120} value={installments}
              onChange={e => setInstallments(Math.max(1, parseInt(e.target.value) || 1))}
              style={inpSt} />
          </div>
          <div style={{ background: isDark ? "rgba(0,245,255,0.04)" : "rgba(8,145,178,0.04)", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "rgba(8,145,178,0.15)"}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: subC }}>المبلغ الإجمالي</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: titleC }}>{fmt(loan.amount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: subC }}>القسط الشهري</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: cyanC }}>{fmt(monthly)}</span>
            </div>
          </div>
          {loan.reason && (
            <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
              <p style={{ fontSize: 10, color: subC, margin: 0, marginBottom: 3 }}>سبب الطلب</p>
              <p style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.6)" : "#475569", margin: 0 }}>{loan.reason}</p>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${divider}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${inputBd}`, background: inputBg, color: isDark ? "rgba(255,255,255,0.4)" : "#475569", fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>إلغاء</button>
          <button onClick={handleApprove} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(16,185,129,0.8), rgba(5,150,105,0.7))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
            قبول الطلب
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminLoans() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrim  = isDark ? "#fff" : "#0f172a";
  const textMuted = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const textSec   = isDark ? "rgba(255,255,255,0.55)" : "#475569";
  const cardBg    = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBd    = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const inputBg   = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBd   = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputC    = isDark ? "#fff" : "#0f172a";
  const thC       = isDark ? "rgba(0,245,255,0.45)" : "#0891b2";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";
  const filterBg  = isDark ? "rgba(255,255,255,0.02)" : "#f8fafc";
  const filterBd  = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const hoverBg   = isDark ? "rgba(0,245,255,0.02)" : "rgba(8,145,178,0.02)";

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approveTarget, setApproveTarget] = useState<Loan | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500);
  };

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`${api("?")}${params}`, { credentials: "include" });
      const d = await r.json();
      setLoans(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const handleReject = async (id: number) => {
    if (!confirm("هل أنت متأكد من رفض هذا الطلب؟")) return;
    setRejectingId(id);
    try {
      const r = await fetch(api(`/${id}/reject`), { method: "PUT", credentials: "include" });
      if (r.ok) { showToast("تم رفض الطلب"); fetchLoans(); }
      else showToast("حدث خطأ", false);
    } finally { setRejectingId(null); }
  };

  const filtered = loans.filter(l =>
    !search || (l.employeeName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const selSt: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBd}`,
    color: inputC, fontSize: 12, outline: "none",
    colorScheme: isDark ? "dark" : "light",
  };

  const pendingCount = loans.filter(l => l.status === "pending").length;

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

      {approveTarget && (
        <ApproveModal loan={approveTarget} onClose={() => setApproveTarget(null)} onDone={() => { fetchLoans(); showToast("تم قبول طلب السلفة"); }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: textPrim, margin: 0 }}>إدارة السلف والقروض</h1>
          <p style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>مراجعة وإدارة طلبات السلف والتقسيط</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>
            <Clock size={13} />
            {pendingCount} طلب بانتظار المراجعة
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "إجمالي طلبات السلف", value: loans.length, color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.2)" },
          { label: "طلبات معتمدة",       value: loans.filter(l => l.status === "approved").length, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
          { label: "قيد المراجعة",       value: pendingCount, color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 14, border: `1px solid ${s.border}`, background: s.bg, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: textMuted, margin: 0, marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: filterBg, border: `1px solid ${filterBd}`, borderRadius: 14, padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: inputBg, border: `1px solid ${inputBd}`, flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ color: textMuted, flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم الموظف..."
            style={{ background: "transparent", color: inputC, fontSize: 12, outline: "none", border: "none", flex: 1 }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selSt}>
          <option value="">كل الحالات</option>
          <option value="pending">قيد المراجعة</option>
          <option value="approved">مقبول</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={28} style={{ color: cyanColor, animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: 10 }}>
            <CreditCard size={28} style={{ color: textMuted }} />
            <p style={{ color: textMuted, fontSize: 14 }}>لا توجد طلبات</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBd}` }}>
                  {["الموظف", "المبلغ", "السبب", "الحالة", "الأقساط", "القسط الشهري", "تاريخ الطلب", "إجراءات"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: thC, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(loan => {
                  const st = STATUS_MAP[loan.status] ?? STATUS_MAP.pending;
                  return (
                    <tr key={loan.id}
                      style={{ borderBottom: `1px solid ${cardBd}`, transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 14px", fontWeight: 600, color: textPrim }}>{loan.employeeName ?? "—"}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: cyanColor }}>{fmt(loan.amount)}</td>
                      <td style={{ padding: "11px 14px", color: textSec, maxWidth: 200 }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {loan.reason || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontSize: 11, fontWeight: 700 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", color: textSec }}>
                        {loan.status === "approved" ? (
                          <span>{loan.installmentsPaid} / {loan.installmentsCount}</span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: textSec }}>
                        {loan.status === "approved" ? fmt(loan.monthlyDeduction) : "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: textMuted, fontSize: 11 }}>
                        {new Date(loan.createdAt).toLocaleDateString("ar-IQ")}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {loan.status === "pending" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => setApproveTarget(loan)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.12)", color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                              <CheckCircle size={12} /> قبول
                            </button>
                            <button onClick={() => handleReject(loan.id)} disabled={rejectingId === loan.id}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.12)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: rejectingId === loan.id ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                              {rejectingId === loan.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <XCircle size={12} />}
                              رفض
                            </button>
                          </div>
                        )}
                        {loan.status === "approved" && (
                          <span style={{ fontSize: 11, color: "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle size={12} /> تم القبول
                          </span>
                        )}
                        {loan.status === "rejected" && (
                          <span style={{ fontSize: 11, color: "#f87171", display: "flex", alignItems: "center", gap: 4 }}>
                            <XCircle size={12} /> مرفوض
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
