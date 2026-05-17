import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Loader2, FileText, File, Image, Download, Link } from "lucide-react";
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

export default function EmployeeKnowledgeCenter() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);

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
  const inputSt: React.CSSProperties = { padding: "8px 11px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1"}`, color: textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: isDark ? "dark" : "light", fontFamily: "'Tajawal',sans-serif" };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "'Tajawal',sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(16,185,129,0.8),rgba(59,130,246,0.8))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: textPrimary, fontWeight: 700, fontSize: 20, margin: 0 }}>مركز المعرفة</h1>
            <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>الوثائق والسياسات الرسمية للشركة</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1"}`, borderRadius: 9, padding: "7px 12px" }}>
            <Search size={14} color={textSecondary} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث في الوثائق..." style={{ background: "none", border: "none", outline: "none", color: textPrimary, fontSize: 13, flex: 1, fontFamily: "'Tajawal',sans-serif" }} />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...inputSt, minWidth: 130 }}>
            <option value="">جميع الفئات</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button onClick={() => setCategoryFilter("")}
            style={{ padding: "5px 14px", borderRadius: 20, border: "none", background: categoryFilter === "" ? (isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)") : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"), color: categoryFilter === "" ? "#10b981" : textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
            الكل
          </button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategoryFilter(categoryFilter === c ? "" : c)}
              style={{ padding: "5px 14px", borderRadius: 20, border: "none", background: categoryFilter === c ? (isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.1)") : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"), color: categoryFilter === c ? "#10b981" : textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader2 size={28} color="#10b981" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : docs.length === 0 ? (
          <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <BookOpen size={32} color={textSecondary} style={{ marginBottom: 8 }} />
            <p style={{ color: textSecondary, fontSize: 14 }}>لا توجد وثائق متاحة</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {docs.map(doc => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: doc.file_url ? "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.15))" : "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(59,130,246,0.15))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: doc.file_url ? "#818cf8" : "#10b981" }}>
                    <FileIcon type={doc.file_type} isUrl={!!doc.file_url} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textPrimary, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: "#10b981", marginTop: 2 }}>{doc.category}</div>
                  </div>
                </div>
                {doc.file_url ? (
                  <div style={{ fontSize: 10, color: "#818cf8", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.file_url}</div>
                ) : (
                  <div style={{ fontSize: 10, color: textSecondary, marginBottom: 12 }}>{fmtSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("ar-IQ")}</div>
                )}
                <button onClick={() => openDoc(doc)} disabled={downloading === doc.id}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0", borderRadius: 8, border: "none", background: doc.file_url ? (isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.08)") : (isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)"), color: doc.file_url ? "#818cf8" : "#10b981", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                  {downloading === doc.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : doc.file_url ? <Link size={12} /> : <Download size={12} />}
                  {doc.file_url ? "فتح الرابط" : "تحميل"}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
