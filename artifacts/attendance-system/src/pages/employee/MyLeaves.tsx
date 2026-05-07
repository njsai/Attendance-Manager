import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, X, Calendar, Clock, Check, Trash2 } from "lucide-react";

interface Leave {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
}

const LEAVE_TYPE_MAP: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "اضطرارية", unpaid: "بدون راتب",
};
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "قيد الانتظار", color: "#f59e0b",  bg: "rgba(245,158,11,0.1)" },
  approved: { label: "مقبولة",       color: "#10b981",  bg: "rgba(16,185,129,0.1)" },
  rejected: { label: "مرفوضة",      color: "#f87171",  bg: "rgba(248,113,113,0.1)" },
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

const BASE = import.meta.env.BASE_URL;
const inp = { width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" as const, colorScheme: "dark" as const };
const lbl = { display: "block", fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 5 };

function AddLeaveModal({ onClose, onAdded }: { onClose: () => void; onAdded: (l: Leave) => void }) {
  const [form, setForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    return Math.max(1, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) { setErr("يرجى تحديد التواريخ"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setErr("تاريخ النهاية يجب أن يكون بعد البداية"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${BASE}api/leaves`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...form, totalDays: calcDays() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل تقديم الطلب"); return; }
      onAdded(data); onClose();
    } catch { setErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <div style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(0,245,255,0.12)", borderRadius: 20, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>طلب إجازة جديدة</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "9px 12px", color: "#f87171", fontSize: 12 }}>{err}</div>}

          <div>
            <label style={lbl}>نوع الإجازة</label>
            <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))} style={inp}>
              {Object.entries(LEAVE_TYPE_MAP).map(([v, l]) => <option key={v} value={v} style={{ background: "#050d1f" }}>{l}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={lbl}>من تاريخ</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required style={inp} />
            </div>
            <div>
              <label style={lbl}>إلى تاريخ</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required style={inp} />
            </div>
          </div>

          {form.startDate && form.endDate && (
            <div style={{ textAlign: "center", background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#00f5ff", fontSize: 13, fontWeight: 700 }}>
              إجمالي: {calcDays()} أيام
            </div>
          )}

          <div>
            <label style={lbl}>السبب (اختياري)</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={3} style={{ ...inp, resize: "none" }} />
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(59,130,246,0.7))", color: "#020817", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> : "تقديم الطلب"}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/leaves`, { credentials: "include" });
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch { showToast("فشل تحميل الإجازات", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleDelete = async (id: number, status: string) => {
    if (status !== "pending") { showToast("لا يمكن حذف إجازة معالجة", false); return; }
    if (!confirm("حذف هذا الطلب؟")) return;
    try {
      const res = await fetch(`${BASE}api/leaves/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setLeaves(l => l.filter(x => x.id !== id));
      showToast("تم حذف الطلب");
    } catch { showToast("فشل حذف الطلب", false); }
  };

  const approvedDays = leaves.filter(l => l.status === "approved").reduce((s, l) => s + l.totalDays, 0);
  const pendingCount = leaves.filter(l => l.status === "pending").length;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }} dir="rtl">

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "10px 20px", borderRadius: 12, background: toast.ok ? "rgba(16,185,129,0.9)" : "rgba(248,113,113,0.9)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(10px)" }}>
          {toast.ok ? <Check size={15} /> : <X size={15} />} {toast.msg}
        </div>
      )}

      {showAdd && (
        <AddLeaveModal
          onClose={() => setShowAdd(false)}
          onAdded={leave => { setLeaves(l => [leave, ...l]); showToast("تم تقديم طلب الإجازة"); }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 20, margin: 0 }}>إجازاتي</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginTop: 3 }}>تابع طلبات إجازاتك وحالتها</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 12, border: "1px solid rgba(0,245,255,0.3)", background: "rgba(0,245,255,0.07)", color: "#00f5ff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={15} /> طلب إجازة
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: <Calendar size={20} />, val: approvedDays, label: "أيام مُجازة", color: "#10b981" },
          { icon: <Clock size={20} />, val: pendingCount, label: "طلبات معلقة", color: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 16, padding: "18px 20px", textAlign: "center" }}>
            <span style={{ color: s.color }}>{s.icon}</span>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: 26, margin: "6px 0 2px" }}>{s.val}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 size={32} style={{ color: "#00f5ff", animation: "spin 1s linear infinite" }} />
        </div>
      ) : leaves.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 18 }}>
          <Calendar size={44} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
          <p style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 14 }}>لا توجد طلبات إجازة</p>
          <button onClick={() => setShowAdd(true)}
            style={{ marginTop: 10, background: "none", border: "none", color: "#00f5ff", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "underline", fontFamily: "'Tajawal', sans-serif" }}>
            تقديم أول طلب إجازة
          </button>
        </div>
      ) : (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 18, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
              <thead>
                <tr style={{ background: "rgba(0,245,255,0.03)", borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
                  {["النوع", "الفترة", "الأيام", "الحالة", ""].map((h, i) => (
                    <th key={i} style={{ padding: "11px 16px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave, idx) => {
                  const st = STATUS_MAP[leave.status] || { label: leave.status, color: "#fff", bg: "rgba(255,255,255,0.05)" };
                  return (
                    <tr key={leave.id} style={{ borderBottom: idx < leaves.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
                        {LEAVE_TYPE_MAP[leave.leaveType] || leave.leaveType}
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                        {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 700 }}>{leave.totalDays}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: st.color, background: st.bg }}>{st.label}</span>
                        {leave.rejectionReason && (
                          <p style={{ color: "#f87171", fontSize: 10, marginTop: 3 }}>{leave.rejectionReason}</p>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {leave.status === "pending" && (
                          <button onClick={() => handleDelete(leave.id, leave.status)}
                            style={{ padding: 6, borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "none", color: "#f87171", cursor: "pointer" }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
