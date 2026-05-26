import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { User, Phone, Mail, MapPin, Upload, FileText, CheckCircle, XCircle, Trash2, AlertTriangle, History, ChevronLeft, ChevronRight, Camera, CalendarDays, Save, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── WeeklyOffCard sub-component ─────────────────────────────────────────────
const DAY_NAMES = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

interface WeeklyOffCardProps {
  isDark: boolean; textPrimary: string; textSecondary: string; card: React.CSSProperties;
  weeklyOffPending: number[]; setWeeklyOffPending: React.Dispatch<React.SetStateAction<number[]>>;
  weeklyOffDays: number[]; weeklyOffIsOverride: boolean;
  weeklyOffCompanyDays: number[];
  weeklyOffSaving: boolean; weeklyOffSaved: boolean;
  useOverride: boolean; setUseOverride: (v: boolean) => void;
  onSave: () => void;
}

function WeeklyOffCard({ isDark, textPrimary, textSecondary, card, weeklyOffPending, setWeeklyOffPending, weeklyOffDays, weeklyOffIsOverride, weeklyOffCompanyDays, weeklyOffSaving, weeklyOffSaved, useOverride, setUseOverride, onSave }: WeeklyOffCardProps) {
  const activeDays = useOverride ? weeklyOffPending : weeklyOffCompanyDays;
  const changed = useOverride
    ? JSON.stringify([...weeklyOffPending].sort()) !== JSON.stringify([...weeklyOffDays].sort())
    : weeklyOffIsOverride !== useOverride;

  return (
    <div style={{ ...card, marginTop: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CalendarDays size={15} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <p style={{ color: textPrimary, fontWeight: 700, fontSize: 13, margin: 0 }}>أيام الراحة الأسبوعية</p>
            <p style={{ color: textSecondary, fontSize: 11, margin: 0, marginTop: 2 }}>
              {useOverride ? "تخصيص خاص بهذا الموظف" : "يستخدم إعداد الشركة الافتراضي"}
            </p>
          </div>
        </div>
        <button onClick={onSave} disabled={!changed || weeklyOffSaving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "none", background: weeklyOffSaved ? "rgba(34,197,94,0.9)" : (weeklyOffSaving ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#4f46e5)"), color: "#fff", fontWeight: 700, fontSize: 12, cursor: weeklyOffSaving || !changed ? "not-allowed" : "pointer", opacity: !changed && !weeklyOffSaved ? 0.6 : 1, fontFamily: "'Tajawal','Inter',sans-serif" }}>
          {weeklyOffSaved ? <><CheckCircle size={13} /> تم الحفظ</> : weeklyOffSaving ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> حفظ...</> : <><Save size={13} /> حفظ</>}
        </button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([
          { val: false as const, label: "إعداد الشركة", desc: DAY_NAMES.filter((_, i) => weeklyOffCompanyDays.includes(i)).join("، ") || "بلا" },
          { val: true as const, label: "تخصيص للموظف", desc: "حدد أيام خاصة بهذا الموظف" },
        ] as const).map(opt => (
          <button key={String(opt.val)} onClick={() => { setUseOverride(opt.val); if (!opt.val) setWeeklyOffPending(weeklyOffCompanyDays); }}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: useOverride === opt.val ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : (isDark ? "rgba(255,255,255,0.03)" : "#f8fafc"), outline: useOverride === opt.val ? "2px solid rgba(99,102,241,0.5)" : "none", outlineOffset: 1, fontFamily: "'Tajawal','Inter',sans-serif", textAlign: "right" as const }}>
            <p style={{ fontWeight: 700, fontSize: 12, color: useOverride === opt.val ? "#818cf8" : textPrimary, margin: 0 }}>{opt.label}</p>
            <p style={{ fontSize: 10, color: textSecondary, margin: "2px 0 0" }}>{opt.desc}</p>
          </button>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {DAY_NAMES.map((name, idx) => {
          const isOff = activeDays.includes(idx);
          return (
            <button key={idx} onClick={() => { if (!useOverride) return; setWeeklyOffPending(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 2px", borderRadius: 10, border: "none", cursor: useOverride ? "pointer" : "default", background: isOff ? "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(220,38,38,0.1))" : "linear-gradient(135deg,rgba(34,197,94,0.1),rgba(16,185,129,0.07))", opacity: !useOverride && !isOff ? 0.5 : 1, transition: "all 0.15s" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isOff ? "#f87171" : "#22c55e" }}>{name}</span>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOff ? "#f87171" : "#22c55e", marginTop: 4 }} />
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 10, fontSize: 11, color: textSecondary, textAlign: "center" }}>
        أيام الراحة: <strong style={{ color: textPrimary }}>{activeDays.map(d => DAY_NAMES[d]).join("، ") || "لا يوجد"}</strong>
        {useOverride && <span style={{ marginRight: 6, color: "#818cf8" }}>• تخصيص مستقل</span>}
      </div>
    </div>
  );
}

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
  department_id: number | null;
  shift_id: number | null;
  branch_id: number | null;
  department_name: string | null;
  branch_name: string | null;
  shift_name: string | null;
  salary: number | null;
  is_active: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_rel: string | null;
  photo_data: string | null;
  created_at: string;
  documents: Doc[];
}

interface AuditLog {
  id: number;
  actor_name: string;
  target_name: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface LookupItem { id: number; name: string; }

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "id_card", label: "بطاقة الهوية" },
  { value: "passport", label: "جواز السفر" },
  { value: "certificate", label: "شهادة / وثيقة" },
  { value: "contract", label: "عقد العمل" },
  { value: "other", label: "أخرى" },
];

const ROLES = [
  { value: "employee", label: "موظف" },
  { value: "manager", label: "مدير" },
  { value: "admin", label: "مسؤول" },
];

function docTypeLabel(t: string) { return DOC_TYPES.find(d => d.value === t)?.label ?? t; }

function statusBadge(status: string) {
  if (status === "approved") return { label: "مقبول", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (status === "rejected") return { label: "مرفوض", color: "#f87171", bg: "rgba(248,113,113,0.1)" };
  return { label: "بانتظار المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
}

const ACTION_LABELS: Record<string, string> = {
  update_profile: "تعديل الملف", upload_document: "رفع مستند",
  approve_document: "قبول مستند", reject_document: "رفض مستند", delete_document: "حذف مستند",
};

const FIELD_LABELS: Record<string, string> = {
  phone: "الهاتف", email: "البريد الإلكتروني", address: "العنوان",
  full_name: "الاسم الكامل", job_title: "المسمى الوظيفي", role: "الدور",
  salary: "الراتب", is_active: "الحالة",
  department_id: "القسم", shift_id: "الوردية", branch_id: "الفرع",
  emergency_contact_name: "اسم جهة الطوارئ",
  emergency_contact_phone: "هاتف جهة الطوارئ",
  emergency_contact_rel: "علاقة جهة الطوارئ",
  doc_type: "نوع المستند", document_status: "حالة المستند", photo_data: "الصورة الشخصية",
};

type FormState = {
  full_name: string; job_title: string; email: string; phone: string;
  address: string; salary: string; is_active: boolean; role: string;
  department_id: string; shift_id: string; branch_id: string;
  emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_rel: string;
};

export default function AdminEmployeeProfile() {
  const [, params] = useRoute("/employees/:id/profile");
  const empId = params ? parseInt(params.id) : 0;
  const { dir } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const BASE = import.meta.env.BASE_URL;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<"info" | "docs" | "audit">("info");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("id_card");

  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [shifts, setShifts] = useState<LookupItem[]>([]);
  const [branches, setBranches] = useState<LookupItem[]>([]);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPages, setLogsPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  const [form, setForm] = useState<FormState>({
    phone: "", email: "", address: "", full_name: "", job_title: "",
    salary: "", is_active: true, role: "employee",
    department_id: "", shift_id: "", branch_id: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_rel: "",
  });

  // ── Weekly off days state ────────────────────────────────────────────────
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([5, 6]);
  const [weeklyOffPending, setWeeklyOffPending] = useState<number[]>([5, 6]);
  const [weeklyOffIsOverride, setWeeklyOffIsOverride] = useState(false);
  const [weeklyOffCompanyDays, setWeeklyOffCompanyDays] = useState<number[]>([5, 6]);
  const [weeklyOffSaving, setWeeklyOffSaving] = useState(false);
  const [weeklyOffSaved, setWeeklyOffSaved] = useState(false);
  const [useOverride, setUseOverride] = useState(false);

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
    if (!empId) return;
    Promise.all([
      fetch(`${BASE}api/profile/${empId}`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/departments`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/shifts`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/branches`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}api/employees/${empId}/weekly-off`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([data, depts, shiftList, branchList, weeklyOff]) => {
      setProfile(data);
      setDepartments(Array.isArray(depts) ? depts : (depts.departments ?? []));
      setShifts(Array.isArray(shiftList) ? shiftList : (shiftList.shifts ?? []));
      setBranches(Array.isArray(branchList) ? branchList : (branchList.branches ?? []));
      if (weeklyOff) {
        setWeeklyOffDays(weeklyOff.weeklyOffDays ?? [5, 6]);
        setWeeklyOffPending(weeklyOff.weeklyOffDays ?? [5, 6]);
        setWeeklyOffIsOverride(weeklyOff.isOverride ?? false);
        setWeeklyOffCompanyDays(weeklyOff.companyDays ?? [5, 6]);
        setUseOverride(weeklyOff.isOverride ?? false);
      }
      setForm({
        phone: data.phone ?? "", email: data.email ?? "", address: data.address ?? "",
        full_name: data.full_name ?? "", job_title: data.job_title ?? "",
        salary: data.salary ?? "",
        is_active: data.is_active ?? true,
        role: data.role ?? "employee",
        department_id: data.department_id ? String(data.department_id) : "",
        shift_id: data.shift_id ? String(data.shift_id) : "",
        branch_id: data.branch_id ? String(data.branch_id) : "",
        emergency_contact_name: data.emergency_contact_name ?? "",
        emergency_contact_phone: data.emergency_contact_phone ?? "",
        emergency_contact_rel: data.emergency_contact_rel ?? "",
      });
    })
      .catch(() => setError("فشل تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [empId, BASE]);

  const handleWeeklyOffSave = async () => {
    setWeeklyOffSaving(true);
    try {
      const body = useOverride
        ? { weeklyOffDays: weeklyOffPending }
        : { useCompanyDefault: true };
      const res = await fetch(`${BASE}api/employees/${empId}/weekly-off`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const saved = data.weeklyOffDays ?? (useOverride ? weeklyOffPending : weeklyOffCompanyDays);
        setWeeklyOffDays(saved);
        setWeeklyOffIsOverride(useOverride);
        setWeeklyOffSaved(true);
        setTimeout(() => setWeeklyOffSaved(false), 3000);
      }
    } finally { setWeeklyOffSaving(false); }
  };

  const fetchLogs = (page: number) => {
    setLogsLoading(true);
    fetch(`${BASE}api/audit-logs?employeeId=${empId}&page=${page}`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs ?? []);
        setLogsTotal(data.total ?? 0);
        setLogsPages(data.pages ?? 1);
      })
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    if (tab === "audit" && empId) fetchLogs(logsPage);
  }, [tab, logsPage, empId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = {
        ...form,
        salary: form.salary === "" ? null : parseFloat(String(form.salary)),
        department_id: form.department_id === "" ? null : parseInt(form.department_id),
        shift_id: form.shift_id === "" ? null : parseInt(form.shift_id),
        branch_id: form.branch_id === "" ? null : parseInt(form.branch_id),
      };
      const res = await fetch(`${BASE}api/profile/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "فشل الحفظ"); return; }
      setProfile(p => p ? { ...p, ...data } : p);
      setSuccess("تم حفظ التغييرات");
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
        const res = await fetch(`${BASE}api/profile/${empId}`, {
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

  const handleDocStatus = async (docId: number, status: "approved" | "rejected") => {
    const res = await fetch(`${BASE}api/profile/documents/${docId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(p => p ? { ...p, documents: p.documents.map(d => d.id === docId ? { ...d, status: updated.status, reviewed_at: updated.reviewed_at } : d) } : p);
      setSuccess(status === "approved" ? "تم قبول المستند" : "تم رفض المستند");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm("هل تريد حذف هذا المستند؟")) return;
    const res = await fetch(`${BASE}api/profile/documents/${docId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setProfile(p => p ? { ...p, documents: p.documents.filter(d => d.id !== docId) } : p);
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
        const res = await fetch(`${BASE}api/profile/${empId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ docType, fileName: file.name, fileData: base64, fileMime: file.type }),
        });
        const data = await res.json();
        if (!res.ok) setUploadError(data.message || "فشل الرفع");
        else {
          setProfile(p => p ? { ...p, documents: [data, ...p.documents] } : p);
          setSuccess("تم رفع المستند");
          setTimeout(() => setSuccess(""), 3000);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploadError("خطأ في الرفع"); setUploading(false); }
    if (fileRef.current) fileRef.current.value = "";
  };

  const inpSt = {
    width: "100%", padding: "9px 11px", borderRadius: 9,
    background: inpBg, border: `1px solid ${inpBorder}`,
    color: inpColor, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
    fontFamily: "'Tajawal', sans-serif",
  };
  const selSt = { ...inpSt, colorScheme: isDark ? "dark" as const : "light" as const };
  const lbl = { display: "block" as const, fontSize: 11, color: textSecondary, marginBottom: 5, fontWeight: 600 as const };
  const card = { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 18, padding: 20 };
  const initials = profile?.full_name.split(" ").slice(0, 2).map(w => w[0]).join("") ?? "?";

  const TABS = [
    { key: "info" as const, label: "الملف الشخصي", icon: <User size={14} /> },
    { key: "docs" as const, label: "الوثائق", icon: <FileText size={14} /> },
    { key: "audit" as const, label: "سجل التدقيق", icon: <History size={14} /> },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid rgba(0,245,255,0.15)`, borderTopColor: cyanColor, animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }} dir={dir}>

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

      {/* Header */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={photoUploading}
            title="تغيير الصورة الشخصية"
            style={{
              width: 60, height: 60, borderRadius: "50%", border: "none", padding: 0, cursor: "pointer",
              background: profile?.photo_data ? "none" : "linear-gradient(135deg, rgba(0,245,255,0.6), rgba(168,85,247,0.6))",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative",
            }}>
            {profile?.photo_data
              ? <img src={profile.photo_data} alt="صورة شخصية" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 20, fontWeight: 700, color: "#020817" }}>{initials}</span>}
            <div style={{
              position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
              <Camera size={16} color="#fff" />
            </div>
          </button>
          {photoUploading && (
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 1s linear infinite" }} />
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: textPrimary, fontWeight: 700, fontSize: 17, margin: 0 }}>{profile?.full_name}</p>
          <p style={{ color: textSecondary, fontSize: 12, marginTop: 3 }}>{profile?.job_title ?? "—"}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {profile?.department_name && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(0,245,255,0.08)", color: cyanColor }}>{profile.department_name}</span>}
            {profile?.branch_name && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(168,85,247,0.08)", color: "#a855f7" }}>{profile.branch_name}</span>}
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: profile?.is_active ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)", color: profile?.is_active ? "#10b981" : "#f87171" }}>
              {profile?.is_active ? "نشط" : "موقوف"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9", borderRadius: 14, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "'Tajawal', sans-serif", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              background: tab === t.key ? (isDark ? "rgba(0,245,255,0.12)" : "#ffffff") : "transparent",
              color: tab === t.key ? cyanColor : textSecondary,
              boxShadow: tab === t.key ? (isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.08)") : "none",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {tab === "info" && (
        <div style={card}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Basic info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={lbl}>الاسم الكامل</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={inpSt} />
              </div>
              <div>
                <label style={lbl}>المسمى الوظيفي</label>
                <input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} style={inpSt} />
              </div>
              <div>
                <label style={lbl}>البريد الإلكتروني</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inpSt} />
              </div>
              <div>
                <label style={lbl}>رقم الهاتف</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inpSt} />
              </div>
              <div>
                <label style={lbl}>الراتب</label>
                <input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} style={inpSt} />
              </div>
              <div>
                <label style={lbl}>الدور</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={selSt}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={lbl}>العنوان</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inpSt} />
              </div>
            </div>

            {/* Org assignment */}
            <div style={{ paddingTop: 10, borderTop: `1px solid ${inpBorder}` }}>
              <p style={{ fontSize: 12, color: cyanColor, fontWeight: 600, marginBottom: 10 }}>التعيين التنظيمي</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>القسم</label>
                  <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))} style={selSt}>
                    <option value="">— بدون —</option>
                    {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>الوردية</label>
                  <select value={form.shift_id} onChange={e => setForm(f => ({ ...f, shift_id: e.target.value }))} style={selSt}>
                    <option value="">— بدون —</option>
                    {shifts.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>الفرع</label>
                  <select value={form.branch_id} onChange={e => setForm(f => ({ ...f, branch_id: e.target.value }))} style={selSt}>
                    <option value="">— بدون —</option>
                    {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Emergency contact */}
            <div style={{ paddingTop: 10, borderTop: `1px solid ${inpBorder}` }}>
              <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginBottom: 10 }}>جهة الاتصال في الطوارئ</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>الاسم</label>
                  <input value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} style={inpSt} />
                </div>
                <div>
                  <label style={lbl}>الهاتف</label>
                  <input value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} style={inpSt} />
                </div>
                <div>
                  <label style={lbl}>العلاقة</label>
                  <input value={form.emergency_contact_rel} onChange={e => setForm(f => ({ ...f, emergency_contact_rel: e.target.value }))} style={inpSt} />
                </div>
              </div>
            </div>

            {/* Active toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: textSecondary, fontWeight: 600 }}>الحالة</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: form.is_active ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)", color: form.is_active ? "#10b981" : "#f87171", fontFamily: "'Tajawal', sans-serif" }}>
                {form.is_active ? "نشط" : "موقوف"}
              </button>
            </div>

            <button type="submit" disabled={saving}
              style={{ padding: "10px", borderRadius: 11, border: "none", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Tajawal', sans-serif", background: isDark ? "linear-gradient(135deg, rgba(0,245,255,0.7), rgba(59,130,246,0.7))" : "linear-gradient(135deg, #0891b2, #1d4ed8)", color: isDark ? "#020817" : "#fff" }}>
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        </div>

      )}

      {tab === "info" && (
        <WeeklyOffCard
          isDark={isDark} textPrimary={textPrimary} textSecondary={textSecondary} card={card}
          weeklyOffPending={weeklyOffPending} setWeeklyOffPending={setWeeklyOffPending}
          weeklyOffDays={weeklyOffDays} weeklyOffIsOverride={weeklyOffIsOverride}
          weeklyOffCompanyDays={weeklyOffCompanyDays}
          weeklyOffSaving={weeklyOffSaving} weeklyOffSaved={weeklyOffSaved}
          useOverride={useOverride} setUseOverride={setUseOverride}
          onSave={handleWeeklyOffSave}
        />
      )}

      {/* Documents tab */}
      {tab === "docs" && (
        <div style={card}>
          <div style={{ padding: 14, borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px dashed ${cyanColor}40`, marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>نوع المستند</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} style={selSt}>
                  {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
            {uploadError && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{uploadError}</p>}
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, border: `1px solid ${cyanColor}40`, background: "transparent", color: cyanColor, fontSize: 12, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "'Tajawal', sans-serif" }}>
              <Upload size={14} /> {uploading ? "جاري الرفع..." : "رفع مستند"}
            </button>
          </div>

          {profile?.documents.length === 0 ? (
            <p style={{ fontSize: 12, color: textMuted, textAlign: "center", padding: "20px 0" }}>لا توجد وثائق</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile?.documents.map(doc => {
                const badge = statusBadge(doc.status);
                return (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px solid ${inpBorder}` }}>
                    <FileText size={16} style={{ color: cyanColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: textPrimary, fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_name}</p>
                      <p style={{ color: textSecondary, fontSize: 10, marginTop: 2 }}>{docTypeLabel(doc.doc_type)} · {new Date(doc.uploaded_at).toLocaleDateString("ar-IQ")}</p>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, color: badge.color, background: badge.bg, whiteSpace: "nowrap", flexShrink: 0 }}>{badge.label}</span>
                    {doc.status === "pending" && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleDocStatus(doc.id, "approved")}
                          style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.12)", color: "#10b981", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Tajawal', sans-serif" }}>
                          قبول
                        </button>
                        <button onClick={() => handleDocStatus(doc.id, "rejected")}
                          style={{ padding: "4px 8px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.12)", color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "'Tajawal', sans-serif" }}>
                          رفض
                        </button>
                      </div>
                    )}
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.25)" : "#94a3b8", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {tab === "audit" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <History size={15} style={{ color: cyanColor }} />
            <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, margin: 0 }}>سجل التدقيق ({logsTotal})</h2>
          </div>

          {logsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid rgba(0,245,255,0.15)`, borderTopColor: cyanColor, animation: "spin 1s linear infinite" }} />
            </div>
          ) : logs.length === 0 ? (
            <p style={{ fontSize: 12, color: textMuted, textAlign: "center", padding: "24px 0" }}>لا توجد سجلات تدقيق</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {logs.map(log => (
                <div key={log.id} style={{ padding: "10px 14px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "#f8fafc", border: `1px solid ${inpBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(0,245,255,0.08)", color: cyanColor, fontWeight: 600 }}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span style={{ fontSize: 11, color: textPrimary, fontWeight: 600 }}>{log.actor_name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: textMuted }}>{new Date(log.created_at).toLocaleString("ar-IQ")}</span>
                  </div>
                  {log.field && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: textSecondary }}>
                      <span>{FIELD_LABELS[log.field] ?? log.field}:</span>
                      {log.old_value && <span style={{ color: "#f87171", textDecoration: "line-through" }}>{log.old_value}</span>}
                      {log.old_value && log.new_value && <span style={{ color: textMuted }}>←</span>}
                      {log.new_value && log.field !== "photo_data" && <span style={{ color: "#10b981" }}>{log.new_value}</span>}
                      {log.field === "photo_data" && log.new_value && <span style={{ color: "#10b981" }}>تم التحديث</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {logsPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 16 }}>
              <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage === 1}
                style={{ background: "none", border: "none", color: logsPage === 1 ? textMuted : cyanColor, cursor: logsPage === 1 ? "not-allowed" : "pointer" }}>
                <ChevronRight size={16} />
              </button>
              <span style={{ fontSize: 12, color: textSecondary }}>{logsPage} / {logsPages}</span>
              <button onClick={() => setLogsPage(p => Math.min(logsPages, p + 1))} disabled={logsPage === logsPages}
                style={{ background: "none", border: "none", color: logsPage === logsPages ? textMuted : cyanColor, cursor: logsPage === logsPages ? "not-allowed" : "pointer" }}>
                <ChevronLeft size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
