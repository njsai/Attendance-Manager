import { useState, useEffect, useCallback } from "react";
import { getCachedStale, setCached, invalidate } from "@/lib/pageCache";
import { Check, X, Clock, Calendar, Loader2, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

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

const BASE = import.meta.env.BASE_URL;

export default function AdminLeaves() {
  const { t, dir, locale } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const _lc = getCachedStale<Leave[]>('leaves');
  const [leaves, setLeaves] = useState<Leave[]>(_lc ?? []);
  const [loading, setLoading] = useState(!_lc);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const LEAVE_TYPE_MAP: Record<string, string> = {
    annual:    t("annual"),
    sick:      t("sick"),
    emergency: t("emergency"),
    unpaid:    t("unpaid"),
    other:     t("other"),
  };

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:  { label: t("pendingStatus"), color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
    approved: { label: t("approved"),      color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)" },
    rejected: { label: t("rejected"),      color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
  };

  function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }); }
    catch { return d; }
  }

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLeaves = useCallback(async () => {
    const hasCached = !!getCachedStale('leaves');
    if (!hasCached) setLoading(true);
    try {
      const res = await fetch(`${BASE}api/leaves`, { credentials: "include" });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLeaves(arr);
      setCached('leaves', arr);
    } catch {
      showToast(t("failedLoadLeaves"), "error");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApprove = async (id: number) => {
    if (!confirm(t("confirmApproveLeave"))) return;
    setActionId(id);
    try {
      const res = await fetch(`${BASE}api/leaves/${id}/approve`, { method: "PUT", credentials: "include" });
      if (!res.ok) throw new Error();
      setLeaves(l => l.map(x => x.id === id ? { ...x, status: "approved" } : x));
      showToast(t("approveSuccess"), "success");
    } catch {
      showToast(t("failedAction"), "error");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt(t("rejectionReasonPrompt"));
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
      showToast(t("rejectSuccess"), "success");
    } catch {
      showToast(t("failedAction"), "error");
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
    all:      leaves.length,
    pending:  leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    rejected: leaves.filter(l => l.status === "rejected").length,
  };

  const textPrimary   = isDark ? "#fff"                   : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.3)"  : "rgba(15,23,42,0.4)";
  const textMuted     = isDark ? "rgba(255,255,255,0.3)"  : "rgba(15,23,42,0.35)";
  const cardBg        = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)";
  const cardBorder    = isDark ? "rgba(0,245,255,0.07)"   : "rgba(0,180,200,0.12)";
  const inputBg       = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const inputBorder   = isDark ? "rgba(0,245,255,0.1)"    : "rgba(0,180,200,0.2)";
  const inputColor    = isDark ? "#fff"                   : "#0f172a";
  const cyanColor     = isDark ? "#00f5ff"                : "#0891b2";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} dir={dir}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, background: toast.type === "success" ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)", color: "#fff", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          {toast.type === "success" ? <Check size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>{t("leaveRequests")}</h2>
          <p style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>{t("reviewLeaves")}</p>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", color: `${cyanColor}66` }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("searchByEmployee")}
            style={{ paddingInlineEnd: 34, paddingInlineStart: 14, paddingTop: 9, paddingBottom: 9, borderRadius: 11, background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor, fontSize: 13, outline: "none", width: 200, boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["pending", "all", "approved", "rejected"] as const).map(s => {
          const active = statusFilter === s;
          const sm = STATUS_MAP[s];
          const activeBg   = sm ? sm.bg     : isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.06)";
          const activeBorder = sm ? sm.border : isDark ? "rgba(0,245,255,0.3)" : "rgba(0,180,200,0.25)";
          const activeColor  = sm ? sm.color  : cyanColor;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: "7px 14px", borderRadius: 10, border: active ? `1px solid ${activeBorder}` : `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, background: active ? activeBg : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", color: active ? activeColor : textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              {s === "all" ? t("all") : (sm?.label ?? s)}
              <span style={{ marginInlineStart: 6, padding: "1px 6px", borderRadius: 20, fontSize: 10, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}>{counts[s]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(0,245,255,0.15)", borderTopColor: "#00f5ff", animation: "spin 1s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}` }}>
          <Calendar size={40} style={{ margin: "0 auto 12px", color: textSecondary }} />
          <p style={{ fontSize: 13, color: textMuted }}>{t("noLeaveRequests")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(leave => {
            const status = STATUS_MAP[leave.status] || { label: leave.status, color: textSecondary, bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" };
            return (
              <div key={leave.id} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "16px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>{leave.employeeName}</h3>
                      {leave.departmentName && (
                        <span style={{ fontSize: 10, color: textSecondary, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", padding: "2px 8px", borderRadius: 8 }}>{leave.departmentName}</span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, color: cyanColor, background: isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.06)", border: `1px solid ${isDark ? "rgba(0,245,255,0.15)" : "rgba(0,180,200,0.2)"}`, padding: "2px 8px", borderRadius: 20 }}>
                        {LEAVE_TYPE_MAP[leave.leaveType] || leave.leaveType}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, border: `1px solid ${status.border}`, padding: "2px 8px", borderRadius: 20 }}>{status.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: textSecondary }}>
                        <Calendar size={12} /> {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: `${cyanColor}aa` }}>
                        <Clock size={12} /> <span style={{ fontWeight: 700 }}>{leave.totalDays} {t("days")}</span>
                      </div>
                    </div>
                    {leave.reason && (
                      <p style={{ marginTop: 8, fontSize: 12, color: textSecondary, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 9, padding: "8px 12px", border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)" }}>
                        {leave.reason}
                      </p>
                    )}
                    {leave.status === "rejected" && leave.rejectionReason && (
                      <p style={{ marginTop: 8, fontSize: 12, color: "#f87171", background: "rgba(248,113,113,0.07)", borderRadius: 9, padding: "8px 12px", border: "1px solid rgba(248,113,113,0.2)" }}>
                        {t("rejectionReason")} {leave.rejectionReason}
                      </p>
                    )}
                  </div>
                  {leave.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleApprove(leave.id)} disabled={actionId === leave.id}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(16,185,129,0.85), rgba(5,150,105,0.85))", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: actionId === leave.id ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                        {actionId === leave.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {t("approveLeave")}
                      </button>
                      <button onClick={() => handleReject(leave.id)} disabled={actionId === leave.id}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: actionId === leave.id ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                        <X size={13} /> {t("rejectLeave")}
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
