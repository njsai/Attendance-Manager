import { useState, useEffect, useCallback } from "react";
import { Star, Plus, Edit2, Trash2, RefreshCw, X, Save, AlertCircle, CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

interface Holiday {
  id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  notes: string | null;
}

interface HolidayFormProps {
  initial?: Partial<Holiday>;
  onSave: (data: Omit<Holiday, "id">) => Promise<void>;
  onClose: () => void;
  isDark: boolean;
}

function HolidayForm({ initial, onSave, onClose, isDark }: HolidayFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [recurring, setRecurring] = useState(initial?.is_recurring ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bg = isDark ? "rgba(10,12,28,0.98)" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const inputBg = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";
  const inputColor = isDark ? "#fff" : "#0f172a";
  const labelColor = isDark ? "rgba(255,255,255,0.5)" : "#64748b";
  const textColor = isDark ? "#fff" : "#0f172a";

  const handleSubmit = async () => {
    if (!name.trim()) { setError("اسم العطلة مطلوب"); return; }
    if (!date) { setError("تاريخ العطلة مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), date, is_recurring: recurring, notes: notes.trim() || null });
      onClose();
    } catch (e: any) {
      setError(e.message || "خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: inputBg, border: `1px solid ${border}`,
    color: inputColor, fontSize: 13, outline: "none",
    fontFamily: "'Tajawal','Inter',sans-serif",
    boxSizing: "border-box" as const,
    colorScheme: isDark ? "dark" as const : "light" as const,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }} dir="rtl">
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 22, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Star size={18} style={{ color: "#f59e0b" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: textColor }}>
              {initial?.id ? t("editHoliday") : t("addHoliday")}
            </span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9", color: labelColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={15} />
          </button>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: labelColor, marginBottom: 6 }}>{t("holidayName")} *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: عيد الأضحى" style={fieldStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: labelColor, marginBottom: 6 }}>{t("holidayDate")} *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.04)", border: `1px solid ${isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.2)"}`, cursor: "pointer" }} onClick={() => setRecurring(r => !r)}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: recurring ? "#f59e0b" : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"), position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, right: recurring ? 2 : 18, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "right 0.2s" }} />
            </div>
            <span style={{ fontSize: 13, color: textColor, fontWeight: 500 }}>{t("holidayRecurring")}</span>
            <span style={{ fontSize: 11, color: labelColor, marginRight: "auto" }}>(تتكرر نفس اليوم والشهر كل عام)</span>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: labelColor, marginBottom: 6 }}>{t("holidayNotes")}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="ملاحظات اختيارية..." style={{ ...fieldStyle, resize: "none" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: saving ? "rgba(245,158,11,0.4)" : "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Tajawal','Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {saving ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
            {saving ? "جاري الحفظ..." : t("save")}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${border}`, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", color: labelColor, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal','Inter',sans-serif" }}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminHolidays() {
  const { t, dir } = useI18n();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const BASE = import.meta.env.BASE_URL;

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Holiday | null>(null);
  const [toast, setToast] = useState("");

  const bg = isDark ? "rgba(2,8,23,0.6)" : "#fff";
  const border = isDark ? "rgba(0,245,255,0.08)" : "#e2e8f0";
  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textMuted = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const cyan = isDark ? "#00f5ff" : "#0891b2";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}api/holidays`, { credentials: "include" });
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch { /* keep */ }
    finally { setLoading(false); }
  }, [BASE]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const handleSave = async (data: Omit<Holiday, "id">) => {
    const url = editItem ? `${BASE}api/holidays/${editItem.id}` : `${BASE}api/holidays`;
    const res = await fetch(url, {
      method: editItem ? "PUT" : "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, date: data.date, isRecurring: data.is_recurring, notes: data.notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "خطأ في الحفظ");
    }
    const saved = await res.json();
    if (editItem) {
      setHolidays(h => h.map(x => x.id === editItem.id ? saved : x));
      showToast("✓ تم تحديث العطلة");
    } else {
      setHolidays(h => [...h, saved].sort((a, b) => a.date.localeCompare(b.date)));
      showToast("✓ تمت إضافة العطلة");
    }
    setEditItem(null);
  };

  const handleDelete = async (h: Holiday) => {
    if (!confirm(`${t("holidayDeleteConfirm")}\n"${h.name}"`)) return;
    const res = await fetch(`${BASE}api/holidays/${h.id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setHolidays(list => list.filter(x => x.id !== h.id));
      showToast("✓ تم حذف العطلة");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    } catch { return dateStr; }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = holidays.filter(h => h.date >= today);
  const past = holidays.filter(h => h.date < today);

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }} dir={dir}>
      {showForm || editItem ? (
        <HolidayForm
          initial={editItem ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          isDark={isDark}
        />
      ) : null}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, insetInlineEnd: 24, padding: "10px 20px", borderRadius: 14, fontSize: 13, fontWeight: 700, zIndex: 9999, background: toast.startsWith("✓") ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)", color: "#fff", backdropFilter: "blur(12px)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={22} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1 style={{ color: textPrimary, fontWeight: 800, fontSize: 18, margin: 0 }}>{t("publicHolidays")}</h1>
            <p style={{ color: textMuted, fontSize: 12, margin: 0, marginTop: 2 }}>
              {holidays.length} عطلة مسجّلة — الموظفون لا يستطيعون تسجيل الحضور في هذه الأيام
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal','Inter',sans-serif" }}
        >
          <Plus size={16} /> {t("addHoliday")}
        </button>
      </div>

      {/* Info banner */}
      <div style={{ padding: "12px 16px", borderRadius: 14, background: isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.05)", border: `1px solid ${isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.2)"}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
        <AlertCircle size={16} style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.6)" : "#475569", lineHeight: 1.7 }}>
          <strong style={{ color: "#f59e0b" }}>قاعدة العطل الرسمية:</strong> في أيام العطل المسجّلة، يُمنع الموظفون والمشرفون من تسجيل الحضور تلقائياً.
          فقط مدير الشركة يستطيع تسجيل الحضور في هذه الأيام إذا دعت الضرورة.
          العطل المتكررة تُطبَّق تلقائياً كل سنة في نفس اليوم والشهر.
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(245,158,11,0.2)" : "#fde68a"}`, borderTopColor: "#f59e0b", animation: "spin 1s linear infinite" }} />
        </div>
      ) : holidays.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: cardBg, borderRadius: 16, border: `1px solid ${border}` }}>
          <CalendarDays size={48} style={{ color: textMuted, marginBottom: 12 }} />
          <p style={{ color: textMuted, fontSize: 14 }}>{t("noHolidays")}</p>
          <button onClick={() => setShowForm(true)} style={{ marginTop: 16, padding: "9px 20px", borderRadius: 10, border: "none", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal','Inter',sans-serif" }}>
            + {t("addHoliday")}
          </button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title="العطل القادمة" count={upcoming.length} icon="🎉" isDark={isDark} textPrimary={textPrimary} textMuted={textMuted} border={border}>
              {upcoming.map(h => (
                <HolidayCard key={h.id} holiday={h} formatDate={formatDate} onEdit={() => { setEditItem(h); setShowForm(false); }} onDelete={() => handleDelete(h)} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted} border={border} cardBg={cardBg} cyan={cyan} />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="العطل السابقة" count={past.length} icon="📅" isDark={isDark} textPrimary={textPrimary} textMuted={textMuted} border={border}>
              {past.map(h => (
                <HolidayCard key={h.id} holiday={h} formatDate={formatDate} onEdit={() => { setEditItem(h); setShowForm(false); }} onDelete={() => handleDelete(h)} isDark={isDark} textPrimary={textPrimary} textMuted={textMuted} border={border} cardBg={isDark ? "rgba(255,255,255,0.015)" : "#f1f5f9"} cyan={cyan} faded />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, count, icon, isDark, textPrimary, textMuted, border, children }: any) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>{title}</span>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textMuted }}>{count}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function HolidayCard({ holiday, formatDate, onEdit, onDelete, isDark, textPrimary, textMuted, border, cardBg, cyan, faded }: any) {
  const isToday = holiday.date === new Date().toISOString().split("T")[0];
  return (
    <div style={{ background: cardBg, border: `1px solid ${isToday ? "rgba(245,158,11,0.4)" : border}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, opacity: faded ? 0.65 : 1, boxShadow: isToday ? "0 0 0 1px rgba(245,158,11,0.2)" : "none" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: isToday ? "rgba(245,158,11,0.2)" : (isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)"), border: `1px solid ${isToday ? "rgba(245,158,11,0.4)" : "rgba(245,158,11,0.15)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>{new Date(holiday.date + "T00:00:00").getDate()}</span>
        <span style={{ fontSize: 9, color: "#f59e0b", opacity: 0.8 }}>{new Date(holiday.date + "T00:00:00").toLocaleDateString("ar", { month: "short" })}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>{holiday.name}</span>
          {isToday && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.2)", color: "#f59e0b", fontWeight: 700 }}>اليوم</span>}
          {holiday.is_recurring && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: isDark ? "rgba(0,245,255,0.1)" : "rgba(8,145,178,0.08)", color: cyan, fontWeight: 600 }}>🔄 سنوية</span>}
        </div>
        <p style={{ color: textMuted, fontSize: 12, margin: "3px 0 0" }}>{formatDate(holiday.date)}</p>
        {holiday.notes && <p style={{ color: textMuted, fontSize: 11, margin: "2px 0 0", opacity: 0.7 }}>{holiday.notes}</p>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${isDark ? "rgba(0,245,255,0.15)" : "#e2e8f0"}`, background: isDark ? "rgba(0,245,255,0.06)" : "rgba(8,145,178,0.05)", color: cyan, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.06)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
