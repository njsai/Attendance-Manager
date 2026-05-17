import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Phone, Mail, MapPin, Upload, FileText, CheckCircle, Trash2, AlertTriangle, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Doc {
  id: number;
  doc_type: string;
  file_name: string;
  file_mime: string;
  status: "pending" | "approved" | "rejected";
  uploaded_at: string;
  reviewed_at: string | null;
}

interface Profile {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  role: string;
  department_name: string | null;
  branch_name: string | null;
  shift_name: string | null;
  photo_data: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_rel: string | null;
  created_at: string;
  documents: Doc[];
}

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "id_card", label: "بطاقة الهوية" },
  { value: "passport", label: "جواز السفر" },
  { value: "certificate", label: "شهادة / وثيقة" },
  { value: "contract", label: "عقد العمل" },
  { value: "other", label: "أخرى" },
];

function docTypeLabel(t: string) {
  return DOC_TYPES.find(d => d.value === t)?.label ?? t;
}

function statusBadge(status: string) {
  if (status === "approved") return { label: "مقبول", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (status === "rejected") return { label: "مرفوض", color: "#f87171", bg: "rgba(248,113,113,0.1)" };
  return { label: "بانتظار المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
}

export default function EmployeeProfile() {
  const { user } = useAuth();
  const { dir } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const BASE = import.meta.env.BASE_URL;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ phone: "", email: "", address: "" });
  const [docType, setDocType] = useState("id_card");

  const textPrimary = isDark ? "#ffffff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.45)";
  const textMuted = isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.3)";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)";
  const cardBorder = isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.15)";
  const inpBg = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inpBorder = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const inpColor = isDark ? "#fff" : "#0f172a";
  const cyanColor = isDark ? "#00f5ff" : "#0891b2";

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}api/profile/${user.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setForm({ phone: data.phone ?? "", email: data.email ?? "", address: data.address ?? "" });
      })
      .catch(() => setError("فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [user, BASE]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`${BASE}api/profile/${user!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "فشل الحفظ"); return; }
      setSuccess("تم حفظ التغييرات بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("خطأ في الاتصال"); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("يُسمح بالصور فقط"); return; }
    if (file.size > 2 * 1024 * 1024) { setError("حجم الصورة يتجاوز 2 ميجابايت"); return; }
    setPhotoUploading(true); setError("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      try {
        const res = await fetch(`${BASE}api/profile/${user!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ photo_data: dataUrl }),
        });
        if (res.ok) {
          setProfile(p => p ? { ...p, photo_data: dataUrl } : p);
          setSuccess("تم تحديث الصورة الشخصية");
          setTimeout(() => setSuccess(""), 3000);
        } else {
          const d = await res.json();
          setError(d.message || "فشل رفع الصورة");
        }
      } catch { setError("خطأ في الاتصال"); }
      finally { setPhotoUploading(false); }
    };
    reader.readAsDataURL(file);
    if (photoRef.current) photoRef.current.value = "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError("حجم الملف يتجاوز 5 ميجابايت"); return; }
    setUploading(true); setUploadError("");
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const res = await fetch(`${BASE}api/profile/${user!.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ docType, fileName: file.name, fileData: base64, fileMime: file.type }),
        });
        const data = await res.json();
        if (!res.ok) { setUploadError(data.message || "فشل الرفع"); }
        else {
          setProfile(p => p ? { ...p, documents: [data, ...p.documents] } : p);
          setSuccess("تم رفع المستند بنجاح");
          setTimeout(() => setSuccess(""), 3000);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploadError("خطأ في الرفع"); setUploading(false); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("هل تريد حذف هذا المستند؟")) return;
    const res = await fetch(`${BASE}api/profile/documents/${docId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setProfile(p => p ? { ...p, documents: p.documents.filter(d => d.id !== docId) } : p);
    }
  };

  const inpSt = {
    width: "100%", padding: "9px 11px", borderRadius: 9,
    background: inpBg, border: `1px solid ${inpBorder}`,
    color: inpColor, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
    fontFamily: "'Tajawal', sans-serif",
  };
  const lbl = { display: "block" as const, fontSize: 11, color: textSecondary, marginBottom: 5, fontWeight: 600 as const };
  const card = { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: 20 };
  const initials = profile?.full_name.split(" ").slice(0, 2).map(w => w[0]).join("") ?? "?";

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid rgba(0,245,255,0.15)`, borderTopColor: cyanColor, animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ padding: 16, maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }} dir={dir}>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13 }}>
            <AlertTriangle size={14} /> {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: 13 }}>
            <CheckCircle size={14} /> {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar + info */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={photoUploading}
            title="تغيير الصورة الشخصية"
            style={{
              width: 64, height: 64, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
              background: profile?.photo_data
                ? "none"
                : "linear-gradient(135deg, rgba(0,245,255,0.6), rgba(168,85,247,0.6))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isDark ? "0 0 20px rgba(0,245,255,0.3)" : "0 0 12px rgba(0,180,200,0.2)",
              overflow: "hidden", position: "relative",
            }}>
            {profile?.photo_data
              ? <img src={profile.photo_data} alt="صورة شخصية" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 22, fontWeight: 700, color: "#020817" }}>{initials}</span>}
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
              <Camera size={18} color="#fff" />
            </div>
          </button>
          {photoUploading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} />
            </div>
          )}
        </div>
        <div>
          <p style={{ color: textPrimary, fontWeight: 700, fontSize: 17, margin: 0 }}>{profile?.full_name}</p>
          <p style={{ color: textSecondary, fontSize: 12, marginTop: 3 }}>{profile?.job_title ?? "—"}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {profile?.department_name && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(0,245,255,0.08)", color: cyanColor, border: `1px solid ${cyanColor}30` }}>{profile.department_name}</span>}
            {profile?.branch_name && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(168,85,247,0.08)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>{profile.branch_name}</span>}
          </div>
          <p style={{ fontSize: 10, color: textMuted, marginTop: 6 }}>اضغط على الصورة لتغييرها</p>
        </div>
      </div>

      {/* Editable fields */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Phone size={15} style={{ color: cyanColor }} />
          <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, margin: 0 }}>معلوماتي الشخصية</h2>
        </div>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={lbl}><Phone size={11} style={{ display: "inline", marginLeft: 4 }} />رقم الهاتف</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inpSt} placeholder="أدخل رقم الهاتف" />
          </div>
          <div>
            <label style={lbl}><Mail size={11} style={{ display: "inline", marginLeft: 4 }} />البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inpSt} placeholder="أدخل البريد الإلكتروني" />
          </div>
          <div>
            <label style={lbl}><MapPin size={11} style={{ display: "inline", marginLeft: 4 }} />العنوان</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inpSt} placeholder="أدخل العنوان" />
          </div>
          <button type="submit" disabled={saving}
            style={{ padding: "10px 20px", borderRadius: 11, border: "none", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif", background: isDark ? "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(59,130,246,0.7))" : "linear-gradient(135deg, #0891b2, #1d4ed8)", color: isDark ? "#020817" : "#fff" }}>
            {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </form>
      </div>

      {/* Emergency contact (read-only) */}
      {(profile?.emergency_contact_name || profile?.emergency_contact_phone) && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Phone size={15} style={{ color: "#f59e0b" }} />
            <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, margin: 0 }}>جهة الاتصال في الطوارئ</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "الاسم", val: profile?.emergency_contact_name },
              { label: "الهاتف", val: profile?.emergency_contact_phone },
              { label: "العلاقة", val: profile?.emergency_contact_rel },
            ].filter(r => r.val).map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px solid ${inpBorder}` }}>
                <span style={{ fontSize: 11, color: textSecondary, minWidth: 60 }}>{r.label}</span>
                <span style={{ fontSize: 13, color: textPrimary, fontWeight: 500 }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <FileText size={15} style={{ color: cyanColor }} />
          <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, margin: 0 }}>وثائقي</h2>
        </div>

        <div style={{ padding: 14, borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px dashed ${cyanColor}40`, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={lbl}>نوع المستند</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}
                style={{ ...inpSt, colorScheme: isDark ? "dark" : "light" }}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          {uploadError && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{uploadError}</p>}
          <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10, border: `1px solid ${cyanColor}40`, background: "transparent", color: cyanColor, fontSize: 12, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif" }}>
            <Upload size={14} /> {uploading ? "جاري الرفع..." : "رفع مستند"}
          </button>
          <p style={{ fontSize: 10, color: textMuted, marginTop: 6 }}>PDF أو صورة — الحد الأقصى 5 ميجابايت</p>
        </div>

        {profile?.documents.length === 0 ? (
          <p style={{ fontSize: 12, color: textMuted, textAlign: "center", padding: "20px 0" }}>لا توجد وثائق مرفوعة بعد</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profile?.documents.map(doc => {
              const badge = statusBadge(doc.status);
              return (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px solid ${inpBorder}` }}>
                  <FileText size={16} style={{ color: cyanColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: textPrimary, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_name}</p>
                    <p style={{ color: textSecondary, fontSize: 10, marginTop: 2 }}>{docTypeLabel(doc.doc_type)}</p>
                  </div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, color: badge.color, background: badge.bg, whiteSpace: "nowrap", flexShrink: 0 }}>{badge.label}</span>
                  {doc.status === "pending" && (
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
