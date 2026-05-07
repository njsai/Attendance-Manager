import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X, User, Mail, Phone, MapPin, Briefcase, Building, Clock, DollarSign, Shield, ScanFace } from "lucide-react";
import FaceCapture from "@/components/FaceCapture";

interface Employee {
  id: number; username: string; fullName: string; email: string | null; phone: string | null;
  address: string | null; jobTitle: string | null; role: string; departmentId: number | null;
  shiftId: number | null; branchId: number | null; salary: number | null; isActive: boolean;
  departmentName: string | null; shiftName: string | null; branchName: string | null;
  shiftStart: string | null; shiftEnd: string | null; createdAt: string; hasFace: boolean;
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

  const inpSt = { width: "100%", padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box" as const, colorScheme: "dark" as const };
  const lbl = { display: "block", fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <div style={{ background: "rgba(5,13,31,0.97)", border: "1px solid rgba(0,245,255,0.12)", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,245,255,0.07)" }}>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}>{emp?.id ? "تعديل موظف" : "إضافة موظف جديد"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 12 }}>{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "الاسم الكامل *", key: "fullName", type: "text", required: true },
              { label: "اسم المستخدم *", key: "username", type: "text", required: true, disabled: !!emp?.id },
              { label: emp?.id ? "كلمة مرور جديدة" : "كلمة المرور *", key: "password", type: "password", required: !emp?.id },
              { label: "البريد الإلكتروني", key: "email", type: "email" },
              { label: "رقم الهاتف", key: "phone", type: "text" },
              { label: "المسمى الوظيفي", key: "jobTitle", type: "text" },
              { label: "الراتب", key: "salary", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                  required={f.required} disabled={f.disabled}
                  style={{ ...inpSt, opacity: f.disabled ? 0.5 : 1 }} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={lbl}>العنوان</label>
              <input value={form.address} onChange={e => set("address", e.target.value)} style={inpSt} />
            </div>
            {[
              { label: "الدور", key: "role", opts: [{ v: "employee", l: "موظف" }, { v: "manager", l: "مدير" }, { v: "admin", l: "إدارة عليا" }] },
              { label: "القسم", key: "departmentId", opts: [{ v: "", l: "-- بدون قسم --" }, ...depts.map(d => ({ v: String(d.id), l: d.name }))] },
              { label: "الفرع", key: "branchId", opts: [{ v: "", l: "-- بدون فرع --" }, ...branches.map(b => ({ v: String(b.id), l: b.name }))] },
              { label: "الوردية", key: "shiftId", opts: [{ v: "", l: "-- بدون وردية --" }, ...shifts.map(s => ({ v: String(s.id), l: `${s.name} (${fmt12(s.startTime)} - ${fmt12(s.endTime)})` }))] },
            ].map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label}</label>
                <select value={form[f.key]} onChange={e => set(f.key, e.target.value ? (f.key === "role" ? e.target.value : parseInt(e.target.value)) : "")} style={inpSt}>
                  {f.opts.map(o => <option key={o.v} value={o.v} style={{ background: "#050d1f" }}>{o.l}</option>)}
                </select>
              </div>
            ))}
            {emp?.id && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={lbl}>الحالة</label>
                <button type="button" onClick={() => set("isActive", !form.isActive)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: form.isActive ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)", color: form.isActive ? "#10b981" : "#f87171" }}>
                  {form.isActive ? "نشط" : "موقوف"}
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(59,130,246,0.7))", color: "#020817", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeCard({ emp, onEdit, onDelete, onToggle, onFaceEnroll }: { emp: Employee; onEdit: () => void; onDelete: () => void; onToggle: () => void; onFaceEnroll: () => void; }) {
  const [open, setOpen] = useState(false);
  const roleLabel = emp.role === "admin" ? "إدارة عليا" : emp.role === "manager" ? "مدير" : "موظف";
  const roleColor = emp.role === "admin" ? { color: "#a855f7", bg: "rgba(168,85,247,0.1)" } : emp.role === "manager" ? { color: "#00f5ff", bg: "rgba(0,245,255,0.08)" } : { color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${emp.isActive ? "rgba(0,245,255,0.07)" : "rgba(248,113,113,0.15)"}`, borderRadius: 14, overflow: "hidden", opacity: emp.isActive ? 1 : 0.75 }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "right", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, background: emp.isActive ? "linear-gradient(135deg, rgba(0,245,255,0.3), rgba(59,130,246,0.3))" : "rgba(255,255,255,0.08)", color: emp.isActive ? "#00f5ff" : "rgba(255,255,255,0.4)", flexShrink: 0 }}>
          {emp.fullName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <p style={{ color: "#fff", fontWeight: 600, fontSize: 13, margin: 0 }}>{emp.fullName}</p>
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, color: roleColor.color, background: roleColor.bg }}>{roleLabel}</span>
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, color: emp.isActive ? "#10b981" : "#f87171", background: emp.isActive ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)" }}>
              {emp.isActive ? "● نشط" : "○ موقوف"}
            </span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 3 }}>{emp.jobTitle || "—"} {emp.branchName ? `· ${emp.branchName}` : ""}</p>
        </div>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(0,245,255,0.06)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="grid grid-cols-2 gap-2">
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
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", borderRadius: 9, padding: "7px 10px" }}>
                <span style={{ color: "#00f5ff", flexShrink: 0 }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0 }}>{item.label}</p>
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.val || "—"}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, paddingTop: 4, flexWrap: "wrap" }}>
            <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, border: "none", background: "rgba(0,245,255,0.07)", color: "#00f5ff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Edit2 size={12} /> تعديل
            </button>
            <button onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, border: "none", background: emp.isActive ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)", color: emp.isActive ? "#f59e0b" : "#10b981", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              {emp.isActive ? <><ToggleLeft size={12} /> إيقاف</> : <><ToggleRight size={12} /> تفعيل</>}
            </button>
            <button onClick={onFaceEnroll} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, border: "none", background: emp.hasFace ? "rgba(16,185,129,0.08)" : "rgba(168,85,247,0.08)", color: emp.hasFace ? "#10b981" : "#a855f7", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <ScanFace size={12} /> {emp.hasFace ? "بصمة مسجلة ✓" : "تسجيل بصمة"}
            </button>
            <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.07)", color: "#f87171", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Trash2 size={12} /> حذف
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
  const [faceEnrollEmp, setFaceEnrollEmp] = useState<Employee | null>(null);
  const [faceMsg, setFaceMsg] = useState("");
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

  const handleFaceCapture = async (descriptor: number[]) => {
    if (!faceEnrollEmp) return;
    try {
      const res = await fetch(`${BASE}api/employees/${faceEnrollEmp.id}/face-descriptor`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceDescriptor: descriptor }),
      });
      if (res.ok) {
        setEmployees(e => e.map(x => x.id === faceEnrollEmp.id ? { ...x, hasFace: true } : x));
        setFaceMsg(`✓ تم تسجيل بصمة وجه ${faceEnrollEmp.fullName} بنجاح`);
      } else { setFaceMsg("فشل حفظ البصمة"); }
    } catch { setFaceMsg("خطأ في الاتصال"); }
    setFaceEnrollEmp(null);
    setTimeout(() => setFaceMsg(""), 4000);
  };

  const activeCount = employees.filter(e => e.isActive).length;

  const selStyle = { padding: "9px 12px", borderRadius: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", color: "#fff", fontSize: 13, outline: "none", colorScheme: "dark" as const };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(0,245,255,0.15)", borderTopColor: "#00f5ff", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 720, margin: "0 auto" }} dir="rtl">
      {showModal && (
        <EmployeeModal emp={editEmp} depts={depts} shifts={shifts} branches={branches}
          onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
      {faceEnrollEmp && (
        <FaceCapture mode="enroll" onCapture={handleFaceCapture} onClose={() => setFaceEnrollEmp(null)} />
      )}
      {faceMsg && (
        <div style={{ position: "fixed", bottom: 24, right: 24, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 700, zIndex: 9999, background: faceMsg.startsWith("✓") ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)", color: "#fff", backdropFilter: "blur(12px)" }}>
          {faceMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>إدارة الموظفين</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{employees.length} موظف — {activeCount} نشط</p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.75), rgba(59,130,246,0.75))", color: "#020817", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={14} /> إضافة موظف
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 11, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,245,255,0.1)", flex: 1, minWidth: 160 }}>
          <Search size={14} style={{ color: "rgba(0,245,255,0.4)", flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
            style={{ background: "transparent", color: "#fff", fontSize: 13, outline: "none", border: "none", flex: 1, minWidth: 0 }} />
        </div>
        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={selStyle}>
          <option value="" style={{ background: "#050d1f" }}>كل الفروع</option>
          {branches.map(b => <option key={b.id} value={b.id} style={{ background: "#050d1f" }}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
          <option value="" style={{ background: "#050d1f" }}>كل الحالات</option>
          <option value="active" style={{ background: "#050d1f" }}>نشط</option>
          <option value="inactive" style={{ background: "#050d1f" }}>موقوف</option>
        </select>
      </div>

      {/* Employee Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {employees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
            <User size={40} style={{ margin: "0 auto 10px", opacity: 0.2 }} />
            <p style={{ fontSize: 13 }}>لا يوجد موظفون</p>
          </div>
        ) : (
          employees.map(emp => (
            <EmployeeCard key={emp.id} emp={emp}
              onEdit={() => { setEditEmp(emp); setShowModal(true); }}
              onDelete={() => handleDelete(emp.id)}
              onToggle={() => handleToggle(emp.id)}
              onFaceEnroll={() => setFaceEnrollEmp(emp)} />
          ))
        )}
      </div>
    </div>
  );
}
