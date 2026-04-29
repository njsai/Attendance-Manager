import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, Calendar, Loader2, Search } from "lucide-react";

interface Leave {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
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

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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

  const handleApprove = async (id: number) => {
    if (!confirm("تأكيد قبول طلب الإجازة؟")) return;
    setActionId(id);
    try {
      const res = await fetch(`${BASE}api/leaves/${id}/approve`, { method: "PUT", credentials: "include" });
      if (!res.ok) throw new Error();
      setLeaves(l => l.map(x => x.id === id ? { ...x, status: "approved" } : x));
      showToast("تم قبول الإجازة", "success");
    } catch {
      showToast("فشل تنفيذ العملية", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("سبب الرفض (اختياري):");
    if (reason === null) return;
    setActionId(id);
    try {
      const res = await fetch(`${BASE}api/leaves/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error();
      setLeaves(l => l.map(x => x.id === id ? { ...x, status: "rejected", rejectionReason: reason } : x));
      showToast("تم رفض الإجازة", "success");
    } catch {
      showToast("فشل تنفيذ العملية", "error");
    } finally {
      setActionId(null);
    }
  };

  const filtered = leaves.filter(l => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchSearch = !search || l.employeeName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    rejected: leaves.filter(l => l.status === "rejected").length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">طلبات الإجازة</h2>
          <p className="text-sm text-muted-foreground mt-0.5">مراجعة واعتماد إجازات الموظفين</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف..."
            className="pr-9 pl-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-52"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["pending", "all", "approved", "rejected"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${statusFilter === s ? "bg-primary text-primary-foreground shadow-md" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {s === "all" ? "الكل" : STATUS_MAP[s]?.label}
            <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${statusFilter === s ? "bg-white/20" : "bg-muted"}`}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">لا توجد طلبات إجازة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(leave => {
            const status = STATUS_MAP[leave.status] || { label: leave.status, cls: "bg-gray-100 text-gray-700" };
            return (
              <div key={leave.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">{leave.employeeName}</h3>
                      {leave.departmentName && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">{leave.departmentName}</span>
                      )}
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg">
                        {LEAVE_TYPE_MAP[leave.leaveType] || leave.leaveType}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${status.cls}`}>{status.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold text-foreground">{leave.totalDays} أيام</span>
                      </div>
                    </div>
                    {leave.reason && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border">
                        {leave.reason}
                      </p>
                    )}
                    {leave.status === "rejected" && leave.rejectionReason && (
                      <p className="mt-2 text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-200">
                        سبب الرفض: {leave.rejectionReason}
                      </p>
                    )}
                  </div>
                  {leave.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(leave.id)}
                        disabled={actionId === leave.id}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {actionId === leave.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        قبول
                      </button>
                      <button
                        onClick={() => handleReject(leave.id)}
                        disabled={actionId === leave.id}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl text-sm font-bold hover:bg-rose-200 transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
