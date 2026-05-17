import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Plus, X, Loader2, Star, User, ChevronDown } from "lucide-react";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const apiPerf = (p: string) => `${BASE}api/performance${p}`;
const apiEmp = () => `${BASE}api/employees`;

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const CRITERIA = [
  { key: "commitment",  label: "الالتزام" },
  { key: "performance", label: "الأداء" },
  { key: "cooperation", label: "التعاون" },
  { key: "achievement", label: "الإنجاز" },
  { key: "behavior",    label: "السلوك" },
] as const;

const SCORE_COLORS = ["", "#f87171", "#f97316", "#fbbf24", "#34d399", "#00f5ff"];
const SCORE_LABELS = ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];

type Review = {
  id: number; employee_id: number; employee_name: string; employee_job_title?: string;
  reviewer_name?: string; period_type: string; period_month?: number; period_year: number;
  commitment: number; performance: number; cooperation: number; achievement: number; behavior: number;
  overall_score: number; comments?: string; created_at: string;
};
type Employee = { id: number; fullName: string; jobTitle?: string; departmentName?: string; };

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${(value / 5) * 100}%` }} transition={{ duration: 0.6 }}
          style={{ height: "100%", borderRadius: 4, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 16 }}>{value}</span>
    </div>
  );
}

export default function AdminPerformance() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: 0, period_type: "monthly", period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(), commitment: 3, performance: 3,
    cooperation: 3, achievement: 3, behavior: 3, comments: "",
  });

  const fetchReviews = useCallback(async (empId?: number) => {
    setLoading(true);
    try {
      const url = empId ? apiPerf(`?employeeId=${empId}`) : apiPerf("");
      const res = await fetch(url, { credentials: "include" });
      setReviews(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch(apiEmp(), { credentials: "include" }).then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : d.employees || [])).catch(() => {});
    fetchReviews();
  }, [fetchReviews]);

  const openModal = (empId?: number) => {
    setForm(f => ({ ...f, employee_id: empId || (employees[0]?.id ?? 0), period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear(), commitment: 3, performance: 3, cooperation: 3, achievement: 3, behavior: 3, comments: "" }));
    setShowModal(true);
  };

  const save = async () => {
    if (!form.employee_id) return;
    setSaving(true);
    try {
      await fetch(apiPerf(""), { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      setShowModal(false);
      fetchReviews(selectedEmpId || undefined);
    } catch {}
    setSaving(false);
  };

  const filterReviews = selectedEmpId ? reviews.filter(r => r.employee_id === selectedEmpId) : reviews;

  const bg = isDark ? "#050d1f" : "#f8fafc";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const cardBd = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const inputSt: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1"}`, color: textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: isDark ? "dark" : "light", fontFamily: "'Tajawal',sans-serif" };

  const uniqueEmployees = Array.from(new Map(reviews.map(r => [r.employee_id, { id: r.employee_id, name: r.employee_name, title: r.employee_job_title }])).values());

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "'Tajawal',sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(168,85,247,0.8),rgba(59,130,246,0.8))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ color: textPrimary, fontWeight: 700, fontSize: 20, margin: 0 }}>تقييم الأداء</h1>
              <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>التقييمات الشهرية والسنوية للموظفين</p>
            </div>
          </div>
          <button onClick={() => openModal(selectedEmpId || undefined)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,rgba(168,85,247,0.8),rgba(59,130,246,0.8))", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            <Plus size={15} /> إضافة تقييم
          </button>
        </div>

        {/* Employee filter */}
        <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => { setSelectedEmpId(null); fetchReviews(); }}
            style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: selectedEmpId === null ? (isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.1)") : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"), color: selectedEmpId === null ? "#a855f7" : textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", fontWeight: selectedEmpId === null ? 600 : 400 }}>
            جميع الموظفين
          </button>
          {uniqueEmployees.map(emp => (
            <button key={emp.id} onClick={() => { setSelectedEmpId(emp.id); fetchReviews(emp.id); }}
              style={{ padding: "6px 14px", borderRadius: 20, border: "none", background: selectedEmpId === emp.id ? (isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.1)") : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"), color: selectedEmpId === emp.id ? "#a855f7" : textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", fontWeight: selectedEmpId === emp.id ? 600 : 400 }}>
              {emp.name}
            </button>
          ))}
        </div>

        {/* Reviews grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader2 size={28} color="#a855f7" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : filterReviews.length === 0 ? (
          <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <TrendingUp size={32} color={textSecondary} style={{ marginBottom: 8 }} />
            <p style={{ color: textSecondary, fontSize: 14 }}>لا توجد تقييمات بعد</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filterReviews.map(r => {
              const overall = r.overall_score || 0;
              const overallColor = SCORE_COLORS[Math.round(overall)] || "#fbbf24";
              return (
                <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 16 }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,rgba(168,85,247,0.6),rgba(59,130,246,0.6))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <User size={14} color="#fff" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: textPrimary, fontSize: 14 }}>{r.employee_name}</div>
                          {r.employee_job_title && <div style={{ fontSize: 10, color: textSecondary }}>{r.employee_job_title}</div>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "end" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: overallColor }}>{overall.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: textSecondary }}>{SCORE_LABELS[Math.round(overall)] || ""}</div>
                    </div>
                  </div>

                  {/* Period badge */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: isDark ? "rgba(168,85,247,0.1)" : "rgba(168,85,247,0.08)", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: "#a855f7", fontWeight: 600 }}>
                      {r.period_type === "monthly" && r.period_month ? `${MONTHS_AR[r.period_month - 1]} ${r.period_year}` : `سنوي ${r.period_year}`}
                    </span>
                  </div>

                  {/* Criteria bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {CRITERIA.map(c => (
                      <div key={c.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: textSecondary }}>{c.label}</span>
                        </div>
                        <ScoreBar value={r[c.key]} color={SCORE_COLORS[r[c.key]] || "#fbbf24"} />
                      </div>
                    ))}
                  </div>

                  {r.comments && (
                    <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 8, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", fontSize: 12, color: textSecondary }}>
                      {r.comments}
                    </div>
                  )}
                  {r.reviewer_name && (
                    <div style={{ marginTop: 8, fontSize: 10, color: textSecondary }}>المقيِّم: {r.reviewer_name}</div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: isDark ? "rgba(5,13,31,0.98)" : "#fff", border: `1px solid ${isDark ? "rgba(168,85,247,0.2)" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
                <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 15, margin: 0 }}>إضافة تقييم أداء</h2>
                <button onClick={() => setShowModal(false)} style={{ padding: 6, border: "none", background: "none", color: textSecondary, cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Employee select */}
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>الموظف *</label>
                  <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: parseInt(e.target.value) }))} style={inputSt}>
                    <option value={0}>اختر موظفاً</option>
                    {employees.map((e: any) => <option key={e.id || e.employeeId} value={e.id || e.employeeId}>{e.fullName || e.full_name}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>نوع التقييم</label>
                    <select value={form.period_type} onChange={e => setForm(f => ({ ...f, period_type: e.target.value }))} style={inputSt}>
                      <option value="monthly">شهري</option>
                      <option value="annual">سنوي</option>
                    </select>
                  </div>
                  {form.period_type === "monthly" && (
                    <div>
                      <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>الشهر</label>
                      <select value={form.period_month} onChange={e => setForm(f => ({ ...f, period_month: parseInt(e.target.value) }))} style={inputSt}>
                        {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>السنة</label>
                    <select value={form.period_year} onChange={e => setForm(f => ({ ...f, period_year: parseInt(e.target.value) }))} style={inputSt}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Sliders */}
                {CRITERIA.map(c => (
                  <div key={c.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: textSecondary }}>{c.label}</label>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={16} fill={n <= form[c.key] ? (SCORE_COLORS[form[c.key]] || "#fbbf24") : "none"} color={n <= form[c.key] ? (SCORE_COLORS[form[c.key]] || "#fbbf24") : textSecondary} style={{ cursor: "pointer" }} onClick={() => setForm(f => ({ ...f, [c.key]: n }))} />
                        ))}
                        <span style={{ fontSize: 11, fontWeight: 700, color: SCORE_COLORS[form[c.key]] || "#fbbf24", marginRight: 4 }}>{SCORE_LABELS[form[c.key]]}</span>
                      </div>
                    </div>
                    <input type="range" min={1} max={5} value={form[c.key]}
                      onChange={e => setForm(f => ({ ...f, [c.key]: parseInt(e.target.value) }))}
                      style={{ width: "100%", accentColor: SCORE_COLORS[form[c.key]] || "#fbbf24" }} />
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>ملاحظات</label>
                  <textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} rows={2} style={{ ...inputSt, resize: "none" }} placeholder="ملاحظات التقييم (اختياري)" />
                </div>

                {/* Overall preview */}
                <div style={{ padding: "10px 14px", borderRadius: 10, background: isDark ? "rgba(168,85,247,0.08)" : "rgba(168,85,247,0.06)", border: `1px solid ${isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.15)"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: textSecondary, fontSize: 13 }}>المتوسط الكلي</span>
                  <span style={{ fontWeight: 900, fontSize: 20, color: SCORE_COLORS[Math.round((form.commitment + form.performance + form.cooperation + form.achievement + form.behavior) / 5)] || "#fbbf24" }}>
                    {((form.commitment + form.performance + form.cooperation + form.achievement + form.behavior) / 5).toFixed(1)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowModal(false)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textSecondary, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>
                  <button onClick={save} disabled={saving || !form.employee_id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,rgba(168,85,247,0.8),rgba(59,130,246,0.8))", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                    حفظ التقييم
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
