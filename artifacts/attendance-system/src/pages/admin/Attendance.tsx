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
  { value: "present", label: "حاضر", cls: "bg-green-900/30 text-green-400" },
  { value: "late", label: "متأخر", cls: "bg-yellow-900/30 text-yellow-400" },
  { value: "absent", label: "غائب", cls: "bg-red-900/30 text-red-400" },
  { value: "on_leave", label: "إجازة", cls: "bg-blue-900/30 text-blue-400" },
  { value: "half_day", label: "نصف يوم", cls: "bg-purple-900/30 text-purple-400" },
];

function statusInfo(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { label: s, cls: "bg-gray-700 text-gray-400" };
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

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">سجل الحضور والانصراف</h1>
          <p className="text-gray-400 text-sm">إدارة ومتابعة حضور الموظفين</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          إضافة سجل حضور
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
          <UserCheck size={18} className="text-green-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{presentCount}</p>
          <p className="text-xs text-gray-400">حاضر اليوم</p>
        </div>
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
          <AlertTriangle size={18} className="text-yellow-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{lateCount}</p>
          <p className="text-xs text-gray-400">متأخر</p>
        </div>
        <div className="bg-[#1a2234] border border-white/10 rounded-2xl p-3 text-center">
          <Clock size={18} className="text-blue-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-white">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-gray-400">ساعات إجمالية</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
        />
        <div className="flex items-center gap-2 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[140px]">
          <Search size={16} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="bg-transparent text-white text-sm outline-none flex-1"
          />
        </div>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {[
            { k: "present", label: "الحاضرون" },
            { k: "all", label: "الكل" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.k ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">لا توجد سجلات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الموظف</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الحالة</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الدخول</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الخروج</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">ساعات</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">الموقع</th>
                  <th className="text-right text-gray-400 font-medium px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((r) => {
                  const st = statusInfo(r.status);
                  const hasLoc = r.checkInLat && r.checkInLng;
                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{r.employeeName}</p>
                        <p className="text-gray-400 text-xs">{r.departmentName || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                        {(r.lateMinutes ?? 0) > 0 && (
                          <p className="text-yellow-400 text-xs mt-1">تأخير {r.lateMinutes}د</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-green-400 font-medium">{fmt12(r.checkInTime)}</td>
                      <td className="px-4 py-3 text-red-400 font-medium">{fmt12(r.checkOutTime)}</td>
                      <td className="px-4 py-3 text-blue-400">
                        {r.workingHours ? r.workingHours.toFixed(1) + "h" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {hasLoc ? (
                          <a
                            href={`https://maps.google.com/?q=${r.checkInLat},${r.checkInLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
                          >
                            <MapPin size={12} />
                            <span>
                              {r.checkInLat!.toFixed(3)}, {r.checkInLng!.toFixed(3)}
                            </span>
                          </a>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="تعديل"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => openDelete(r)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={14} />
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a2234] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-white font-bold text-base">
                {modal === "create" ? "إضافة سجل حضور جديد" : "تعديل سجل الحضور"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Employee (create only) */}
              {modal === "create" && (
                <div>
                  <label className={labelCls}>الموظف *</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— اختر الموظف —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                        {e.departmentName ? ` (${e.departmentName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date */}
              <div>
                <label className={labelCls}>التاريخ *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>وقت الدخول *</label>
                  <input
                    type="time"
                    value={form.checkIn}
                    onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>وقت الخروج</label>
                  <input
                    type="time"
                    value={form.checkOut}
                    onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={inputCls}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Late / Overtime */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>دقائق التأخير</label>
                  <input
                    type="number"
                    min="0"
                    value={form.lateMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, lateMinutes: e.target.value }))}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelCls}>دقائق الإضافي</label>
                  <input
                    type="number"
                    min="0"
                    value={form.overtimeMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, overtimeMinutes: e.target.value }))}
                    className={inputCls}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={inputCls + " resize-none"}
                  placeholder="ملاحظات اختيارية..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={modal === "create" ? handleCreate : handleUpdate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {modal === "create" ? "حفظ السجل" : "حفظ التعديلات"}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ───────────────────────────────────────────────── */}
      {modal === "delete" && selectedRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a2234] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">تأكيد الحذف</h3>
              <p className="text-gray-400 text-sm">
                هل تريد حذف سجل حضور{" "}
                <span className="text-white font-medium">{selectedRecord.employeeName}</span> بتاريخ{" "}
                <span className="text-white font-medium">{selectedRecord.date}</span>؟
              </p>
              <p className="text-red-400 text-xs mt-2">هذا الإجراء لا يمكن التراجع عنه</p>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                حذف السجل
              </button>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
