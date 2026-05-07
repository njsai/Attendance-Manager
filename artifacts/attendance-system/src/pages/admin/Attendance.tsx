import { useState, useEffect, useCallback } from "react";
import { getCachedStale, setCached } from "@/lib/pageCache";
import { MapPin, Clock, Search, UserCheck, AlertTriangle, Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface AttRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  lateMinutes: number | null;
  workingHours: number | null;
  overtimeMinutes: number | null;
  status: string;
  notes: string | null;
}

interface Employee {
  id: number;
  fullName: string;
  departmentName: string | null;
}

const STATUS_OPTIONS = [
  { value: "present",  label: "حاضر",    color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)" },
  { value: "late",     label: "متأخر",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
  { value: "absent",   label: "غائب",     color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
  { value: "on_leave", label: "إجازة",    color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)" },
  { value: "half_day", label: "نصف يوم", color: "#a855f7", bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.2)" },
];

function statusInfo(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { label: s, color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.1)" };
}

function fmt12(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function toTimeInput(dt: string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const EMPTY_FORM = {
  employeeId: "",
  date: new Date().toISOString().split("T")[0],
  checkIn: "",
  checkOut: "",
  status: "present",
  lateMinutes: "",
  overtimeMinutes: "",
  notes: "",
};

export default function AdminAttendance() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const _today0 = new Date().toISOString().split("T")[0];
  const _ac = getCachedStale<{ records: AttRecord[]; employees: Employee[] }>(`att-${_today0}`);
  const [records, setRecords] = useState<AttRecord[]>(_ac?.records ?? []);
  const [employees, setEmployees] = useState<Employee[]>(_ac?.employees ?? []);
  const [loading, setLoading] = useState(!_ac);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "present">("present");
  const [modal, setModal] = useState<"none" | "create" | "edit" | "delete">("none");
  const [selectedRecord, setSelectedRecord] = useState<AttRecord | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const BASE = import.meta.env.BASE_URL;

  // ── Theme ──────────────────────────────────────────────────────────────────
  const textPrimary   = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.55)" : "#475569";
  const textMuted     = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const labelColor    = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const cardBg        = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBorder    = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const inputBg       = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder   = isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor    = isDark ? "#fff" : "#0f172a";
  const modalBg       = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBorder   = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const modalDivider  = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const cyanColor     = isDark ? "#00f5ff" : "#0891b2";
  const thColor       = isDark ? "rgba(0,245,255,0.5)" : "#0891b2";
  const tabActiveBg   = isDark ? "rgba(0,245,255,0.15)" : "rgba(8,145,178,0.1)";
  const tabActiveTxt  = isDark ? "#00f5ff" : "#0891b2";
  const tabInactiveTxt= isDark ? "rgba(255,255,255,0.4)" : "#94a3b8";
  const tabContainerBg= isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9";
  const hoverBg       = isDark ? "rgba(0,245,255,0.03)" : "rgba(8,145,178,0.02)";

  const inputSt: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 11,
    background: inputBg, border: `1px solid ${inputBorder}`,
    color: inputColor, fontSize: 13, outline: "none",
    colorScheme: isDark ? "dark" : "light",
  };
  const fieldSt: React.CSSProperties = {
    width: "100%", padding: "9px 11px", borderRadius: 9,
    background: inputBg, border: `1px solid ${inputBorder}`,
    color: inputColor, fontSize: 12, outline: "none",
    colorScheme: isDark ? "dark" : "light", boxSizing: "border-box",
  };

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    const cacheKey = `att-${filterDate}`;
    const hasCached = !!getCachedStale(cacheKey);
    if (!hasCached) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      const [attRes, empRes] = await Promise.all([
        fetch(`${BASE}api/attendance?${params}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}api/employees`, { credentials: "include" }).then(r => r.json()),
      ]);
      const recs = Array.isArray(attRes) ? attRes : [];
      const emps = Array.isArray(empRes) ? empRes : [];
      setRecords(recs);
      setEmployees(emps);
      setCached(cacheKey, { records: recs, employees: emps });
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [BASE, filterDate]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    const matchSearch = !search || r.employeeName?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || r.status === "present" || r.status === "late";
    return matchSearch && matchTab;
  });

  const presentCount = records.filter((r) => r.status === "present" || r.status === "late").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const totalHours = records.reduce((s, r) => s + (r.workingHours ?? 0), 0);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setForm({ ...EMPTY_FORM, date: filterDate });
    setError("");
    setModal("create");
  }

  function openEdit(r: AttRecord) {
    setSelectedRecord(r);
    setForm({
      employeeId: String(r.employeeId),
      date: r.date,
      checkIn: toTimeInput(r.checkInTime),
      checkOut: toTimeInput(r.checkOutTime),
      status: r.status,
      lateMinutes: r.lateMinutes != null ? String(r.lateMinutes) : "",
      overtimeMinutes: r.overtimeMinutes != null ? String(r.overtimeMinutes) : "",
      notes: r.notes ?? "",
    });
    setError("");
    setModal("edit");
  }

  function openDelete(r: AttRecord) {
    setSelectedRecord(r);
    setModal("delete");
  }

  function closeModal() {
    setModal("none");
    setSelectedRecord(null);
    setError("");
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async function handleCreate() {
    setError("");
    if (!form.employeeId) { setError("يجب اختيار الموظف"); return; }
    if (!form.date) { setError("يجب تحديد التاريخ"); return; }
    if (!form.checkIn) { setError("يجب تحديد وقت الدخول"); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        employeeId: parseInt(form.employeeId),
        date: form.date,
        checkIn: form.checkIn,
        status: form.status,
      };
      if (form.checkOut) body.checkOut = form.checkOut;
      if (form.lateMinutes) body.lateMinutes = parseInt(form.lateMinutes);
      if (form.overtimeMinutes) body.overtimeMinutes = parseInt(form.overtimeMinutes);
      if (form.notes) body.notes = form.notes;

      const res = await fetch(`${BASE}api/attendance`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.errors ? data.errors.join(" | ") : data.message);
        return;
      }
      closeModal();
      fetchRecords();
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async function handleUpdate() {
    if (!selectedRecord) return;
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        date: form.date,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || null,
        status: form.status,
      };
      if (form.lateMinutes !== "") body.lateMinutes = parseInt(form.lateMinutes) || 0;
      if (form.overtimeMinutes !== "") body.overtimeMinutes = parseInt(form.overtimeMinutes) || 0;
      body.notes = form.notes || null;

      const res = await fetch(`${BASE}api/attendance/${selectedRecord.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.errors ? data.errors.join(" | ") : data.message);
        return;
      }
      closeModal();
      fetchRecords();
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!selectedRecord) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE}api/attendance/${selectedRecord.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message);
        return;
      }
      closeModal();
      fetchRecords();
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 960, margin: "0 auto" }} dir="rtl">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>سجل الحضور والانصراف</h1>
          <p style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>إدارة ومتابعة حضور الموظفين</p>
        </div>
        <button onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.85), rgba(59,130,246,0.85))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={14} /> إضافة سجل حضور
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: UserCheck, label: "حاضر اليوم", val: presentCount, color: "#10b981", glow: "rgba(16,185,129,0.1)", border: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.25)" },
          { icon: AlertTriangle, label: "متأخر", val: lateCount, color: "#f59e0b", glow: "rgba(245,158,11,0.08)", border: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.25)" },
          { icon: Clock, label: "ساعات إجمالية", val: totalHours.toFixed(1), color: cyanColor, glow: isDark ? "rgba(0,245,255,0.07)" : "rgba(8,145,178,0.07)", border: isDark ? "rgba(0,245,255,0.12)" : "rgba(8,145,178,0.2)" },
        ].map(({ icon: Icon, label, val, color, glow, border }) => (
          <div key={label} style={{ background: glow, border: `1px solid ${border}`, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
            <Icon size={18} style={{ color, margin: "0 auto 6px" }} />
            <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>{val}</p>
            <p style={{ fontSize: 10, color: textMuted, marginTop: 3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={inputSt} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...inputSt, flex: 1, minWidth: 140 }}>
          <Search size={14} style={{ color: isDark ? "rgba(0,245,255,0.4)" : "#94a3b8", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم..."
            style={{ background: "transparent", color: inputColor, fontSize: 13, outline: "none", border: "none", flex: 1 }} />
        </div>
        <div style={{ display: "flex", background: tabContainerBg, border: `1px solid ${inputBorder}`, borderRadius: 11, padding: 4, gap: 4 }}>
          {[{ k: "present", label: "الحاضرون" }, { k: "all", label: "الكل" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: tab === t.k ? tabActiveBg : "transparent", color: tab === t.k ? tabActiveTxt : tabInactiveTxt, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(0,245,255,0.15)" : "#e2e8f0"}`, borderTopColor: cyanColor, animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: textMuted }}>لا توجد سجلات</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? "transparent" : "#f8fafc" }}>
                  {["الموظف", "الحالة", "الدخول", "الخروج", "ساعات", "الموقع", "إجراءات"].map(h => (
                    <th key={h} style={{ textAlign: "right", padding: "11px 14px", color: thColor, fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = statusInfo(r.status);
                  const hasLoc = r.checkInLat && r.checkInLng;
                  return (
                    <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "10px 14px" }}>
                        <p style={{ color: textPrimary, fontWeight: 600, fontSize: 13, margin: 0 }}>{r.employeeName}</p>
                        <p style={{ color: textMuted, fontSize: 11 }}>{r.departmentName || "—"}</p>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>
                        {(r.lateMinutes ?? 0) > 0 && <p style={{ color: "#f59e0b", fontSize: 10, marginTop: 3 }}>تأخير {r.lateMinutes}د</p>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#10b981", fontWeight: 600 }}>{fmt12(r.checkInTime)}</td>
                      <td style={{ padding: "10px 14px", color: "#f87171", fontWeight: 600 }}>{fmt12(r.checkOutTime)}</td>
                      <td style={{ padding: "10px 14px", color: cyanColor }}>{r.workingHours ? r.workingHours.toFixed(1) + "h" : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        {hasLoc ? (
                          <a href={`https://maps.google.com/?q=${r.checkInLat},${r.checkInLng}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 4, color: cyanColor, fontSize: 11, textDecoration: "none" }}>
                            <MapPin size={11} />
                            {r.checkInLat!.toFixed(3)}, {r.checkInLng!.toFixed(3)}
                          </a>
                        ) : <span style={{ color: textMuted, fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => openEdit(r)} title="تعديل"
                            style={{ padding: 6, borderRadius: 8, background: isDark ? "rgba(0,245,255,0.07)" : "rgba(8,145,178,0.07)", border: `1px solid ${isDark ? "rgba(0,245,255,0.15)" : "rgba(8,145,178,0.2)"}`, color: cyanColor, cursor: "pointer" }}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => openDelete(r)} title="حذف"
                            style={{ padding: 6, borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171", cursor: "pointer" }}>
                            <Trash2 size={13} />
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

      {/* ── CREATE / EDIT MODAL ────────────────────────────────────────────────── */}
      {(modal === "create" || modal === "edit") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
          <div style={{ background: modalBg, border: `1px solid ${modalBorder}`, borderRadius: 20, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${modalDivider}` }}>
              <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, margin: 0 }}>
                {modal === "create" ? "إضافة سجل حضور جديد" : "تعديل سجل الحضور"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: textMuted, cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {modal === "create" && (
                <div>
                  <label style={{ display: "block", fontSize: 10, color: labelColor, marginBottom: 4 }}>الموظف *</label>
                  <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                    style={{ ...fieldSt, colorScheme: isDark ? "dark" : "light" }}>
                    <option value="">— اختر الموظف —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}{e.departmentName ? ` (${e.departmentName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 10, color: labelColor, marginBottom: 4 }}>التاريخ *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={fieldSt} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ label: "وقت الدخول *", key: "checkIn", type: "time" }, { label: "وقت الخروج", key: "checkOut", type: "time" }].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: 10, color: labelColor, marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} value={form[f.key as keyof typeof form] as string}
                      onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                      style={fieldSt} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, color: labelColor, marginBottom: 4 }}>الحالة</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={fieldSt}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ label: "دقائق التأخير", key: "lateMinutes" }, { label: "دقائق الإضافي", key: "overtimeMinutes" }].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: 10, color: labelColor, marginBottom: 4 }}>{f.label}</label>
                    <input type="number" min="0" placeholder="0"
                      value={form[f.key as keyof typeof form] as string}
                      onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                      style={fieldSt} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, color: labelColor, marginBottom: 4 }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="ملاحظات اختيارية..."
                  style={{ ...fieldSt, resize: "none" }} />
              </div>

              {error && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "9px 12px", color: "#f87171", fontSize: 12 }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, padding: "0 18px 18px" }}>
              <button onClick={modal === "create" ? handleCreate : handleUpdate} disabled={saving}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.85), rgba(59,130,246,0.85))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                {saving ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                {modal === "create" ? "حفظ السجل" : "حفظ التعديلات"}
              </button>
              <button onClick={closeModal}
                style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${inputBorder}`, background: inputBg, color: textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────────── */}
      {modal === "delete" && selectedRecord && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
          <div style={{ background: modalBg, border: "1px solid rgba(248,113,113,0.2)", borderRadius: 20, width: "100%", maxWidth: 360, padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <Trash2 size={22} style={{ color: "#f87171" }} />
            </div>
            <div>
              <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>تأكيد الحذف</h3>
              <p style={{ color: textSecondary, fontSize: 13 }}>
                هل تريد حذف سجل حضور{" "}
                <span style={{ color: textPrimary, fontWeight: 600 }}>{selectedRecord.employeeName}</span> بتاريخ{" "}
                <span style={{ color: textPrimary, fontWeight: 600 }}>{selectedRecord.date}</span>؟
              </p>
              <p style={{ color: "#f87171", fontSize: 11, marginTop: 8 }}>هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
            {error && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "9px 12px", color: "#f87171", fontSize: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleDelete} disabled={saving}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 11, border: "none", background: "rgba(248,113,113,0.8)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                {saving ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                حذف السجل
              </button>
              <button onClick={closeModal}
                style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${inputBorder}`, background: inputBg, color: textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
