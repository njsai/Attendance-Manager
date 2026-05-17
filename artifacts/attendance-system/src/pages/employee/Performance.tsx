import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Star } from "lucide-react";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const CRITERIA = [
  { key: "commitment",  label: "الالتزام",  color: "#00f5ff" },
  { key: "performance", label: "الأداء",    color: "#a855f7" },
  { key: "cooperation", label: "التعاون",   color: "#34d399" },
  { key: "achievement", label: "الإنجاز",   color: "#f59e0b" },
  { key: "behavior",    label: "السلوك",    color: "#f87171" },
] as const;
const SCORE_COLORS = ["", "#f87171", "#f97316", "#fbbf24", "#34d399", "#00f5ff"];
const SCORE_LABELS = ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];

type Review = {
  id: number; period_type: string; period_month?: number; period_year: number;
  commitment: number; performance: number; cooperation: number; achievement: number; behavior: number;
  overall_score: number; comments?: string; reviewer_name?: string; created_at: string;
};

function RadarChart({ review, isDark }: { review: Review; isDark: boolean }) {
  const values = CRITERIA.map(c => review[c.key]);
  const size = 160;
  const cx = size / 2, cy = size / 2, r = 60;
  const n = 5;
  const angleStep = (Math.PI * 2) / n;
  const getPoint = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };
  const gridLevels = [1, 2, 3, 4, 5];
  const textSecondary = isDark ? "rgba(255,255,255,0.3)" : "#94a3b8";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map(level => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, (r * level) / 5));
        return <polygon key={level} points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={textSecondary} strokeWidth={0.5} strokeOpacity={0.4} />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const pt = getPoint(i, r);
        return <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke={textSecondary} strokeWidth={0.5} strokeOpacity={0.4} />;
      })}
      <polygon
        points={values.map((v, i) => { const pt = getPoint(i, (r * v) / 5); return `${pt.x},${pt.y}`; }).join(" ")}
        fill="rgba(168,85,247,0.25)"
        stroke="#a855f7"
        strokeWidth={1.5}
      />
      {values.map((v, i) => {
        const pt = getPoint(i, (r * v) / 5);
        return <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={CRITERIA[i].color} />;
      })}
      {CRITERIA.map((c, i) => {
        const pt = getPoint(i, r + 16);
        return <text key={i} x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill={textSecondary} fontFamily="Tajawal">{c.label}</text>;
      })}
    </svg>
  );
}

export default function EmployeePerformance() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}api/performance`, { credentials: "include" })
      .then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const bg = isDark ? "#050d1f" : "#f8fafc";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const cardBd = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";

  const latest = reviews[0];
  const previous = reviews[1];

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "'Tajawal',sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(168,85,247,0.8),rgba(59,130,246,0.8))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: textPrimary, fontWeight: 700, fontSize: 20, margin: 0 }}>تقييم أدائي</h1>
            <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>تاريخ تقييمات الأداء الخاصة بك</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
            <Loader2 size={28} color="#a855f7" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <TrendingUp size={32} color={textSecondary} style={{ marginBottom: 8 }} />
            <p style={{ color: textSecondary, fontSize: 14 }}>لا توجد تقييمات حتى الآن</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Latest review spotlight */}
            {latest && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: cardBg, border: `1px solid ${isDark ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.15)"}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#a855f7", fontWeight: 600, marginBottom: 4 }}>
                      {latest.period_type === "monthly" && latest.period_month ? `${MONTHS_AR[latest.period_month - 1]} ${latest.period_year}` : `سنوي ${latest.period_year}`}
                    </div>
                    <div style={{ fontSize: 12, color: textSecondary }}>آخر تقييم</div>
                  </div>
                  <div style={{ textAlign: "end" }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: SCORE_COLORS[Math.round(latest.overall_score)] || "#fbbf24", lineHeight: 1 }}>{(latest.overall_score || 0).toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: textSecondary }}>{SCORE_LABELS[Math.round(latest.overall_score)] || ""} / 5</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
                  <RadarChart review={latest} isDark={isDark} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {CRITERIA.map(c => (
                      <div key={c.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: textSecondary }}>{c.label}</span>
                          <div style={{ display: "flex", gap: 2 }}>
                            {[1,2,3,4,5].map(n => <Star key={n} size={12} fill={n <= latest[c.key] ? c.color : "none"} color={n <= latest[c.key] ? c.color : textSecondary} />)}
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", overflow: "hidden" }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(latest[c.key] / 5) * 100}%` }} transition={{ duration: 0.6, delay: 0.1 }}
                            style={{ height: "100%", borderRadius: 3, background: c.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {latest.comments && (
                  <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: isDark ? "rgba(168,85,247,0.06)" : "rgba(168,85,247,0.04)", border: `1px solid ${isDark ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.1)"}` }}>
                    <div style={{ fontSize: 10, color: "#a855f7", marginBottom: 4 }}>ملاحظات المقيِّم</div>
                    <p style={{ fontSize: 13, color: textPrimary }}>{latest.comments}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Historical list */}
            {reviews.length > 1 && (
              <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBd}`, fontWeight: 700, color: textPrimary, fontSize: 14 }}>
                  سجل التقييمات ({reviews.length})
                </div>
                {reviews.map((r, idx) => {
                  const overallColor = SCORE_COLORS[Math.round(r.overall_score)] || "#fbbf24";
                  return (
                    <div key={r.id} style={{ padding: "12px 16px", borderBottom: idx < reviews.length - 1 ? `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                          {r.period_type === "monthly" && r.period_month ? `${MONTHS_AR[r.period_month - 1]} ${r.period_year}` : `سنوي ${r.period_year}`}
                        </div>
                        <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                          {CRITERIA.map(c => `${c.label}: ${r[c.key]}`).join(" · ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "end" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: overallColor }}>{(r.overall_score || 0).toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: textSecondary }}>{SCORE_LABELS[Math.round(r.overall_score)]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trend comparison */}
            {latest && previous && (
              <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                <div style={{ fontWeight: 700, color: textPrimary, fontSize: 14, marginBottom: 12 }}>مقارنة آخر تقييمين</div>
                {CRITERIA.map(c => {
                  const diff = latest[c.key] - previous[c.key];
                  return (
                    <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: textSecondary, width: 70, flexShrink: 0 }}>{c.label}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(latest[c.key] / 5) * 100}%`, borderRadius: 3, background: c.color }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: diff > 0 ? "#34d399" : diff < 0 ? "#f87171" : textSecondary, minWidth: 28 }}>
                        {diff > 0 ? `+${diff}` : diff === 0 ? "=" : diff}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
