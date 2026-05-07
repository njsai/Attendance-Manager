import { useState, useEffect, useCallback } from "react";
import { Plus, Building2, Edit2, Trash2, X, MapPin, Phone, Navigation, Globe } from "lucide-react";

interface Branch {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  isActive: boolean;
  createdAt: string;
}

function BranchModal({ branch, onClose, onSave }: {
  branch: Partial<Branch> | null;
  onClose: () => void;
  onSave: (b: Branch) => void;
}) {
  const [form, setForm] = useState({
    name: branch?.name || "",
    address: branch?.address || "",
    city: branch?.city || "",
    phone: branch?.phone || "",
    latitude: branch?.latitude != null ? String(branch.latitude) : "",
    longitude: branch?.longitude != null ? String(branch.longitude) : "",
    radiusMeters: branch?.radiusMeters != null ? String(branch.radiusMeters) : "200",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [locating, setLocating] = useState(false);
  const BASE = import.meta.env.BASE_URL;
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude: String(pos.coords.latitude.toFixed(6)),
          longitude: String(pos.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      () => { setErr("فشل تحديد الموقع. تحقق من أذونات الموقع."); setLocating(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      const url = branch?.id ? `${BASE}api/branches/${branch.id}` : `${BASE}api/branches`;
      const method = branch?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          address: form.address || null,
          city: form.city || null,
          phone: form.phone || null,
          latitude: form.latitude !== "" ? parseFloat(form.latitude) : null,
          longitude: form.longitude !== "" ? parseFloat(form.longitude) : null,
          radiusMeters: form.radiusMeters !== "" ? parseInt(form.radiusMeters) : 200,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.message || "فشل الحفظ"); return; }
      onSave(data);
    } catch { setErr("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#1a2234] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-[#1a2234] z-10">
          <h2 className="text-white font-bold">{branch?.id ? "تعديل الفرع" : "إضافة فرع جديد"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-2 text-red-300 text-sm">{err}</div>}

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">المعلومات الأساسية</h3>
            {[
              { key: "name", label: "اسم الفرع *", required: true },
              { key: "city", label: "المدينة" },
              { key: "address", label: "العنوان" },
              { key: "phone", label: "رقم الهاتف" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  required={f.required}
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            ))}
          </div>

          {/* GPS Section */}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                <MapPin size={12} className="text-blue-400" />
                موقع GPS (للتحقق من الحضور)
              </h3>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Navigation size={12} />
                {locating ? "جاري التحديد..." : "تحديد موقعي"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">خط العرض (Latitude)</label>
                <input
                  value={form.latitude}
                  onChange={e => set("latitude", e.target.value)}
                  placeholder="e.g. 24.6877"
                  type="number"
                  step="any"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">خط الطول (Longitude)</label>
                <input
                  value={form.longitude}
                  onChange={e => set("longitude", e.target.value)}
                  placeholder="e.g. 46.7219"
                  type="number"
                  step="any"
                  className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">النطاق المسموح به (متر)</label>
              <input
                value={form.radiusMeters}
                onChange={e => set("radiusMeters", e.target.value)}
                type="number"
                min="50"
                max="5000"
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">يُنصح بـ 100-500 متر للمكاتب، 500-2000 متر للمواقع الواسعة</p>
            </div>

            {form.latitude && form.longitude && (
              <a
                href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Globe size={12} />
                عرض الموقع على خرائط Google
              </a>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl text-sm transition-colors"
            >
              إلغاء
            </button>
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
    if (!confirm("حذف الفرع؟ سيتم إلغاء ربط الموظفين بهذا الفرع.")) return;
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(0,245,255,0.15)", borderTopColor: "#00f5ff", animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 680, margin: "0 auto" }} dir="rtl">
      {showModal && (
        <BranchModal branch={editBranch}
          onClose={() => { setShowModal(false); setEditBranch(null); }}
          onSave={handleSave} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>إدارة الفروع</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{branches.length} فرع · يمكن إضافة موقع GPS لكل فرع</p>
        </div>
        <button onClick={() => { setEditBranch(null); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,245,255,0.75), rgba(59,130,246,0.75))", color: "#020817", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={14} /> إضافة فرع
        </button>
      </div>

      {/* Branch Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {branches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
            <Building2 size={40} style={{ margin: "0 auto 10px", opacity: 0.2 }} />
            <p style={{ fontSize: 13 }}>لا توجد فروع بعد</p>
          </div>
        ) : branches.map(b => {
          const hasGps = b.latitude != null;
          return (
            <div key={b.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${hasGps ? "rgba(16,185,129,0.15)" : "rgba(0,245,255,0.07)"}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: hasGps ? "rgba(16,185,129,0.1)" : "rgba(0,245,255,0.08)", border: `1px solid ${hasGps ? "rgba(16,185,129,0.2)" : "rgba(0,245,255,0.15)"}` }}>
                    <Building2 size={18} style={{ color: hasGps ? "#10b981" : "#00f5ff" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, margin: 0 }}>{b.name}</p>
                      {hasGps ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "1px 6px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <MapPin size={8} /> GPS
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 7px", borderRadius: 20 }}>بدون GPS</span>
                      )}
                      {!b.isActive && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", padding: "1px 7px", borderRadius: 20 }}>معطّل</span>
                      )}
                    </div>
                    {b.city && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>{b.city}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditBranch(b); setShowModal(true); }}
                    style={{ padding: 7, borderRadius: 9, background: "rgba(0,245,255,0.07)", border: "1px solid rgba(0,245,255,0.15)", color: "#00f5ff", cursor: "pointer" }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(b.id)}
                    style={{ padding: 7, borderRadius: 9, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171", cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {(b.address || b.phone || (b.latitude != null && b.longitude != null)) && (
                <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {b.address && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      <MapPin size={11} style={{ color: "#00f5ff" }} /> {b.address}
                    </div>
                  )}
                  {b.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      <Phone size={11} style={{ color: "#00f5ff" }} /> {b.phone}
                    </div>
                  )}
                  {b.latitude != null && b.longitude != null && (
                    <a href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#10b981", textDecoration: "none" }}>
                      <Navigation size={11} />
                      {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)} · نطاق {b.radiusMeters ?? 200}م
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
