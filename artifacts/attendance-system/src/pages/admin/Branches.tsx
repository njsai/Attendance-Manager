import { useState, useEffect, useCallback } from "react";
import { Plus, Building2, Edit2, Trash2, X, MapPin, Phone } from "lucide-react";

interface Branch { id: number; name: string; address: string | null; city: string | null; phone: string | null; isActive: boolean; createdAt: string; }

function BranchModal({ branch, onClose, onSave }: { branch: Partial<Branch> | null; onClose: () => void; onSave: (b: Branch) => void; }) {
  const [form, setForm] = useState({ name: branch?.name || "", address: branch?.address || "", city: branch?.city || "", phone: branch?.phone || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const BASE = import.meta.env.BASE_URL;
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const url = branch?.id ? `${BASE}api/branches/${branch.id}` : `${BASE}api/branches`;
      const method = branch?.id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل"); return; }
      onSave(data);
    } catch { setErr("خطأ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-bold">{branch?.id ? "تعديل فرع" : "إضافة فرع جديد"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {err && <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 text-red-300 text-sm">{err}</div>}
          {[
            { key: "name", label: "اسم الفرع *", required: true },
            { key: "city", label: "المدينة" },
            { key: "address", label: "العنوان" },
            { key: "phone", label: "رقم الهاتف" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} required={f.required}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 text-white font-bold py-2 rounded-xl text-sm">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Partial<Branch> | null>(null);
  const BASE = import.meta.env.BASE_URL;

  const fetch_ = useCallback(async () => {
    const res = await fetch(`${BASE}api/branches`, { credentials: "include" });
    const data = await res.json();
    setBranches(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [BASE]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const handleDelete = async (id: number) => {
    if (!confirm("حذف الفرع؟")) return;
    await fetch(`${BASE}api/branches/${id}`, { method: "DELETE", credentials: "include" });
    setBranches(b => b.filter(x => x.id !== id));
  };

  const handleSave = (b: Branch) => {
    setBranches(prev => {
      const idx = prev.findIndex(x => x.id === b.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = b; return n; }
      return [b, ...prev];
    });
    setShowModal(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto" dir="rtl">
      {showModal && <BranchModal branch={editBranch} onClose={() => setShowModal(false)} onSave={handleSave} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">إدارة الفروع</h1>
          <p className="text-gray-400 text-sm">{branches.length} فرع</p>
        </div>
        <button onClick={() => { setEditBranch(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
          <Plus size={16} />إضافة فرع
        </button>
      </div>

      <div className="space-y-3">
        {branches.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد فروع بعد</p>
          </div>
        ) : branches.map(b => (
          <div key={b.id} className="bg-[#1a2234] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Building2 size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{b.name}</p>
                  {b.city && <p className="text-gray-400 text-xs">{b.city}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditBranch(b); setShowModal(true); }}
                  className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-all">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(b.id)}
                  className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {(b.address || b.phone) && (
              <div className="mt-3 flex gap-3 flex-wrap">
                {b.address && <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={12} className="text-blue-400" />{b.address}</div>}
                {b.phone && <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={12} className="text-blue-400" />{b.phone}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
