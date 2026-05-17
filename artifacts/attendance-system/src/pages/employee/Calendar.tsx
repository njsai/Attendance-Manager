import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Calendar, Loader2, Plus, List, LayoutGrid } from "lucide-react";
import { useTheme } from "@/lib/theme";

const BASE = import.meta.env.BASE_URL;
const api = (p: string) => `${BASE}api/calendar${p}`;

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_AR = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

const EVENT_TYPES = [
  { value: "holiday", label: "عطلة رسمية", color: "#f87171" },
  { value: "event",   label: "حدث شركة",    color: "#22d3ee" },
  { value: "meeting", label: "اجتماع",       color: "#a78bfa" },
];
function getTypeStyle(type: string) {
  return EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[1];
}

type CalendarEvent = { id: number; title: string; description?: string; event_type: string; start_date: string; end_date: string; color?: string; };
type LeaveEvent = { id: number; employee_name: string; start_date: string; end_date: string; leave_type: string; };

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dateStr(y: number, m: number, d: number) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }
function isInRange(date: string, start: string, end: string) { return date >= start && date <= end; }

export default function EmployeeCalendar() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(api(`?month=${month + 1}&year=${year}`), { credentials: "include" });
      const data = await res.json();
      setEvents(data.events || []);
      setLeaves(data.leaves || []);
    } catch {}
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsOnDay = (d: number) => { const ds = dateStr(year, month, d); return events.filter(e => isInRange(ds, e.start_date, e.end_date)); };
  const leavesOnDay = (d: number) => { const ds = dateStr(year, month, d); return leaves.filter(l => isInRange(ds, l.start_date, l.end_date)); };
  const selectedEvents = selectedDay ? events.filter(e => isInRange(selectedDay, e.start_date, e.end_date)) : [];
  const selectedLeaves = selectedDay ? leaves.filter(l => isInRange(selectedDay, l.start_date, l.end_date)) : [];
  const todayDs = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // List view: days with content only
  const listDays = Array.from({ length: days }, (_, i) => i + 1)
    .map(d => ({ d, ds: dateStr(year, month, d), evs: eventsOnDay(d), lvs: leavesOnDay(d) }))
    .filter(x => x.evs.length > 0 || x.lvs.length > 0);

  const bg = isDark ? "#050d1f" : "#f8fafc";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const cardBd = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";

  const MonthNav = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${cardBd}` }}>
      <button onClick={prevMonth} style={{ padding: 6, borderRadius: 8, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textPrimary, cursor: "pointer" }}><ChevronRight size={16} /></button>
      <div style={{ fontWeight: 700, color: textPrimary, fontSize: 16 }}>{MONTHS_AR[month]} {year}</div>
      <button onClick={nextMonth} style={{ padding: 6, borderRadius: 8, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textPrimary, cursor: "pointer" }}><ChevronLeft size={16} /></button>
    </div>
  );

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "'Tajawal',sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(0,245,255,0.8),rgba(59,130,246,0.8))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={20} color="#020817" />
            </div>
            <div>
              <h1 style={{ color: textPrimary, fontWeight: 700, fontSize: 20, margin: 0 }}>التقويم</h1>
              <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>الإجازات والأحداث الرسمية</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
              <button onClick={() => setViewMode("grid")} title="عرض شبكي"
                style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: viewMode === "grid" ? (isDark ? "rgba(0,245,255,0.15)" : "#fff") : "transparent", color: viewMode === "grid" ? (isDark ? "#00f5ff" : "#0891b2") : textSecondary, cursor: "pointer", boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.12)" : "none" }}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setViewMode("list")} title="عرض قائمة"
                style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: viewMode === "list" ? (isDark ? "rgba(0,245,255,0.15)" : "#fff") : "transparent", color: viewMode === "list" ? (isDark ? "#00f5ff" : "#0891b2") : textSecondary, cursor: "pointer", boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.12)" : "none" }}>
                <List size={14} />
              </button>
            </div>
            {/* Disabled add button (visible per spec, not functional for employees) */}
            <div title="إضافة الأحداث متاح للمديرين فقط" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", color: textSecondary, fontSize: 13, fontWeight: 700, cursor: "not-allowed", userSelect: "none", fontFamily: "'Tajawal',sans-serif" }}>
              <Plus size={15} /> إضافة حدث
            </div>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
            <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, overflow: "hidden" }}>
              <MonthNav />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${cardBd}` }}>
                {DAYS_AR.map(d => <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 600, color: textSecondary }}>{d}</div>)}
              </div>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
                  <Loader2 size={24} color="#00f5ff" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} style={{ minHeight: 72, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}`, borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}` }} />;
                    const ds = dateStr(year, month, day);
                    const dayEvs = eventsOnDay(day);
                    const dayLvs = leavesOnDay(day);
                    const isToday = ds === todayDs;
                    const isSelected = ds === selectedDay;
                    return (
                      <div key={i} onClick={() => setSelectedDay(isSelected ? null : ds)}
                        style={{ minHeight: 72, padding: 6, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}`, borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}`, cursor: "pointer", background: isSelected ? (isDark ? "rgba(0,245,255,0.06)" : "rgba(0,200,220,0.06)") : "transparent" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4, background: isToday ? "#00f5ff" : "transparent", color: isToday ? "#020817" : textPrimary, fontWeight: isToday ? 700 : 400, fontSize: 13 }}>{day}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {dayEvs.slice(0, 3).map(e => <div key={e.id} style={{ width: 6, height: 6, borderRadius: "50%", background: e.color || getTypeStyle(e.event_type).color }} />)}
                          {dayLvs.slice(0, 2).map(l => <div key={l.id} style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 12, padding: "10px 16px", borderTop: `1px solid ${cardBd}`, flexWrap: "wrap" }}>
                {EVENT_TYPES.map(t => <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} /><span style={{ fontSize: 11, color: textSecondary }}>{t.label}</span></div>)}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316" }} /><span style={{ fontSize: 11, color: textSecondary }}>إجازة</span></div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {selectedDay ? (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ fontWeight: 700, color: textPrimary, fontSize: 14, marginBottom: 12 }}>{selectedDay}</div>
                  {selectedEvents.length === 0 && selectedLeaves.length === 0 && <p style={{ color: textSecondary, fontSize: 12 }}>لا توجد أحداث</p>}
                  {selectedEvents.map(ev => (
                    <div key={ev.id} style={{ padding: "8px 10px", borderRadius: 10, marginBottom: 8, background: (ev.color || getTypeStyle(ev.event_type).color) + "11", border: `1px solid ${(ev.color || getTypeStyle(ev.event_type).color)}33` }}>
                      <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{ev.title}</div>
                      <div style={{ fontSize: 10, color: ev.color || getTypeStyle(ev.event_type).color, marginTop: 2 }}>{getTypeStyle(ev.event_type).label}</div>
                      {ev.description && <p style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>{ev.description}</p>}
                    </div>
                  ))}
                  {selectedLeaves.map(l => (
                    <div key={l.id} style={{ padding: "8px 10px", borderRadius: 10, marginBottom: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
                      <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{l.employee_name}</div>
                      <div style={{ fontSize: 10, color: "#f97316", marginTop: 2 }}>إجازة</div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                  <p style={{ color: textSecondary, fontSize: 13, textAlign: "center" }}>اختر يوماً لعرض أحداثه</p>
                </div>
              )}
              <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>أحداث الشهر</h3>
                {events.length === 0 && <p style={{ color: textSecondary, fontSize: 12 }}>لا توجد أحداث</p>}
                {events.slice(0, 8).map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color || getTypeStyle(ev.event_type).color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                      <div style={{ fontSize: 10, color: textSecondary }}>{ev.start_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List / Agenda view */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
            <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, overflow: "hidden" }}>
              <MonthNav />
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
                  <Loader2 size={24} color="#00f5ff" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : listDays.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <Calendar size={32} color={textSecondary} style={{ marginBottom: 8 }} />
                  <p style={{ color: textSecondary, fontSize: 14 }}>لا توجد أحداث هذا الشهر</p>
                </div>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {listDays.map(({ d, ds, evs, lvs }) => (
                    <div key={ds} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", background: ds === todayDs ? (isDark ? "rgba(0,245,255,0.04)" : "rgba(0,200,220,0.04)") : "transparent" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: ds === todayDs ? "#00f5ff" : (isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9"), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: ds === todayDs ? "#020817" : textPrimary, lineHeight: 1 }}>{d}</div>
                          <div style={{ fontSize: 9, color: ds === todayDs ? "#020817" : textSecondary }}>{DAYS_AR[new Date(ds).getDay()]}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          {evs.map(ev => (
                            <div key={ev.id} style={{ padding: "4px 10px", borderRadius: 8, marginBottom: 4, background: (ev.color || getTypeStyle(ev.event_type).color) + "15", border: `1px solid ${(ev.color || getTypeStyle(ev.event_type).color)}30` }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{ev.title}</div>
                              <div style={{ fontSize: 10, color: ev.color || getTypeStyle(ev.event_type).color }}>{getTypeStyle(ev.event_type).label}</div>
                              {ev.description && <p style={{ fontSize: 11, color: textSecondary, margin: "2px 0 0" }}>{ev.description}</p>}
                            </div>
                          ))}
                          {lvs.map(l => (
                            <div key={l.id} style={{ padding: "4px 10px", borderRadius: 8, marginBottom: 4, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{l.employee_name}</div>
                              <div style={{ fontSize: 10, color: "#f97316" }}>إجازة</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>إجماليات الشهر</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {EVENT_TYPES.map(t => {
                    const count = events.filter(e => e.event_type === t.value).length;
                    return (
                      <div key={t.value} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
                          <span style={{ fontSize: 12, color: textSecondary }}>{t.label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{count}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316" }} />
                      <span style={{ fontSize: 12, color: textSecondary }}>إجازات موافق عليها</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{leaves.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
