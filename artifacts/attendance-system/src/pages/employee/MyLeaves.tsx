import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
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
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:  { label: "قيد الانتظار", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  approved: { label: "مقبولة",       cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  rejected: { label: "مرفوضة",      cls: "bg-rose-100 text-rose-700 border border-rose-200" },
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

const BASE = import.meta.env.BASE_URL;

function AddLeaveModal({ onClose, onAdded }: { onClose: () => void; onAdded: (l: Leave) => void }) {
  const [form, setForm] = useState({ leaveType: "annual", startDate: "", endDate: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate).getTime() - new Date(form.startDate).getTime();
    return Math.max(1, Math.ceil(diff / 86400000) + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) { setErr("يرجى تحديد التواريخ"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setErr("تاريخ النهاية يجب أن يكون بعد البداية"); return; }
    setSaving(true); setErr("");
    try {
      const res = await fetch(`${BASE}api/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, totalDays: calcDays() }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل تقديم الطلب"); return; }
      onAdded(data);
      onClose();
    } catch { setErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg text-foreground">طلب إجازة جديدة</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{err}</div>}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">نوع الإجازة</label>
            <select value={form.leaveType} onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {Object.entries(LEAVE_TYPE_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">من تاريخ</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">إلى تاريخ</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {form.startDate && form.endDate && (
            <div className="text-sm text-center bg-primary/5 text-primary font-semibold px-4 py-2 rounded-lg border border-primary/20">
              إجمالي: {calcDays()} أيام
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">السبب (اختياري)</label>
            <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تقديم الطلب"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-muted/80">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/leaves`, { credentials: "include" });
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch {
      showToast("فشل تحميل الإجازات", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleDelete = async (id: number, status: string) => {
    if (status !== "pending") { showToast("لا يمكن حذف إجازة معالجة", "error"); return; }
    if (!confirm("حذف هذا الطلب؟")) return;
    try {
      const res = await fetch(`${BASE}api/leaves/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      setLeaves(l => l.filter(x => x.id !== id));
      showToast("تم حذف الطلب", "success");
    } catch {
      showToast("فشل حذف الطلب", "error");
    }
  };

  const approvedDays = leaves.filter(l => l.status === "approved").reduce((s, l) => s + l.totalDays, 0);
  const pendingCount = leaves.filter(l => l.status === "pending").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {showAdd && (
        <AddLeaveModal
          onClose={() => setShowAdd(false)}
          onAdded={leave => { setLeaves(l => [leave, ...l]); showToast("تم تقديم طلب الإجازة", "success"); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إجازاتي</h2>
          <p className="text-sm text-muted-foreground mt-0.5">تابع طلبات إجازاتك وحالتها</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          طلب إجازة
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <Calendar className="w-6 h-6 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-foreground">{approvedDays}</p>
          <p className="text-sm text-muted-foreground">أيام مُجازة</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm text-center">
          <Clock className="w-6 h-6 mx-auto mb-1 text-amber-500" />
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          <p className="text-sm text-muted-foreground">طلبات معلقة</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">لا توجد طلبات إجازة</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
            تقديم أول طلب إجازة
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3.5 text-sm font-semibold text-muted-foreground">النوع</th>
                  <th className="px-5 py-3.5 text-sm font-semibold text-muted-foreground">الفترة</th>
                  <th className="px-5 py-3.5 text-sm font-semibold text-muted-foreground">الأيام</th>
                  <th className="px-5 py-3.5 text-sm font-semibold text-muted-foreground">الحالة</th>
                  <th className="px-5 py-3.5 text-sm font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaves.map(leave => {
                  const status = STATUS_MAP[leave.status] || { label: leave.status, cls: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={leave.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground text-sm">
                        {LEAVE_TYPE_MAP[leave.leaveType] || leave.leaveType}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-foreground">{leave.totalDays}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {leave.status === "pending" && (
                          <button onClick={() => handleDelete(leave.id, leave.status)} className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
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
