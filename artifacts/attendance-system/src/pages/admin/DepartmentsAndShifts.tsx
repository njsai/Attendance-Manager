import { useState, useEffect, useCallback } from "react";
import { Building2, Clock, Plus, Edit2, Trash2, X, Loader2, Check, Users } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface Department { id: number; name: string; description: string | null; managerId: number | null; }
interface Shift { id: number; name: string; startTime: string; endTime: string; workDays: string; lateGraceMinutes: number; }

const BASE = import.meta.env.BASE_URL;

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 600, backdropFilter: "blur(12px)", background: type === "success" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, color: type === "success" ? "#10b981" : "#f87171" }}>
      {type === "success" ? <Check size={14} /> : <X size={14} />}
      {msg}
    </div>
  );
}

function DeptModal({ dept, onClose, onSave }: { dept: Partial<Department> | null; onClose: () => void; onSave: (d: Department) => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({ name: dept?.name || "", description: dept?.description || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const modalBg    = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBorder= isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider    = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor = isDark ? "#fff" : "#0f172a";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const inputBg    = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder= isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor = isDark ? "#fff" : "#0f172a";
  const closeBtnColor = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const cancelColor= isDark ? "rgba(255,255,255,0.4)" : "#475569";

  const nInp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBorder}`,
    color: inputColor, fontSize: 13, outline: "none",
    boxSizing: "border-box", colorScheme: isDark ? "dark" : "light",
    fontFamily: "'Tajawal', sans-serif",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const url = dept?.id ? `${BASE}api/departments/${dept.id}` : `${BASE}api/departments`;
      const method = dept?.id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل"); return; }
      onSave(data);
    } catch { setErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <div style={{ background: modalBg, border: `1px solid ${modalBorder}`, borderRadius: 20, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>{dept?.id ? "تعديل القسم" : "إضافة قسم جديد"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnColor, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12 }}>{err}</div>}
          <div>
            <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>اسم القسم *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={nInp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>الوصف</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} style={{ ...nInp, resize: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.85), rgba(59,130,246,0.85))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "9px 16px", borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: cancelColor, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShiftModal({ shift, onClose, onSave }: { shift: Partial<Shift> | null; onClose: () => void; onSave: (s: Shift) => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({
    name: shift?.name || "",
    startTime: shift?.startTime || "08:00",
    endTime: shift?.endTime || "17:00",
    workDays: shift?.workDays || "السبت,الأحد,الاثنين,الثلاثاء,الأربعاء",
    lateGraceMinutes: shift?.lateGraceMinutes ?? 15,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const modalBg    = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBorder= isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider    = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor = isDark ? "#fff" : "#0f172a";
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const inputBg    = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder= isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor = isDark ? "#fff" : "#0f172a";
  const closeBtnColor = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const cancelColor= isDark ? "rgba(255,255,255,0.4)" : "#475569";

  const nInp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${inputBorder}`,
    color: inputColor, fontSize: 13, outline: "none",
    boxSizing: "border-box", colorScheme: isDark ? "dark" : "light",
    fontFamily: "'Tajawal', sans-serif",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const url = shift?.id ? `${BASE}api/shifts/${shift.id}` : `${BASE}api/shifts`;
      const method = shift?.id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل"); return; }
      onSave(data);
    } catch { setErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <div style={{ background: modalBg, border: `1px solid ${modalBorder}`, borderRadius: 20, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}` }}>
          <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>{shift?.id ? "تعديل الشفت" : "إضافة شفت جديد"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnColor, cursor: "pointer" }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, color: "#f87171", fontSize: 12 }}>{err}</div>}
          <div>
            <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>اسم الشفت *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={nInp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>وقت البداية</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={nInp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>وقت النهاية</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={nInp} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>أيام العمل</label>
            <input value={form.workDays} onChange={e => setForm(f => ({ ...f, workDays: e.target.value }))}
              placeholder="السبت,الأحد,الاثنين..." style={nInp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>سماح التأخير (دقائق)</label>
            <input type="number" min="0" max="60" value={form.lateGraceMinutes}
              onChange={e => setForm(f => ({ ...f, lateGraceMinutes: parseInt(e.target.value) || 0 }))} style={nInp} />
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "9px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.85), rgba(59,130,246,0.85))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "9px 16px", borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: cancelColor, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DepartmentsAndShifts() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deptModal, setDeptModal] = useState<Partial<Department> | null | false>(false);
  const [shiftModal, setShiftModal] = useState<Partial<Shift> | null | false>(false);

  const textPrimary  = isDark ? "#fff" : "#0f172a";
  const textMuted    = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const textDesc     = isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const cardBg       = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBorder   = isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0";
  const cyanColor    = isDark ? "#00f5ff" : "#0891b2";
  const divider      = isDark ? "rgba(0,245,255,0.05)" : "#f1f5f9";
  const purpleDivider= isDark ? "rgba(168,85,247,0.07)" : "#f3f0ff";
  const hoverCyan    = isDark ? "rgba(0,245,255,0.02)" : "rgba(8,145,178,0.02)";
  const hoverPurple  = isDark ? "rgba(168,85,247,0.03)" : "rgba(168,85,247,0.02)";
  const cntBadgeBg   = isDark ? "rgba(0,245,255,0.06)" : "rgba(8,145,178,0.08)";
  const cntBadgeBorder= isDark ? "rgba(0,245,255,0.12)" : "rgba(8,145,178,0.2)";
  const cntBadgeColor= isDark ? "rgba(0,245,255,0.5)" : "#0891b2";
  const iconBoxCyan  = isDark ? "rgba(0,245,255,0.08)" : "rgba(8,145,178,0.08)";
  const iconBorderCyan= isDark ? "rgba(0,245,255,0.15)" : "rgba(8,145,178,0.2)";
  const addBtnCyanBg = isDark ? "rgba(0,245,255,0.08)" : "rgba(8,145,178,0.08)";
  const addBtnPurBg  = isDark ? "rgba(168,85,247,0.08)" : "rgba(168,85,247,0.08)";
  const editBtnCyanBg= isDark ? "rgba(0,245,255,0.07)" : "rgba(8,145,178,0.07)";
  const editBtnCyanBd= isDark ? "rgba(0,245,255,0.12)" : "rgba(8,145,178,0.2)";
  const spinColor    = isDark ? "#00f5ff" : "#0891b2";

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dr, sr] = await Promise.all([
        fetch(`${BASE}api/departments`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/shifts`, { credentials: "include" }).then(r => r.json()),
      ]);
      setDepts(Array.isArray(dr) ? dr : []);
      setShifts(Array.isArray(sr) ? sr : []);
    } catch { showToast("فشل تحميل البيانات", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const deleteDept = async (id: number) => {
    if (!confirm("حذف هذا القسم؟")) return;
    try {
      const res = await fetch(`${BASE}api/departments/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); showToast(d.message || "فشل الحذف", "error"); return; }
      setDepts(prev => prev.filter(d => d.id !== id));
      showToast("تم حذف القسم", "success");
    } catch { showToast("خطأ في الاتصال", "error"); }
  };

  const deleteShift = async (id: number) => {
    if (!confirm("حذف هذا الشفت؟")) return;
    try {
      const res = await fetch(`${BASE}api/shifts/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); showToast(d.message || "فشل الحذف", "error"); return; }
      setShifts(prev => prev.filter(s => s.id !== id));
      showToast("تم حذف الشفت", "success");
    } catch { showToast("خطأ في الاتصال", "error"); }
  };

  const fmt12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "م" : "ص";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(0,245,255,0.15)" : "#e2e8f0"}`, borderTopColor: spinColor, animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {deptModal !== false && (
        <DeptModal dept={deptModal} onClose={() => setDeptModal(false)}
          onSave={saved => {
            setDepts(prev => deptModal?.id ? prev.map(d => d.id === saved.id ? saved : d) : [...prev, saved]);
            setDeptModal(false);
            showToast(deptModal?.id ? "تم تحديث القسم" : "تم إضافة القسم", "success");
          }} />
      )}

      {shiftModal !== false && (
        <ShiftModal shift={shiftModal} onClose={() => setShiftModal(false)}
          onSave={saved => {
            setShifts(prev => shiftModal?.id ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved]);
            setShiftModal(false);
            showToast(shiftModal?.id ? "تم تحديث الشفت" : "تم إضافة الشفت", "success");
          }} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Departments */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBoxCyan, border: `1px solid ${iconBorderCyan}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={14} style={{ color: cyanColor }} />
              </div>
              الأقسام
              <span style={{ fontSize: 11, fontWeight: 600, color: cntBadgeColor, background: cntBadgeBg, border: `1px solid ${cntBadgeBorder}`, padding: "1px 8px", borderRadius: 20 }}>{depts.length}</span>
            </h2>
            <button onClick={() => setDeptModal({})}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, border: "none", background: addBtnCyanBg, color: cyanColor, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Plus size={13} /> إضافة
            </button>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
            {depts.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: textMuted }}>
                <Users size={36} style={{ margin: "0 auto 8px", opacity: 0.2 }} />
                <p style={{ fontSize: 12 }}>لا توجد أقسام بعد</p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {depts.map((dept, i) => (
                  <li key={dept.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < depts.length - 1 ? `1px solid ${divider}` : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverCyan)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div>
                      <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{dept.name}</div>
                      {dept.description && <div style={{ fontSize: 11, color: textDesc, marginTop: 2 }}>{dept.description}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setDeptModal(dept)}
                        style={{ padding: 6, borderRadius: 8, background: editBtnCyanBg, border: `1px solid ${editBtnCyanBd}`, color: cyanColor, cursor: "pointer" }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => deleteDept(dept.id)}
                        style={{ padding: 6, borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.12)", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Shifts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={14} style={{ color: "#a855f7" }} />
              </div>
              شفتات العمل
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(168,85,247,0.7)", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)", padding: "1px 8px", borderRadius: 20 }}>{shifts.length}</span>
            </h2>
            <button onClick={() => setShiftModal({})}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, border: "none", background: addBtnPurBg, color: "#a855f7", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Plus size={13} /> إضافة
            </button>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${isDark ? "rgba(168,85,247,0.1)" : "#ede9fe"}`, borderRadius: 16, overflow: "hidden" }}>
            {shifts.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: textMuted }}>
                <Clock size={36} style={{ margin: "0 auto 8px", opacity: 0.2 }} />
                <p style={{ fontSize: 12 }}>لا توجد شفتات بعد</p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {shifts.map((shift, i) => (
                  <li key={shift.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < shifts.length - 1 ? `1px solid ${purpleDivider}` : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = hoverPurple)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13, marginBottom: 5 }}>{shift.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                          {fmt12(shift.startTime)} — {fmt12(shift.endTime)}
                        </span>
                        <span style={{ fontSize: 10, color: textMuted }}>سماح: {shift.lateGraceMinutes}د</span>
                      </div>
                      <div style={{ fontSize: 10, color: textMuted, marginTop: 4 }}>{shift.workDays}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
                      <button onClick={() => setShiftModal(shift)}
                        style={{ padding: 6, borderRadius: 8, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)", color: "#a855f7", cursor: "pointer" }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => deleteShift(shift.id)}
                        style={{ padding: 6, borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.12)", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
