import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X, User, Mail, Phone, MapPin, Briefcase, Building, Clock, DollarSign, Shield } from "lucide-react";

interface Employee {
  id: number; username: string; fullName: string; email: string | null; phone: string | null;
  address: string | null; jobTitle: string | null; role: string; departmentId: number | null;
  shiftId: number | null; branchId: number | null; salary: number | null; isActive: boolean;
  departmentName: string | null; shiftName: string | null; branchName: string | null;
  shiftStart: string | null; shiftEnd: string | null; createdAt: string;
}
interface Department { id: number; name: string; }
interface Shift { id: number; name: string; startTime: string; endTime: string; }
interface Branch { id: number; name: string; }

function fmt12(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "م" : "ص";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function EmployeeModal({ emp, depts, shifts, branches, onClose, onSave }: {
  emp: Partial<Employee> | null; depts: Department[]; shifts: Shift[]; branches: Branch[];
  onClose: () => void; onSave: (data: any) => void;
}) {
  const [form, setForm] = useState<any>({
    username: emp?.username || "", password: "", fullName: emp?.fullName || "",
    email: emp?.email || "", phone: emp?.phone || "", address: emp?.address || "",
    jobTitle: emp?.jobTitle || "", role: emp?.role || "employee",
    departmentId: emp?.departmentId || "", shiftId: emp?.shiftId || "",
    branchId: emp?.branchId || "", salary: emp?.salary || "",
    isActive: emp?.isActive !== undefined ? emp.isActive : true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const BASE = import.meta.env.BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      if (payload.departmentId === "") payload.departmentId = null;
      if (payload.shiftId === "") payload.shiftId = null;
      if (payload.branchId === "") payload.branchId = null;
      if (payload.salary === "") payload.salary = null;
      else if (payload.salary) payload.salary = parseFloat(payload.salary);
      const url = emp?.id ? `${BASE}api/employees/${emp.id}` : `${BASE}api/employees`;
      const method = emp?.id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل"); return; }
      onSave(data);
    } catch { setErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-bold">{emp?.id ? "تعديل موظف" : "إضافة موظف جديد"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">الاسم الكامل *</label>
              <input value={form.fullName} onChange={e => set("fullName", e.target.value)} required
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">اسم المستخدم *</label>
              <input value={form.username} onChange={e => set("username", e.target.value)} required disabled={!!emp?.id}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none disabled:opacity-50" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">{emp?.id ? "كلمة مرور جديدة" : "كلمة المرور *"}</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)} required={!emp?.id}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">الدور</label>
              <select value={form.role} onChange={e => set("role", e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                <option value="employee">موظف</option>
                <option value="manager">مدير</option>
                <option value="admin">إدارة عليا</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">رقم الهاتف</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-gray-400 text-xs mb-1 block">العنوان</label>
              <input value={form.address} onChange={e => set("address", e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">المسمى الوظيفي</label>
              <input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">الراتب</label>
              <input type="number" value={form.salary} onChange={e => set("salary", e.target.value)}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">القسم</label>
              <select value={form.departmentId} onChange={e => set("departmentId", e.target.value ? parseInt(e.target.value) : "")}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                <option value="">-- بدون قسم --</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">الفرع</label>
              <select value={form.branchId} onChange={e => set("branchId", e.target.value ? parseInt(e.target.value) : "")}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                <option value="">-- بدون فرع --</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">الوردية</label>
              <select value={form.shiftId} onChange={e => set("shiftId", e.target.value ? parseInt(e.target.value) : "")}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none">
                <option value="">-- بدون وردية --</option>
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({fmt12(s.startTime)} - {fmt12(s.endTime)})</option>)}
              </select>
            </div>
            {emp?.id && (
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-xs">الحالة</label>
                <button type="button" onClick={() => set("isActive", !form.isActive)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${form.isActive ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                  {form.isActive ? "نشط" : "موقوف"}
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl transition-all disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl transition-all">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeCard({ emp, onEdit, onDelete, onToggle }: { emp: Employee; onEdit: () => void; onDelete: () => void; onToggle: () => void; }) {
  const [open, setOpen] = useState(false);
  const roleLabel = emp.role === "admin" ? "إدارة عليا" : emp.role === "manager" ? "مدير" : "موظف";
  const roleColor = emp.role === "admin" ? "text-purple-400 bg-purple-900/30" : emp.role === "manager" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 bg-gray-700/30";

  return (
    <div className={`bg-[#1a2234] border rounded-2xl overflow-hidden transition-all ${emp.isActive ? "border-white/10" : "border-red-500/20 opacity-70"}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-right p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${emp.isActive ? "bg-blue-600" : "bg-gray-600"}`}>
          {emp.fullName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{emp.fullName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor}`}>{roleLabel}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${emp.isActive ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
              {emp.isActive ? "● نشط" : "○ موقوف"}
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{emp.jobTitle || "—"} {emp.branchName ? `· ${emp.branchName}` : ""}</p>
        </div>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: <Mail size={14} />, label: "البريد", val: emp.email },
              { icon: <Phone size={14} />, label: "الهاتف", val: emp.phone },
              { icon: <MapPin size={14} />, label: "العنوان", val: emp.address },
              { icon: <Briefcase size={14} />, label: "المسمى", val: emp.jobTitle },
              { icon: <Building size={14} />, label: "القسم", val: emp.departmentName },
              { icon: <Building size={14} />, label: "الفرع", val: emp.branchName },
              { icon: <Clock size={14} />, label: "وقت الدوام", val: emp.shiftStart && emp.shiftEnd ? `${fmt12(emp.shiftStart)} - ${fmt12(emp.shiftEnd)}` : null },
              { icon: <DollarSign size={14} />, label: "الراتب", val: emp.salary ? `${emp.salary.toLocaleString()} د.ع` : null },
              { icon: <Shield size={14} />, label: "الدور", val: roleLabel },
              { icon: <User size={14} />, label: "المستخدم", val: emp.username },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                <span className="text-blue-400 shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">{item.label}</p>
                  <p className="text-white text-xs font-medium truncate">{item.val || "—"}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onEdit} className="flex items-center gap-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-2 rounded-lg text-xs font-medium transition-all">
              <Edit2 size={14} />تعديل
            </button>
            <button onClick={onToggle} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${emp.isActive ? "bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40" : "bg-green-600/20 text-green-400 hover:bg-green-600/40"}`}>
              {emp.isActive ? <><ToggleLeft size={14} />إيقاف</> : <><ToggleRight size={14} />تفعيل</>}
            </button>
            <button onClick={onDelete} className="flex items-center gap-1 bg-red-600/20 text-red-400 hover:bg-red-600/40 px-3 py-2 rounded-lg text-xs font-medium transition-all">
              <Trash2 size={14} />حذف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState<Partial<Employee> | null>(null);
  const BASE = import.meta.env.BASE_URL;

  const fetchAll = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterBranch) params.set("branchId", filterBranch);
    if (filterStatus) params.set("status", filterStatus);
    const [empRes, deptRes, shiftRes, branchRes] = await Promise.all([
      fetch(`${BASE}api/employees?${params}`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/departments`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/shifts`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/branches`, { credentials: "include" }).then(r => r.json()),
    ]);
    setEmployees(Array.isArray(empRes) ? empRes : []);
    setDepts(Array.isArray(deptRes) ? deptRes : []);
    setShifts(Array.isArray(shiftRes) ? shiftRes : []);
    setBranches(Array.isArray(branchRes) ? branchRes : []);
    setLoading(false);
  }, [BASE, search, filterBranch, filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف هذا الموظف؟")) return;
    await fetch(`${BASE}api/employees/${id}`, { method: "DELETE", credentials: "include" });
    setEmployees(e => e.filter(x => x.id !== id));
  };

  const handleToggle = async (id: number) => {
    const res = await fetch(`${BASE}api/employees/${id}/toggle-status`, { method: "PUT", credentials: "include" });
    const data = await res.json();
    setEmployees(e => e.map(x => x.id === id ? { ...x, ...data } : x));
  };

  const handleSave = (data: Employee) => {
    setEmployees(e => {
      const idx = e.findIndex(x => x.id === data.id);
      if (idx >= 0) { const n = [...e]; n[idx] = data; return n; }
      return [data, ...e];
    });
    setShowModal(false);
  };

  const activeCount = employees.filter(e => e.isActive).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto" dir="rtl">
      {showModal && (
        <EmployeeModal emp={editEmp} depts={depts} shifts={shifts} branches={branches}
          onClose={() => setShowModal(false)} onSave={handleSave} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">إدارة الموظفين</h1>
          <p className="text-gray-400 text-sm">{employees.length} موظف — {activeCount} نشط</p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
          <Plus size={16} />إضافة موظف
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            className="bg-transparent text-white text-sm outline-none flex-1 min-w-0" />
        </div>
        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none">
          <option value="">كل الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">موقوف</option>
        </select>
      </div>

      {/* Employee Cards */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا يوجد موظفون</p>
          </div>
        ) : (
          employees.map(emp => (
            <EmployeeCard key={emp.id} emp={emp}
              onEdit={() => { setEditEmp(emp); setShowModal(true); }}
              onDelete={() => handleDelete(emp.id)}
              onToggle={() => handleToggle(emp.id)} />
          ))
        )}
      </div>
    </div>
  );
}
