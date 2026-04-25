import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Building2, Plus, Trash2, Edit, Users, LogOut, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, EyeOff, Key, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL;

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...opts?.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

interface Company {
  id: number; name: string; address?: string; phone?: string; email?: string;
  isActive: boolean; createdAt: string; employeeCount: number;
}

export default function SuperAdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [companyEmployees, setCompanyEmployees] = useState<Record<number, any[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Company | null>(null);
  const [showEditModal, setShowEditModal] = useState<Company | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<{ companyId: number; empId: number; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const showMsg = (msg: string, ok = true) => { setFeedback({ msg, ok }); setTimeout(() => setFeedback(null), 3000); };

  const loadCompanies = async () => {
    setLoading(true);
    try { setCompanies(await apiFetch("api/super-admin/companies")); }
    catch { showMsg("فشل تحميل الشركات", false); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCompanies(); }, []);

  const loadEmployees = async (cId: number) => {
    if (companyEmployees[cId]) return;
    try {
      const emps = await apiFetch(`api/super-admin/companies/${cId}/employees`);
      setCompanyEmployees(prev => ({ ...prev, [cId]: emps }));
    } catch { showMsg("فشل تحميل الموظفين", false); }
  };

  const toggleExpand = (cId: number) => {
    if (expandedId === cId) { setExpandedId(null); return; }
    setExpandedId(cId);
    loadEmployees(cId);
  };

  const toggleCompany = async (c: Company) => {
    try {
      await apiFetch(`api/super-admin/companies/${c.id}/toggle`, { method: "PUT" });
      setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, isActive: !co.isActive } : co));
      showMsg(`تم ${c.isActive ? "إيقاف" : "تفعيل"} الشركة`);
    } catch (err: any) { showMsg(err.message, false); }
  };

  const deleteCompany = async (c: Company) => {
    try {
      await apiFetch(`api/super-admin/companies/${c.id}`, { method: "DELETE" });
      setCompanies(prev => prev.filter(co => co.id !== c.id));
      setShowDeleteConfirm(null);
      showMsg("تم حذف الشركة");
    } catch (err: any) { showMsg(err.message, false); }
  };

  const logout = async () => {
    await fetch(`${BASE}api/auth/logout`, { method: "POST", credentials: "include" });
    queryClient.clear();
    setLocation("/super-admin/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900" dir="rtl">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">لوحة التحكم الرئيسية</h1>
              <p className="text-slate-400 text-xs">إدارة جميع الشركات</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadCompanies} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all">
              <LogOut className="w-4 h-4" /> خروج
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الشركات", value: companies.length, icon: Building2, color: "indigo" },
            { label: "شركات نشطة", value: companies.filter(c => c.isActive).length, icon: CheckCircle, color: "green" },
            { label: "شركات موقوفة", value: companies.filter(c => !c.isActive).length, icon: XCircle, color: "red" },
            { label: "إجمالي الموظفين", value: companies.reduce((s, c) => s + c.employeeCount, 0), icon: Users, color: "blue" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${s.color}-500/20 flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 text-${s.color}-400`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add company button */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-xl">الشركات</h2>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/40">
            <Plus className="w-4 h-4" /> إضافة شركة جديدة
          </button>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${feedback.ok ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
              {feedback.ok ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {feedback.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Companies list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد شركات — أضف شركة جديدة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map(company => (
              <div key={company.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold truncate">{company.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {company.isActive ? "نشط" : "موقوف"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      {company.phone && <span>📞 {company.phone}</span>}
                      {company.email && <span>✉️ {company.email}</span>}
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {company.employeeCount} موظف</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleCompany(company)} title="تفعيل/إيقاف"
                      className={`p-2 rounded-lg transition-colors ${company.isActive ? "text-yellow-400 hover:bg-yellow-500/10" : "text-green-400 hover:bg-green-500/10"}`}>
                      {company.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setShowEditModal(company)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(company)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleExpand(company.id)} className="p-2 rounded-lg text-slate-400 hover:bg-white/5 transition-colors">
                      {expandedId === company.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === company.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="border-t border-white/10 p-4">
                        <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" /> الموظفون ({companyEmployees[company.id]?.length ?? "..."})
                        </h4>
                        {companyEmployees[company.id] ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {companyEmployees[company.id].map(emp => (
                              <div key={emp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div>
                                  <div className="text-white text-sm font-medium">{emp.fullName}</div>
                                  <div className="text-slate-400 text-xs">@{emp.username} · {emp.role === "admin" ? "مدير" : emp.role === "manager" ? "مشرف" : "موظف"}</div>
                                </div>
                                <button onClick={() => setShowPasswordModal({ companyId: company.id, empId: emp.id, name: emp.fullName })}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all">
                                  <Key className="w-3.5 h-3.5" /> كلمة المرور
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreateModal && <CreateCompanyModal onClose={() => setShowCreateModal(false)} onCreated={(c) => { setCompanies(prev => [c, ...prev]); setShowCreateModal(false); showMsg("تم إنشاء الشركة بنجاح"); }} />}

      {/* Edit Modal */}
      {showEditModal && <EditCompanyModal company={showEditModal} onClose={() => setShowEditModal(null)} onUpdated={(c) => { setCompanies(prev => prev.map(co => co.id === c.id ? { ...co, ...c } : co)); setShowEditModal(null); showMsg("تم تحديث الشركة"); }} />}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-sm text-center">
            <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">حذف الشركة</h3>
            <p className="text-slate-400 text-sm mb-6">هل أنت متأكد من حذف "<strong className="text-white">{showDeleteConfirm.name}</strong>"؟ سيتم حذف جميع البيانات المرتبطة بها.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all">إلغاء</button>
              <button onClick={() => deleteCompany(showDeleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all">حذف</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && <ChangePasswordModal {...showPasswordModal} onClose={() => setShowPasswordModal(null)} onChanged={() => { setShowPasswordModal(null); showMsg("تم تغيير كلمة المرور"); }} />}
    </div>
  );
}

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: any) => void }) {
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", adminUsername: "", adminPassword: "", adminFullName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await apiFetch("api/super-admin/companies", { method: "POST", body: JSON.stringify(form) });
      onCreated({ ...data.company, employeeCount: 1 });
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg my-4">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-400" /> إضافة شركة جديدة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "name", l: "اسم الشركة *", t: "text" }, { k: "address", l: "العنوان", t: "text" },
              { k: "phone", l: "الهاتف", t: "text" }, { k: "email", l: "البريد الإلكتروني", t: "email" },
            ].map(f => (
              <div key={f.k} className={f.k === "name" || f.k === "address" ? "col-span-2" : ""}>
                <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
                <input type={f.t} value={(form as any)[f.k]} onChange={set(f.k)} required={f.l.includes("*")}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-indigo-400 font-semibold mb-3">بيانات مدير الشركة</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "adminFullName", l: "الاسم الكامل *", t: "text" },
                { k: "adminUsername", l: "اسم المستخدم *", t: "text" },
                { k: "adminPassword", l: "كلمة المرور *", t: "password" },
              ].map(f => (
                <div key={f.k} className={f.k === "adminFullName" ? "col-span-2" : ""}>
                  <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
                  <input type={f.t} value={(form as any)[f.k]} onChange={set(f.k)} required
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all">إلغاء</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} إنشاء الشركة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCompanyModal({ company, onClose, onUpdated }: { company: Company; onClose: () => void; onUpdated: (c: any) => void }) {
  const [form, setForm] = useState({ name: company.name, address: company.address || "", phone: company.phone || "", email: company.email || "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { onUpdated(await apiFetch(`api/super-admin/companies/${company.id}`, { method: "PUT", body: JSON.stringify(form) })); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2"><Edit className="w-5 h-5 text-blue-400" /> تعديل {company.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}
          {[{ k: "name", l: "اسم الشركة *" }, { k: "address", l: "العنوان" }, { k: "phone", l: "الهاتف" }, { k: "email", l: "البريد" }].map(f => (
            <div key={f.k}>
              <label className="text-xs text-slate-400 mb-1 block">{f.l}</label>
              <input type="text" value={(form as any)[f.k]} onChange={set(f.k)} required={f.l.includes("*")}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-all">إلغاء</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ companyId, empId, name, onClose, onChanged }: { companyId: number; empId: number; name: string; onClose: () => void; onChanged: () => void }) {
  const [newPass, setNewPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await apiFetch(`api/super-admin/companies/${companyId}/employees/${empId}/change-password`, { method: "PUT", body: JSON.stringify({ newPassword: newPass }) });
      onChanged();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-yellow-400" /> تغيير كلمة مرور {name}</h3>
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl mb-4">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="كلمة المرور الجديدة" required minLength={6}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-sm font-medium">إلغاء</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
