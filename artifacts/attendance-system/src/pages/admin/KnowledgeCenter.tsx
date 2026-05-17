import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Upload, X, Trash2, Search, Loader2, FileText, File, Image, Download, Edit2, Link } from "lucide-react";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const api = (p: string) => `${BASE}api/knowledge${p}`;

const CATEGORIES = ["عام", "سياسات", "لوائح", "إجراءات", "نماذج", "أخرى"];

type Doc = {
  id: number; title: string; category: string; file_name: string | null;
  file_type: string | null; file_size: number; file_url: string | null;
  created_at: string; uploaded_by_name?: string;
};

function FileIcon({ type, isUrl, size = 20 }: { type: string | null; isUrl?: boolean; size?: number }) {
  if (isUrl) return <Link size={size} />;
  if (!type) return <File size={size} />;
  if (type.includes("image")) return <Image size={size} />;
  if (type.includes("pdf")) return <FileText size={size} />;
  return <File size={size} />;
}

function fmtSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminKnowledgeCenter() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [form, setForm] = useState({ title: "", category: "عام", url: "" });
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size: number; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [renameDoc, setRenameDoc] = useState<Doc | null>(null);
  const [renameForm, setRenameForm] = useState({ title: "", category: "عام" });
  const [renameSaving, setRenameSaving] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(api(`?${params}`), { credentials: "include" });
      setDocs(await res.json());
    } catch {}
    setLoading(false);
  }, [search, categoryFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("حجم الملف يتجاوز 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileInfo({ name: file.name, type: file.type, size: file.size, data: ev.target?.result as string });
      if (!form.title) setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
    };
    reader.readAsDataURL(file);
  };

  const closeModal = () => {
    setShowModal(false);
    setFileInfo(null);
    setForm({ title: "", category: "عام", url: "" });
    setUploadMode("file");
  };

  const save = async () => {
    if (!form.title) return;
    if (uploadMode === "file" && !fileInfo) return;
    if (uploadMode === "url" && !form.url) return;
    setSaving(true);
    try {
      const body = uploadMode === "url"
        ? { title: form.title, category: form.category, file_url: form.url }
        : { title: form.title, category: form.category, file_name: fileInfo!.name, file_type: fileInfo!.type, file_data: fileInfo!.data, file_size: fileInfo!.size };
      await fetch(api(""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      closeModal();
      fetchDocs();
    } catch {}
    setSaving(false);
  };

  const remove = async (id: number) => {
    await fetch(api(`/${id}`), { method: "DELETE", credentials: "include" });
    setDeleteId(null);
    fetchDocs();
  };

  const openRename = (doc: Doc) => {
    setRenameDoc(doc);
    setRenameForm({ title: doc.title, category: doc.category });
  };

  const saveRename = async () => {
    if (!renameDoc || !renameForm.title) return;
    setRenameSaving(true);
    try {
      await fetch(api(`/${renameDoc.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(renameForm),
      });
      setRenameDoc(null);
      fetchDocs();
    } catch {}
    setRenameSaving(false);
  };

  const openDoc = async (doc: Doc) => {
    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
      return;
    }
    setDownloading(doc.id);
    try {
      const res = await fetch(api(`/${doc.id}/download`), { credentials: "include" });
      const data = await res.json();
      if (data.file_url) {
        window.open(data.file_url, "_blank", "noopener,noreferrer");
      } else {
        const link = document.createElement("a");
        link.href = data.file_data;
        link.download = data.file_name;
        link.click();
      }
    } catch {}
    setDownloading(null);
  };

  const bg = isDark ? "#050d1f" : "#f8fafc";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const cardBd = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const inputSt: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1"}`, color: textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: isDark ? "dark" : "light", fontFamily: "'Tajawal',sans-serif" };
  const tabBase: React.CSSProperties = { flex: 1, padding: "7px 0", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", transition: "all 0.15s" };

  const canSave = form.title && (uploadMode === "file" ? !!fileInfo : !!form.url);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "'Tajawal',sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(16,185,129,0.8),rgba(59,130,246,0.8))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ color: textPrimary, fontWeight: 700, fontSize: 20, margin: 0 }}>مركز المعرفة</h1>
              <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>السياسات واللوائح والوثائق الداخلية</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,rgba(16,185,129,0.8),rgba(59,130,246,0.8))", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            <Upload size={15} /> إضافة وثيقة
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1"}`, borderRadius: 9, padding: "7px 12px" }}>
            <Search size={14} color={textSecondary} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الوثائق..." style={{ background: "none", border: "none", outline: "none", color: textPrimary, fontSize: 13, flex: 1, fontFamily: "'Tajawal',sans-serif" }} />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputSt, width: "auto", minWidth: 130 }}>
            <option value="">جميع الفئات</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Docs grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader2 size={28} color="#10b981" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : docs.length === 0 ? (
          <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <BookOpen size={32} color={textSecondary} style={{ marginBottom: 8 }} />
            <p style={{ color: textSecondary, fontSize: 14 }}>لا توجد وثائق بعد</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {docs.map(doc => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: doc.file_url ? "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(168,85,247,0.15))" : "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(59,130,246,0.15))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: doc.file_url ? "#818cf8" : "#10b981" }}>
                    <FileIcon type={doc.file_type} isUrl={!!doc.file_url} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textPrimary, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: "#10b981", marginTop: 2 }}>{doc.category}</div>
                  </div>
                </div>
                {doc.file_url ? (
                  <div style={{ fontSize: 11, color: "#818cf8", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_url}</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: textSecondary, marginBottom: 2 }}>{doc.file_name}</div>
                    <div style={{ fontSize: 10, color: textSecondary, marginBottom: 12 }}>{fmtSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("ar-IQ")}</div>
                  </>
                )}
                {!doc.file_url && <div style={{ fontSize: 10, color: textSecondary, marginBottom: doc.uploaded_by_name ? 10 : 12 }}>{new Date(doc.created_at).toLocaleDateString("ar-IQ")}</div>}
                {doc.uploaded_by_name && <div style={{ fontSize: 10, color: textSecondary, marginBottom: 10 }}>رُفع بواسطة: {doc.uploaded_by_name}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openDoc(doc)} disabled={downloading === doc.id}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, border: "none", background: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    {downloading === doc.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : doc.file_url ? <Link size={12} /> : <Download size={12} />}
                    {doc.file_url ? "فتح الرابط" : "تحميل"}
                  </button>
                  <button onClick={() => openRename(doc)}
                    style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.08)", color: isDark ? "#00f5ff" : "#0891b2", cursor: "pointer" }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => setDeleteId(doc.id)}
                    style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: isDark ? "rgba(248,113,113,0.1)" : "rgba(248,113,113,0.08)", color: "#f87171", cursor: "pointer" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add document modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: isDark ? "rgba(5,13,31,0.98)" : "#fff", border: `1px solid ${isDark ? "rgba(16,185,129,0.2)" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 440 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
                <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 15, margin: 0 }}>إضافة وثيقة جديدة</h2>
                <button onClick={closeModal} style={{ padding: 6, border: "none", background: "none", color: textSecondary, cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Mode tabs */}
                <div style={{ display: "flex", gap: 6, background: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9", borderRadius: 10, padding: 4 }}>
                  <button onClick={() => setUploadMode("file")} style={{ ...tabBase, background: uploadMode === "file" ? (isDark ? "rgba(16,185,129,0.15)" : "#fff") : "transparent", color: uploadMode === "file" ? "#10b981" : textSecondary, boxShadow: uploadMode === "file" ? "0 1px 4px rgba(0,0,0,0.12)" : "none" }}>
                    <Upload size={13} style={{ display: "inline", marginLeft: 5 }} />
                    رفع ملف
                  </button>
                  <button onClick={() => setUploadMode("url")} style={{ ...tabBase, background: uploadMode === "url" ? (isDark ? "rgba(99,102,241,0.15)" : "#fff") : "transparent", color: uploadMode === "url" ? "#818cf8" : textSecondary, boxShadow: uploadMode === "url" ? "0 1px 4px rgba(0,0,0,0.12)" : "none" }}>
                    <Link size={13} style={{ display: "inline", marginLeft: 5 }} />
                    رابط خارجي
                  </button>
                </div>

                {uploadMode === "file" ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.4)"}`, borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", background: isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.03)" }}>
                    {fileInfo ? (
                      <>
                        <div style={{ color: "#10b981", marginBottom: 4 }}><FileIcon type={fileInfo.type} size={28} /></div>
                        <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{fileInfo.name}</div>
                        <div style={{ fontSize: 11, color: textSecondary }}>{fmtSize(fileInfo.size)}</div>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color="#10b981" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>اضغط لرفع ملف</div>
                        <div style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>PDF, DOC, صور — حتى 10MB</div>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt" onChange={handleFile} style={{ display: "none" }} />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>الرابط الخارجي *</label>
                    <input
                      value={form.url}
                      onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                      style={inputSt}
                      placeholder="https://example.com/document.pdf"
                      dir="ltr"
                    />
                    <div style={{ fontSize: 10, color: textSecondary, marginTop: 4 }}>رابط لمستند خارجي أو صفحة ويب</div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>العنوان *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputSt} placeholder="عنوان الوثيقة" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>الفئة</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputSt}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={closeModal} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textSecondary, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>
                  <button onClick={save} disabled={saving || !canSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", background: uploadMode === "url" ? "linear-gradient(135deg,rgba(99,102,241,0.8),rgba(168,85,247,0.8))" : "linear-gradient(135deg,rgba(16,185,129,0.8),rgba(59,130,246,0.8))", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif", opacity: !canSave ? 0.5 : 1 }}>
                    {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : uploadMode === "url" ? <Link size={14} /> : <Upload size={14} />}
                    {uploadMode === "url" ? "حفظ الرابط" : "رفع"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename modal */}
      <AnimatePresence>
        {renameDoc && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: isDark ? "rgba(5,13,31,0.98)" : "#fff", border: `1px solid ${isDark ? "rgba(0,245,255,0.2)" : "#e2e8f0"}`, borderRadius: 18, width: "100%", maxWidth: 400 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
                <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 15, margin: 0 }}>تعديل الوثيقة</h2>
                <button onClick={() => setRenameDoc(null)} style={{ padding: 6, border: "none", background: "none", color: textSecondary, cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>العنوان *</label>
                  <input value={renameForm.title} onChange={e => setRenameForm(f => ({ ...f, title: e.target.value }))} style={inputSt} placeholder="عنوان الوثيقة" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>الفئة</label>
                  <select value={renameForm.category} onChange={e => setRenameForm(f => ({ ...f, category: e.target.value }))} style={inputSt}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setRenameDoc(null)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textSecondary, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>
                  <button onClick={saveRename} disabled={renameSaving || !renameForm.title} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,rgba(0,245,255,0.8),rgba(59,130,246,0.8))", color: "#020817", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    {renameSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Edit2 size={14} />}
                    حفظ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId !== null && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} dir="rtl">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: isDark ? "rgba(5,13,31,0.98)" : "#fff", border: `1px solid ${cardBd}`, borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", textAlign: "center" }}>
              <h3 style={{ color: textPrimary, marginBottom: 8 }}>حذف الوثيقة؟</h3>
              <p style={{ color: textSecondary, fontSize: 13, marginBottom: 20 }}>لا يمكن التراجع عن هذا الإجراء.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setDeleteId(null)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textSecondary, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>
                <button onClick={() => remove(deleteId!)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "rgba(248,113,113,0.15)", color: "#f87171", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>حذف</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
