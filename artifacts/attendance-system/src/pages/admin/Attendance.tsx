import { useState, useEffect, useCallback } from "react";
import { MapPin, Clock, Search, UserCheck, AlertTriangle, Plus, Edit2, Trash2, X, Check } from "lucide-react";

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
  { value: "present",  label: "حاضر",      color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)" },
  { value: "late",     label: "متأخر",      color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)" },
  { value: "absent",   label: "غائب",       color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
  { value: "on_leave", label: "إجازة",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)" },
  { value: "half_day", label: "نصف يوم",   color: "#a855f7", bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.2)" },
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
  const [records, setRecords] = useState<AttRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "present">("present");
  const [modal, setModal] = useState<"none" | "create" | "edit" | "delete">("none");
  const [selectedRecord, setSelectedRecord] = useState<AttRecord | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const BASE = import.meta.env.BASE_URL;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      const res = await fetch(`${BASE}api/attendance?${params}`, { credentials: "include" });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [BASE, filterDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetch(`${BASE}api/employees`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [BASE]);

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
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const errs = data.errors ? data.errors.join(" | ") : data.message;
        setError(errs);
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
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const errs = data.errors ? data.errors.join(" | ") : data.message;
        setError(errs);
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
        method: "DELETE",
        credentials: "include",
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
  const inputCls =
    "w-full bg-[#0f1623] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors";
  const labelCls = "block text-gray-400 text-xs mb-1.5 font-medium";

  const inputSt = { padding: "9px 12px", borderRadius: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 13, outline: "none", colorScheme: "dark" as const };

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 960, margin: "0 auto" }} dir="rtl">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>سجل الحضور والانصراف</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>إدارة ومتابعة حضور الموظفين</p>
        </div>
        <button onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.75), rgba(59,130,246,0.75))", color: "#020817", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={14} /> إضافة سجل حضور
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: UserCheck, label: "حاضر اليوم", val: presentCount, color: "#10b981", glow: "rgba(16,185,129,0.1)" },
          { icon: AlertTriangle, label: "متأخر", val: lateCount, color: "#f59e0b", glow: "rgba(245,158,11,0.1)" },
          { icon: Clock, label: "ساعات إجمالية", val: totalHours.toFixed(1), color: "#00f5ff", glow: "rgba(0,245,255,0.1)" },
        ].map(({ icon: Icon, label, val, color, glow }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${glow}`, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
            <Icon size={18} style={{ color, margin: "0 auto 6px" }} />
            <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>{val}</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={inputSt} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...inputSt, flex: 1, minWidth: 140 }}>
          <Search size={14} style={{ color: "rgba(0,245,255,0.4)", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم..."
            style={{ background: "transparent", color: "#fff", fontSize: 13, outline: "none", border: "none", flex: 1 }} />
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", borderRadius: 11, padding: 4, gap: 4 }}>
          {[{ k: "present", label: "الحاضرون" }, { k: "all", label: "الكل" }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: tab === t.k ? "rgba(0,245,255,0.15)" : "transparent", color: tab === t.k ? "#00f5ff" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,245,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid rgba(0,245,255,0.15)", borderTopColor: "#00f5ff", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>لا توجد سجلات</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
                  {["الموظف", "الحالة", "الدخول", "الخروج", "ساعات", "الموقع", "إجراءات"].map(h => (
                    <th key={h} style={{ textAlign: "right", padding: "11px 14px", color: "rgba(0,245,255,0.5)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = statusInfo(r.status);
                  const hasLoc = r.checkInLat && r.checkInLng;
                  return (
                    <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,245,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "10px 14px" }}>
                        <p style={{ color: "#fff", fontWeight: 600, fontSize: 13, margin: 0 }}>{r.employeeName}</p>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{r.departmentName || "—"}</p>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>{st.label}</span>
                        {(r.lateMinutes ?? 0) > 0 && <p style={{ color: "#f59e0b", fontSize: 10, marginTop: 3 }}>تأخير {r.lateMinutes}د</p>}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#10b981", fontWeight: 600 }}>{fmt12(r.checkInTime)}</td>
                      <td style={{ padding: "10px 14px", color: "#f87171", fontWeight: 600 }}>{fmt12(r.checkOutTime)}</td>
                      <td style={{ padding: "10px 14px", color: "#00f5ff" }}>{r.workingHours ? r.workingHours.toFixed(1) + "h" : "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        {hasLoc ? (
                          <a href={`https://maps.google.com/?q=${r.checkInLat},${r.checkInLng}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: 4, color: "#00f5ff", fontSize: 11, textDecoration: "none" }}>
                            <MapPin size={11} />
                            {r.checkInLat!.toFixed(3)}, {r.checkInLng!.toFixed(3)}
                          </a>
                        ) : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => openEdit(r)} title="تعديل"
                            style={{ padding: 6, borderRadius: 8, background: "rgba(0,245,255,0.07)", border: "1px solid rgba(0,245,255,0.15)", color: "#00f5ff", cursor: "pointer" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
          <div style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(0,245,255,0.12)", borderRadius: 20, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
              <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>
                {modal === "create" ? "إضافة سجل حضور جديد" : "تعديل سجل الحضور"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {modal === "create" && (
                <div>
                  <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>الموظف *</label>
                  <select value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", colorScheme: "dark" }}>
                    <option value="" style={{ background: "#050d1f" }}>— اختر الموظف —</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id} style={{ background: "#050d1f" }}>
                        {e.fullName}{e.departmentName ? ` (${e.departmentName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>التاريخ *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ label: "وقت الدخول *", key: "checkIn", type: "time" }, { label: "وقت الخروج", key: "checkOut", type: "time" }].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} value={form[f.key as keyof typeof form] as string}
                      onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", colorScheme: "dark", boxSizing: "border-box" as const }} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>الحالة</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", colorScheme: "dark" }}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} style={{ background: "#050d1f" }}>{o.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ label: "دقائق التأخير", key: "lateMinutes" }, { label: "دقائق الإضافي", key: "overtimeMinutes" }].map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{f.label}</label>
                    <input type="number" min="0" placeholder="0"
                      value={form[f.key as keyof typeof form] as string}
                      onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", colorScheme: "dark", boxSizing: "border-box" as const }} />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="ملاحظات اختيارية..."
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", resize: "none", colorScheme: "dark", boxSizing: "border-box" as const }} />
              </div>

              {error && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "9px 12px", color: "#f87171", fontSize: 12 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, padding: "0 18px 18px" }}>
              <button onClick={modal === "create" ? handleCreate : handleUpdate} disabled={saving}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(59,130,246,0.7))", color: "#020817", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
                {saving ? <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(2,8,23,0.3)", borderTopColor: "#020817", animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                {modal === "create" ? "حفظ السجل" : "حفظ التعديلات"}
              </button>
              <button onClick={closeModal}
                style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────────── */}
      {modal === "delete" && selectedRecord && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
          <div style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 20, width: "100%", maxWidth: 360, padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <Trash2 size={22} style={{ color: "#f87171" }} />
            </div>
            <div>
              <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>تأكيد الحذف</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                هل تريد حذف سجل حضور{" "}
                <span style={{ color: "#fff", fontWeight: 600 }}>{selectedRecord.employeeName}</span> بتاريخ{" "}
                <span style={{ color: "#fff", fontWeight: 600 }}>{selectedRecord.date}</span>؟
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
                style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
