import { useState, useEffect } from "react";
import {
  Settings, Users, Key, MapPin, Save, Plus, Edit2, Trash2,
  Eye, EyeOff, Shield, CheckCircle, XCircle, RefreshCw, Lock
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface Account {
  id: number;
  username: string;
  fullName: string;
  role: string;
  jobTitle: string | null;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface CompanyLocation {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

const ROLE_MAP: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مشرف",
  employee: "موظف",
};
const ROLE_COLOR: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border border-purple-200",
  manager: "bg-blue-100 text-blue-700 border border-blue-200",
  employee: "bg-green-100 text-green-700 border border-green-200",
};

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl text-sm font-medium
      ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
      {type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      {msg}
    </div>
  );
}

function PasswordModal({ onClose, onSaved, accountId, accountName }: {
  onClose: () => void;
  onSaved: () => void;
  accountId: number;
  accountName: string;
}) {
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!newPass || newPass.length < 6) { setErr("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (newPass !== confirm) { setErr("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${BASE}api/employees/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "فشل التحديث");
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">تغيير كلمة المرور</h2>
            <p className="text-xs text-slate-500">{accountName}</p>
          </div>
        </div>

        {err && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{err}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الجديدة</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تأكيد كلمة المرور</label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    username: "", password: "", fullName: "", email: "", phone: "", role: "employee", jobTitle: "",
  });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.username || !form.password || !form.fullName) {
      setErr("اسم المستخدم والرمز والاسم الكامل مطلوبة"); return;
    }
    if (form.password.length < 6) { setErr("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${BASE}api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          phone: form.phone || null,
          jobTitle: form.jobTitle || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "فشل الإنشاء");
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">إضافة حساب جديد</h2>
        </div>

        {err && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{err}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">الاسم الكامل *</label>
            <input value={form.fullName} onChange={e => set("fullName", e.target.value)}
              placeholder="محمد أحمد" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم *</label>
            <input value={form.username} onChange={e => set("username", e.target.value)}
              placeholder="username" dir="ltr" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الدور</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              <option value="employee">موظف</option>
              <option value="manager">مشرف</option>
              <option value="admin">مدير النظام</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور *</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="6 أحرف على الأقل" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={() => setShow(!show)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <input value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="email@domain.com" dir="ltr" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">رقم الهاتف</label>
            <input value={form.phone} onChange={e => set("phone", e.target.value)}
              placeholder="07XXXXXXXXX" dir="ltr" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">المسمى الوظيفي</label>
            <input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)}
              placeholder="مثال: موظف إداري" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            إلغاء
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [tab, setTab] = useState<"accounts" | "location" | "password">("accounts");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [passModal, setPassModal] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Location state
  const [location, setLocation] = useState<CompanyLocation>({ name: "المقر الرئيسي", latitude: 33.3152, longitude: 44.3661, radiusMeters: 300 });
  const [locLoading, setLocLoading] = useState(false);

  // Change own password state
  const [selfPass, setSelfPass] = useState({ old: "", newP: "", confirm: "" });
  const [showSelf, setShowSelf] = useState(false);
  const [selfLoading, setSelfLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/employees`, { credentials: "include" });
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLocation = async () => {
    try {
      const res = await fetch(`${BASE}api/settings/company-location`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLocation(data);
      }
    } catch {}
  };

  useEffect(() => { loadAccounts(); loadLocation(); }, []);

  const handleToggle = async (id: number, current: boolean) => {
    try {
      const res = await fetch(`${BASE}api/employees/${id}/toggle-status`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      showToast(current ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
      loadAccounts();
    } catch {
      showToast("فشل تغيير الحالة", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE}api/employees/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d?.message);
      }
      showToast("تم حذف الحساب");
      loadAccounts();
    } catch (e: any) {
      showToast(e.message || "فشل الحذف", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveLocation = async () => {
    setLocLoading(true);
    try {
      const res = await fetch(`${BASE}api/settings/company-location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(location),
      });
      if (!res.ok) throw new Error();
      showToast("تم حفظ موقع الشركة");
    } catch {
      showToast("فشل حفظ الموقع", "error");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSelfPassword = async () => {
    if (!selfPass.old || !selfPass.newP) { showToast("يرجى ملء جميع الحقول", "error"); return; }
    if (selfPass.newP.length < 6) { showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error"); return; }
    if (selfPass.newP !== selfPass.confirm) { showToast("كلمتا المرور غير متطابقتين", "error"); return; }
    setSelfLoading(true);
    try {
      const res = await fetch(`${BASE}api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword: selfPass.old, newPassword: selfPass.newP }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "فشل التغيير");
      showToast("تم تغيير كلمة المرور");
      setSelfPass({ old: "", newP: "", confirm: "" });
    } catch (e: any) {
      showToast(e.message || "فشل تغيير كلمة المرور", "error");
    } finally {
      setSelfLoading(false);
    }
  };

  const TABS = [
    { key: "accounts", label: "إدارة الحسابات", icon: Users },
    { key: "location", label: "موقع الشركة", icon: MapPin },
    { key: "password", label: "تغيير كلمتي المرور", icon: Key },
  ] as const;

  return (
    <div dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onSaved={() => { loadAccounts(); showToast("تم إضافة الحساب"); }} />}
      {passModal && (
        <PasswordModal
          accountId={passModal.id}
          accountName={passModal.name}
          onClose={() => setPassModal(null)}
          onSaved={() => showToast("تم تغيير كلمة المرور")}
        />
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">الإعدادات</h1>
            <p className="text-slate-500 text-sm">إدارة الحسابات وإعدادات النظام</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Accounts Tab */}
      {tab === "accounts" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">حسابات المستخدمين</h2>
              <p className="text-xs text-slate-500 mt-0.5">{accounts.length} حساب مسجل في النظام</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> إضافة حساب
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد حسابات</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                      acc.role === "admin" ? "bg-purple-100 text-purple-700" :
                      acc.role === "manager" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {acc.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">{acc.fullName}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[acc.role] || "bg-gray-100 text-gray-700"}`}>
                          {ROLE_MAP[acc.role] || acc.role}
                        </span>
                        {!acc.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-200">
                            معطّل
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono" dir="ltr">{acc.username}</p>
                      {(acc.email || acc.phone) && (
                        <p className="text-xs text-slate-400 mt-0.5">{acc.email || acc.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setPassModal({ id: acc.id, name: acc.fullName })}
                      title="تغيير كلمة المرور"
                      className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(acc.id, acc.isActive)}
                      title={acc.isActive ? "تعطيل" : "تفعيل"}
                      className={`p-2 rounded-lg transition-colors ${acc.isActive ? "text-green-500 hover:bg-green-50" : "text-slate-400 hover:bg-slate-100"}`}
                    >
                      {acc.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      disabled={deletingId === acc.id}
                      title="حذف"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <p className="text-xs font-semibold text-slate-500 mb-2">بيانات الدخول للاختبار:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { u: "admin", p: "admin123", r: "مدير" },
                { u: "manager1", p: "manager123", r: "مشرف" },
                { u: "emp1", p: "emp123", r: "موظف" },
                { u: "emp2", p: "emp123", r: "موظف" },
              ].map(x => (
                <div key={x.u} className="bg-white rounded-xl px-3 py-2 border border-slate-200">
                  <p className="text-xs font-bold text-slate-700">{x.r}</p>
                  <p className="text-xs font-mono text-slate-600" dir="ltr">{x.u} / {x.p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Tab */}
      {tab === "location" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">موقع الشركة الجغرافي</h2>
              <p className="text-xs text-slate-500">يُستخدم للتحقق من موقع الموظف عند تسجيل الحضور</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الموقع</label>
              <input
                value={location.name}
                onChange={e => setLocation(l => ({ ...l, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="المقر الرئيسي"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">خط العرض (Latitude)</label>
              <input
                type="number"
                step="any"
                value={location.latitude}
                onChange={e => setLocation(l => ({ ...l, latitude: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">خط الطول (Longitude)</label>
              <input
                type="number"
                step="any"
                value={location.longitude}
                onChange={e => setLocation(l => ({ ...l, longitude: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نطاق الحضور (متر)</label>
              <input
                type="number"
                value={location.radiusMeters}
                onChange={e => setLocation(l => ({ ...l, radiusMeters: parseInt(e.target.value) || 200 }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                dir="ltr"
              />
              <p className="text-xs text-slate-400 mt-1">أقصى مسافة مسموح بها لتسجيل الحضور</p>
            </div>
            <div className="flex items-end">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700 w-full">
                <p className="font-semibold mb-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> الموقع الحالي
                </p>
                <p dir="ltr" className="font-mono text-xs">{location.latitude}, {location.longitude}</p>
                <a
                  href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline text-xs mt-1 block"
                >
                  عرض على خريطة Google
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveLocation}
            disabled={locLoading}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {locLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الموقع
          </button>
        </div>
      )}

      {/* Change Own Password Tab */}
      {tab === "password" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">تغيير كلمة المرور الخاصة بك</h2>
              <p className="text-xs text-slate-500">يُنصح بتغييرها دورياً للحفاظ على الأمان</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={showSelf ? "text" : "password"}
                  value={selfPass.old}
                  onChange={e => setSelfPass(p => ({ ...p, old: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowSelf(!showSelf)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showSelf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور الجديدة</label>
              <input
                type={showSelf ? "text" : "password"}
                value={selfPass.newP}
                onChange={e => setSelfPass(p => ({ ...p, newP: e.target.value }))}
                placeholder="6 أحرف على الأقل"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">تأكيد كلمة المرور</label>
              <input
                type={showSelf ? "text" : "password"}
                value={selfPass.confirm}
                onChange={e => setSelfPass(p => ({ ...p, confirm: e.target.value }))}
                placeholder="أعد كتابة كلمة المرور الجديدة"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            onClick={handleSelfPassword}
            disabled={selfLoading}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {selfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            تغيير كلمة المرور
          </button>
        </div>
      )}
    </div>
  );
}
