import { useState, useEffect, useCallback } from "react";
import { Plus, Building2, Edit2, Trash2, X, MapPin, Phone, Navigation, Globe, ToggleLeft, ToggleRight } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface Branch {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  locationVerificationEnabled: boolean;
  isActive: boolean;
  createdAt: string;
}

function BranchModal({ branch, onClose, onSave }: {
  branch: Partial<Branch> | null;
  onClose: () => void;
  onSave: (b: Branch) => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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

  const modalBg    = isDark ? "rgba(5,13,31,0.97)" : "#fff";
  const modalBorder= isDark ? "rgba(0,245,255,0.12)" : "#e2e8f0";
  const divider    = isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9";
  const titleColor = isDark ? "#fff" : "#0f172a";
  const labelColor = isDark ? "rgba(255,255,255,0.45)" : "#64748b";
  const muted      = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";
  const inputBg    = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputBorder= isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1";
  const inputColor = isDark ? "#fff" : "#0f172a";
  const closeBtnColor = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const cyanColor  = isDark ? "#00f5ff" : "#0891b2";
  const sectionColor = isDark ? "rgba(255,255,255,0.4)" : "#64748b";

  const nInp: React.CSSProperties = {
    width: "100%", padding: "8px 11px", borderRadius: 9,
    background: inputBg, border: `1px solid ${inputBorder}`,
    color: inputColor, fontSize: 13, outline: "none",
    boxSizing: "border-box", colorScheme: isDark ? "dark" : "light",
    fontFamily: "'Tajawal', sans-serif",
  };

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
      <div style={{ background: modalBg, border: `1px solid ${modalBorder}`, borderRadius: 20, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${divider}`, position: "sticky", top: 0, background: modalBg, zIndex: 10 }}>
          <h2 style={{ color: titleColor, fontWeight: 700, fontSize: 15, margin: 0 }}>{branch?.id ? "تعديل الفرع" : "إضافة فرع جديد"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: closeBtnColor, cursor: "pointer" }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {err && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "9px 12px", color: "#f87171", fontSize: 13 }}>{err}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: sectionColor, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>المعلومات الأساسية</p>
            {[
              { key: "name", label: "اسم الفرع *", required: true },
              { key: "city", label: "المدينة" },
              { key: "address", label: "العنوان" },
              { key: "phone", label: "رقم الهاتف" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  required={f.required}
                  style={nInp}
                />
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${divider}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ color: sectionColor, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                <MapPin size={12} style={{ color: cyanColor }} />
                موقع GPS (للتحقق من الحضور)
              </p>
              <button type="button" onClick={detectLocation} disabled={locating}
                style={{ fontSize: 11, color: cyanColor, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: locating ? 0.5 : 1 }}>
                <Navigation size={12} />
                {locating ? "جاري التحديد..." : "تحديد موقعي"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>خط العرض (Latitude)</label>
                <input value={form.latitude} onChange={e => set("latitude", e.target.value)}
                  placeholder="e.g. 24.6877" type="number" step="any" style={nInp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>خط الطول (Longitude)</label>
                <input value={form.longitude} onChange={e => set("longitude", e.target.value)}
                  placeholder="e.g. 46.7219" type="number" step="any" style={nInp} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, color: labelColor, marginBottom: 5 }}>النطاق المسموح به (متر)</label>
              <input value={form.radiusMeters} onChange={e => set("radiusMeters", e.target.value)}
                type="number" min="50" max="5000" style={nInp} />
              <p style={{ color: muted, fontSize: 11, marginTop: 4 }}>يُنصح بـ 100-500 متر للمكاتب، 500-2000 متر للمواقع الواسعة</p>
            </div>

            {form.latitude && form.longitude && (
              <a href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#10b981", textDecoration: "none" }}>
                <Globe size={12} />
                عرض الموقع على خرائط Google
              </a>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.8), rgba(59,130,246,0.8))", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${inputBorder}`, background: inputBg, color: isDark ? "rgba(255,255,255,0.5)" : "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBranches() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Partial<Branch> | null>(null);
  const [locatingId, setLocatingId] = useState<number | null>(null);
  const [locateMsg, setLocateMsg] = useState<{ id: number; text: string; ok: boolean } | null>(null);
  const BASE = import.meta.env.BASE_URL;

  const textPrimary   = isDark ? "#fff" : "#0f172a";
  const textMuted     = isDark ? "rgba(255,255,255,0.35)" : "#94a3b8";
  const cardBg        = isDark ? "rgba(255,255,255,0.02)" : "#fff";
  const cardBorder    = isDark ? "rgba(0,245,255,0.07)" : "#e2e8f0";
  const cyanColor     = isDark ? "#00f5ff" : "#0891b2";
  const spinColor     = isDark ? "#00f5ff" : "#0891b2";
  const emptyBg       = isDark ? "rgba(255,255,255,0.02)" : "#f8fafc";
  const emptyBorder   = isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0";

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

  const toggleLocationVerification = async (branchId: number, current: boolean) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    try {
      const res = await fetch(`${BASE}api/branches/${branchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...branch, locationVerificationEnabled: !current }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBranches(prev => prev.map(b => b.id === branchId ? updated : b));
        setLocateMsg({ id: branchId, text: !current ? "تم تفعيل التحقق من الموقع لهذا الفرع" : "تم إيقاف التحقق من الموقع لهذا الفرع", ok: true });
        setTimeout(() => setLocateMsg(null), 3000);
      }
    } catch {
      setLocateMsg({ id: branchId, text: "خطأ في تحديث الإعداد", ok: false });
      setTimeout(() => setLocateMsg(null), 3000);
    }
  };

  const quickLocate = (branchId: number) => {
    if (!navigator.geolocation) {
      setLocateMsg({ id: branchId, text: "المتصفح لا يدعم تحديد الموقع", ok: false });
      return;
    }
    setLocatingId(branchId);
    setLocateMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        try {
          const branch = branches.find(b => b.id === branchId);
          if (!branch) return;
          const res = await fetch(`${BASE}api/branches/${branchId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ...branch, latitude: lat, longitude: lng }),
          });
          if (res.ok) {
            const updated = await res.json();
            setBranches(prev => prev.map(b => b.id === branchId ? updated : b));
            setLocateMsg({ id: branchId, text: `تم تحديث الموقع: ${lat}, ${lng}`, ok: true });
          } else {
            setLocateMsg({ id: branchId, text: "فشل حفظ الموقع", ok: false });
          }
        } catch {
          setLocateMsg({ id: branchId, text: "خطأ في الاتصال بالخادم", ok: false });
        } finally {
          setLocatingId(null);
          setTimeout(() => setLocateMsg(null), 4000);
        }
      },
      (err) => {
        setLocatingId(null);
        const msg = err.code === 1 ? "تم رفض إذن الموقع — تحقق من إعدادات المتصفح"
                  : err.code === 2 ? "تعذّر تحديد الموقع، حاول مجدداً"
                  : "انتهت مهلة تحديد الموقع";
        setLocateMsg({ id: branchId, text: msg, ok: false });
        setTimeout(() => setLocateMsg(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(0,245,255,0.15)" : "#e2e8f0"}`, borderTopColor: spinColor, animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 680, margin: "0 auto" }} dir="rtl">
      {showModal && (
        <BranchModal branch={editBranch}
          onClose={() => { setShowModal(false); setEditBranch(null); }}
          onSave={handleSave} />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0 }}>إدارة الفروع</h1>
          <p style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>{branches.length} فرع · يمكن إضافة موقع GPS لكل فرع</p>
        </div>
        <button onClick={() => { setEditBranch(null); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, rgba(0,180,200,0.85), rgba(59,130,246,0.85))", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal', sans-serif" }}>
          <Plus size={14} /> إضافة فرع
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {branches.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: textMuted, background: emptyBg, borderRadius: 16, border: `1px solid ${emptyBorder}` }}>
            <Building2 size={40} style={{ margin: "0 auto 10px", opacity: 0.25 }} />
            <p style={{ fontSize: 13 }}>لا توجد فروع بعد</p>
          </div>
        ) : branches.map(b => {
          const hasGps = b.latitude != null;
          return (
            <div key={b.id} style={{ background: cardBg, border: `1px solid ${hasGps ? "rgba(16,185,129,0.2)" : cardBorder}`, borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: hasGps ? "rgba(16,185,129,0.1)" : (isDark ? "rgba(0,245,255,0.08)" : "rgba(8,145,178,0.08)"), border: `1px solid ${hasGps ? "rgba(16,185,129,0.2)" : (isDark ? "rgba(0,245,255,0.15)" : "rgba(8,145,178,0.2)")}` }}>
                    <Building2 size={18} style={{ color: hasGps ? "#10b981" : cyanColor }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ color: textPrimary, fontWeight: 600, fontSize: 14, margin: 0 }}>{b.name}</p>
                      {hasGps ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "1px 6px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <MapPin size={8} /> GPS
                        </span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 600, color: textMuted, background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`, padding: "1px 7px", borderRadius: 20 }}>بدون GPS</span>
                      )}
                      {!b.isActive && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", padding: "1px 7px", borderRadius: 20 }}>معطّل</span>
                      )}
                    </div>
                    {b.city && <p style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{b.city}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() => toggleLocationVerification(b.id, b.locationVerificationEnabled)}
                    title={b.locationVerificationEnabled ? "إيقاف التحقق من الموقع" : "تفعيل التحقق من الموقع"}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 9, border: "none",
                      background: b.locationVerificationEnabled
                        ? (isDark ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.1)")
                        : (isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"),
                      color: b.locationVerificationEnabled ? "#a855f7" : (isDark ? "rgba(255,255,255,0.3)" : "#94a3b8"),
                      fontSize: 11, fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Tajawal', sans-serif",
                      transition: "all 0.2s",
                    }}>
                    {b.locationVerificationEnabled
                      ? <ToggleRight size={14} />
                      : <ToggleLeft size={14} />}
                    {b.locationVerificationEnabled ? "تحقق مفعّل" : "تحقق معطّل"}
                  </button>
                  <button
                    onClick={() => quickLocate(b.id)}
                    disabled={locatingId === b.id}
                    title="تحديد موقعي الآن"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 9, border: "none",
                      background: locatingId === b.id
                        ? (isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.06)")
                        : (isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.1)"),
                      color: "#10b981",
                      fontSize: 11, fontWeight: 700,
                      cursor: locatingId === b.id ? "not-allowed" : "pointer",
                      opacity: locatingId === b.id ? 0.6 : 1,
                      fontFamily: "'Tajawal', sans-serif",
                      transition: "opacity 0.2s",
                    }}>
                    <Navigation size={11} style={{ animation: locatingId === b.id ? "spin 1s linear infinite" : "none" }} />
                    {locatingId === b.id ? "جاري..." : "موقعي الآن"}
                  </button>
                  <button onClick={() => { setEditBranch(b); setShowModal(true); }}
                    style={{ padding: 7, borderRadius: 9, background: isDark ? "rgba(0,245,255,0.07)" : "rgba(8,145,178,0.07)", border: `1px solid ${isDark ? "rgba(0,245,255,0.15)" : "rgba(8,145,178,0.2)"}`, color: cyanColor, cursor: "pointer" }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(b.id)}
                    style={{ padding: 7, borderRadius: 9, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)", color: "#f87171", cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {locateMsg?.id === b.id && (
                <div style={{
                  marginTop: 8, padding: "7px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                  background: locateMsg.ok ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)",
                  border: `1px solid ${locateMsg.ok ? "rgba(16,185,129,0.25)" : "rgba(248,113,113,0.25)"}`,
                  color: locateMsg.ok ? "#10b981" : "#f87171",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Navigation size={11} />
                  {locateMsg.text}
                </div>
              )}

              {(b.address || b.phone || (b.latitude != null && b.longitude != null)) && (
                <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {b.address && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: textMuted }}>
                      <MapPin size={11} style={{ color: cyanColor }} /> {b.address}
                    </div>
                  )}
                  {b.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: textMuted }}>
                      <Phone size={11} style={{ color: cyanColor }} /> {b.phone}
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
