import { useState, useEffect, useCallback } from "react";
import { Building2, Clock, Plus, Edit2, Trash2, X, Loader2, Check, Users } from "lucide-react";

interface Department { id: number; name: string; description: string | null; managerId: number | null; }
interface Shift { id: number; name: string; startTime: string; endTime: string; workDays: string; lateGraceMinutes: number; }

const BASE = import.meta.env.BASE_URL;

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 ${type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
      {type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {msg}
    </div>
  );
}

function DeptModal({ dept, onClose, onSave }: { dept: Partial<Department> | null; onClose: () => void; onSave: (d: Department) => void }) {
  const [form, setForm] = useState({ name: dept?.name || "", description: dept?.description || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-foreground">{dept?.id ? "تعديل القسم" : "إضافة قسم جديد"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{err}</div>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">اسم القسم *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">الوصف</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-muted/80">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShiftModal({ shift, onClose, onSave }: { shift: Partial<Shift> | null; onClose: () => void; onSave: (s: Shift) => void }) {
  const [form, setForm] = useState({
    name: shift?.name || "",
    startTime: shift?.startTime || "08:00",
    endTime: shift?.endTime || "17:00",
    workDays: shift?.workDays || "السبت,الأحد,الاثنين,الثلاثاء,الأربعاء",
    lateGraceMinutes: shift?.lateGraceMinutes ?? 15,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-foreground">{shift?.id ? "تعديل الشفت" : "إضافة شفت جديد"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{err}</div>}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">اسم الشفت *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">وقت البداية</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">وقت النهاية</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">أيام العمل</label>
            <input value={form.workDays} onChange={e => setForm(f => ({ ...f, workDays: e.target.value }))}
              placeholder="السبت,الأحد,الاثنين..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">سماح التأخير (دقائق)</label>
            <input type="number" min="0" max="60" value={form.lateGraceMinutes} onChange={e => setForm(f => ({ ...f, lateGraceMinutes: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-bold text-sm hover:bg-muted/80">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DepartmentsAndShifts() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deptModal, setDeptModal] = useState<Partial<Department> | null | false>(false);
  const [shiftModal, setShiftModal] = useState<Partial<Shift> | null | false>(false);

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
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {deptModal !== false && (
        <DeptModal
          dept={deptModal}
          onClose={() => setDeptModal(false)}
          onSave={saved => {
            setDepts(prev => deptModal?.id ? prev.map(d => d.id === saved.id ? saved : d) : [...prev, saved]);
            setDeptModal(false);
            showToast(deptModal?.id ? "تم تحديث القسم" : "تم إضافة القسم", "success");
          }}
        />
      )}

      {shiftModal !== false && (
        <ShiftModal
          shift={shiftModal}
          onClose={() => setShiftModal(false)}
          onSave={saved => {
            setShifts(prev => shiftModal?.id ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved]);
            setShiftModal(false);
            showToast(shiftModal?.id ? "تم تحديث الشفت" : "تم إضافة الشفت", "success");
          }}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              الأقسام
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">{depts.length}</span>
            </h2>
            <button
              onClick={() => setDeptModal({})}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة
            </button>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {depts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>لا توجد أقسام بعد</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {depts.map(dept => (
                  <li key={dept.id} className="px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div>
                      <div className="font-semibold text-foreground">{dept.name}</div>
                      {dept.description && <div className="text-sm text-muted-foreground mt-0.5">{dept.description}</div>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setDeptModal(dept)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteDept(dept.id)} className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-accent" />
              </div>
              شفتات العمل
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">{shifts.length}</span>
            </h2>
            <button
              onClick={() => setShiftModal({})}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة
            </button>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {shifts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>لا توجد شفتات بعد</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {shifts.map(shift => (
                  <li key={shift.id} className="px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground mb-1">{shift.name}</div>
                      <div className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg font-medium">
                          {fmt12(shift.startTime)} — {fmt12(shift.endTime)}
                        </span>
                        <span className="text-muted-foreground text-xs">سماح: {shift.lateGraceMinutes}د</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{shift.workDays}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                      <button onClick={() => setShiftModal(shift)} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteShift(shift.id)} className="p-2 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
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
