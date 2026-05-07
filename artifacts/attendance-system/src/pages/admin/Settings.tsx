import { useState, useEffect } from "react";
import {
  Settings, Users, Key, Save, Plus, Edit2, Trash2,
  Eye, EyeOff, Shield, CheckCircle, XCircle, RefreshCw, Lock
} from "lucide-react";
import { useTheme } from "@/lib/theme";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<"accounts" | "password">("accounts");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [passModal, setPassModal] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  useEffect(() => { loadAccounts(); }, []);

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
    { key: "password", label: "تغيير كلمتي المرور", icon: Key },
  ] as const;

  const textPrimary  = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.35)" : "#64748b";
  const textMuted    = isDark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const cardBg       = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBorder   = isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0";
  const inputBg      = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorderC = isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const rowHoverBg   = isDark ? "rgba(255,255,255,0.01)" : "#f8fafc";
  const nCard = { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: 20, boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" };
  const inputSt = { width: "100%", padding: "11px 14px", borderRadius: 11, background: inputBg, border: `1px solid ${inputBorderC}`, color: textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box" as const, colorScheme: isDark ? "dark" : "light" };
  const labelSt = { display: "block", fontSize: 11, color: textSecondary, marginBottom: 5 };

  const roleColor: Record<string, { color: string; bg: string; border: string }> = {
    admin:    { color: "#a855f7", bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.2)" },
    manager:  { color: "#00f5ff", bg: "rgba(0,245,255,0.08)",  border: "rgba(0,245,255,0.2)" },
    employee: { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" },
  };

  return (
    <div dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showAdd && <AddAccountModal onClose={() => setShowAdd(false)} onSaved={() => { loadAccounts(); showToast("تم إضافة الحساب"); }} />}
      {passModal && (
        <PasswordModal accountId={passModal.id} accountName={passModal.name}
          onClose={() => setPassModal(null)} onSaved={() => showToast("تم تغيير كلمة المرور")} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Settings size={18} style={{ color: "#00f5ff" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>الإعدادات</h1>
          <p style={{ fontSize: 12, color: textSecondary, marginTop: 3 }}>إدارة الحسابات وإعدادات النظام</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 11, border: active ? "1px solid rgba(0,245,255,0.3)" : `1px solid ${cardBorder}`, background: active ? "rgba(0,245,255,0.08)" : cardBg, color: active ? "#00f5ff" : textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <t.icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Accounts Tab */}
      {tab === "accounts" && (
        <div style={nCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${cardBorder}` }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>حسابات المستخدمين</h2>
              <p style={{ fontSize: 11, color: textSecondary, marginTop: 3 }}>{accounts.length} حساب مسجل</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(59,130,246,0.7))", color: "#020817", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Plus size={13} /> إضافة حساب
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <RefreshCw size={24} style={{ color: "#00f5ff", animation: "spin 1s linear infinite" }} />
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: textMuted }}>
              <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.2 }} />
              <p style={{ fontSize: 13 }}>لا توجد حسابات</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {accounts.map(acc => {
                const rc = roleColor[acc.role] ?? { color: textSecondary, bg: inputBg, border: cardBorder };
                return (
                  <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: rowHoverBg }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: rc.bg, border: `1px solid ${rc.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: rc.color, flexShrink: 0 }}>
                        {acc.fullName.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{acc.fullName}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`, padding: "1px 7px", borderRadius: 20 }}>{ROLE_MAP[acc.role] || acc.role}</span>
                          {!acc.isActive && <span style={{ fontSize: 10, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", padding: "1px 7px", borderRadius: 20 }}>معطّل</span>}
                        </div>
                        <p style={{ fontSize: 11, color: textSecondary, fontFamily: "monospace", marginTop: 2 }} dir="ltr">{acc.username}</p>
                        {(acc.email || acc.phone) && <p style={{ fontSize: 11, color: textMuted }}>{acc.email || acc.phone}</p>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => setPassModal({ id: acc.id, name: acc.fullName })} title="تغيير كلمة المرور"
                        style={{ padding: 7, borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b", cursor: "pointer" }}>
                        <Key size={13} />
                      </button>
                      <button onClick={() => handleToggle(acc.id, acc.isActive)} title={acc.isActive ? "تعطيل" : "تفعيل"}
                        style={{ padding: 7, borderRadius: 8, background: acc.isActive ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${acc.isActive ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.08)"}`, color: acc.isActive ? "#10b981" : "rgba(255,255,255,0.3)", cursor: "pointer" }}>
                        {acc.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                      </button>
                      <button onClick={() => handleDelete(acc.id)} disabled={deletingId === acc.id} title="حذف"
                        style={{ padding: 7, borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171", cursor: deletingId === acc.id ? "not-allowed" : "pointer", opacity: deletingId === acc.id ? 0.5 : 1 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${cardBorder}`, background: rowHoverBg, borderRadius: 12, padding: "12px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: textSecondary, marginBottom: 8 }}>بيانات الدخول للاختبار:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[{ u: "admin", p: "admin123", r: "مدير" }, { u: "manager1", p: "manager123", r: "مشرف" }, { u: "emp1", p: "emp123", r: "موظف" }, { u: "emp2", p: "emp123", r: "موظف" }].map(x => (
                <div key={x.u} style={{ background: inputBg, borderRadius: 10, padding: "8px 10px", border: `1px solid ${cardBorder}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,245,255,0.6)" }}>{x.r}</p>
                  <p style={{ fontSize: 10, fontFamily: "monospace", color: textSecondary }} dir="ltr">{x.u} / {x.p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Change Own Password Tab */}
      {tab === "password" && (
        <div style={{ ...nCard, maxWidth: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={16} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: 0 }}>تغيير كلمة المرور الخاصة بك</h2>
              <p style={{ fontSize: 11, color: textSecondary, marginTop: 3 }}>يُنصح بتغييرها دورياً للحفاظ على الأمان</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelSt}>كلمة المرور الحالية</label>
              <div style={{ position: "relative" }}>
                <input type={showSelf ? "text" : "password"} value={selfPass.old} onChange={e => setSelfPass(p => ({ ...p, old: e.target.value }))} placeholder="••••••••" style={inputSt} />
                <button type="button" onClick={() => setShowSelf(!showSelf)} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: textSecondary, cursor: "pointer" }}>
                  {showSelf ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelSt}>كلمة المرور الجديدة</label>
              <input type={showSelf ? "text" : "password"} value={selfPass.newP} onChange={e => setSelfPass(p => ({ ...p, newP: e.target.value }))} placeholder="6 أحرف على الأقل" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>تأكيد كلمة المرور</label>
              <input type={showSelf ? "text" : "password"} value={selfPass.confirm} onChange={e => setSelfPass(p => ({ ...p, confirm: e.target.value }))} placeholder="أعد كتابة كلمة المرور الجديدة" style={inputSt} />
            </div>
          </div>

          <button onClick={handleSelfPassword} disabled={selfLoading}
            style={{ marginTop: 20, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(234,88,12,0.8))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: selfLoading ? "not-allowed" : "pointer", opacity: selfLoading ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
            {selfLoading ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />} تغيير كلمة المرور
          </button>
        </div>
      )}
    </div>
  );
}
