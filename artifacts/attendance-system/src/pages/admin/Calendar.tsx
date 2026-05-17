import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Plus, X, Edit2, Trash2, Calendar, Loader2, List, LayoutGrid } from "lucide-react";
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

type CalendarEvent = {
  id: number; title: string; description?: string; event_type: string;
  start_date: string; end_date: string; color?: string; created_by_name?: string;
};
type LeaveEvent = {
  id: number; employee_name: string; start_date: string; end_date: string; leave_type: string;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function isInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

export default function AdminCalendar() {
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
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ title: "", description: "", event_type: "event", start_date: "", end_date: "", color: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  const openAdd = (date?: string) => {
    setEditEvent(null);
    const d = date || dateStr(year, month, 1);
    setForm({ title: "", description: "", event_type: "event", start_date: d, end_date: d, color: "" });
    setShowModal(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditEvent(ev);
    setForm({ title: ev.title, description: ev.description || "", event_type: ev.event_type, start_date: ev.start_date, end_date: ev.end_date, color: ev.color || "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title || !form.start_date || !form.end_date) return;
    setSaving(true);
    try {
      const method = editEvent ? "PUT" : "POST";
      const url = editEvent ? api(`/${editEvent.id}`) : api("");
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form) });
      setShowModal(false);
      fetchData();
    } catch {}
    setSaving(false);
  };

  const remove = async (id: number) => {
    await fetch(api(`/${id}`), { method: "DELETE", credentials: "include" });
    setDeleteId(null);
    setSelectedDay(null);
    fetchData();
  };

  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsOnDay = (d: number) => {
    const ds = dateStr(year, month, d);
    return events.filter(e => isInRange(ds, e.start_date, e.end_date));
  };
  const leavesOnDay = (d: number) => {
    const ds = dateStr(year, month, d);
    return leaves.filter(l => isInRange(ds, l.start_date, l.end_date));
  };

  const selectedEvents = selectedDay ? events.filter(e => isInRange(selectedDay, e.start_date, e.end_date)) : [];
  const selectedLeaves = selectedDay ? leaves.filter(l => isInRange(selectedDay, l.start_date, l.end_date)) : [];

  // List view: build day-by-day entries for the month that have at least one event/leave
  const listDays = Array.from({ length: days }, (_, i) => i + 1)
    .map(d => ({ d, ds: dateStr(year, month, d), evs: eventsOnDay(d), lvs: leavesOnDay(d) }))
    .filter(x => x.evs.length > 0 || x.lvs.length > 0);

  const bg = isDark ? "#050d1f" : "#f8fafc";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const cardBd = isDark ? "rgba(0,245,255,0.1)" : "#e2e8f0";
  const textPrimary = isDark ? "#fff" : "#0f172a";
  const textSecondary = isDark ? "rgba(255,255,255,0.4)" : "#64748b";
  const todayDs = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const inputSt: React.CSSProperties = { width: "100%", padding: "8px 11px", borderRadius: 9, background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(0,245,255,0.1)" : "#cbd5e1"}`, color: textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: isDark ? "dark" : "light", fontFamily: "'Tajawal',sans-serif" };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: bg, padding: "20px 16px", fontFamily: "'Tajawal',sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,rgba(0,245,255,0.8),rgba(59,130,246,0.8))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={20} color="#020817" />
            </div>
            <div>
              <h1 style={{ color: textPrimary, fontWeight: 700, fontSize: 20, margin: 0 }}>التقويم</h1>
              <p style={{ color: textSecondary, fontSize: 12, margin: 0 }}>أيام العمل والإجازات والأحداث</p>
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
            <button onClick={() => openAdd()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,rgba(0,245,255,0.8),rgba(59,130,246,0.8))", color: "#020817", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
              <Plus size={15} /> إضافة حدث
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
            {/* Calendar grid */}
            <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, overflow: "hidden" }}>
              {/* Month nav */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${cardBd}` }}>
                <button onClick={prevMonth} style={{ padding: 6, borderRadius: 8, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textPrimary, cursor: "pointer" }}><ChevronRight size={16} /></button>
                <div style={{ fontWeight: 700, color: textPrimary, fontSize: 16 }}>{MONTHS_AR[month]} {year}</div>
                <button onClick={nextMonth} style={{ padding: 6, borderRadius: 8, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textPrimary, cursor: "pointer" }}><ChevronLeft size={16} /></button>
              </div>

              {/* Day names */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${cardBd}` }}>
                {DAYS_AR.map(d => (
                  <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 600, color: textSecondary }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
                  <Loader2 size={24} color="#00f5ff" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} style={{ minHeight: 80, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}`, borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}` }} />;
                    const ds = dateStr(year, month, day);
                    const dayEvents = eventsOnDay(day);
                    const dayLeaves = leavesOnDay(day);
                    const isToday = ds === todayDs;
                    const isSelected = ds === selectedDay;
                    return (
                      <div key={i} onClick={() => setSelectedDay(isSelected ? null : ds)}
                        style={{ minHeight: 80, padding: 6, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}`, borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9"}`, cursor: "pointer", background: isSelected ? (isDark ? "rgba(0,245,255,0.06)" : "rgba(0,200,220,0.06)") : "transparent", transition: "background 0.15s" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4, background: isToday ? "#00f5ff" : "transparent", color: isToday ? "#020817" : textPrimary, fontWeight: isToday ? 700 : 400, fontSize: 13 }}>{day}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {dayEvents.slice(0, 3).map(e => (
                            <div key={e.id} style={{ width: 6, height: 6, borderRadius: "50%", background: e.color || getTypeStyle(e.event_type).color }} />
                          ))}
                          {dayLeaves.slice(0, 2).map(l => (
                            <div key={l.id} style={{ width: 6, height: 6, borderRadius: "50%", background: "#f97316" }} />
                          ))}
                        </div>
                        {dayEvents.slice(0, 1).map(e => (
                          <div key={e.id} style={{ fontSize: 10, padding: "1px 4px", borderRadius: 4, marginTop: 2, background: (e.color || getTypeStyle(e.event_type).color) + "22", color: e.color || getTypeStyle(e.event_type).color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div style={{ display: "flex", gap: 12, padding: "10px 16px", borderTop: `1px solid ${cardBd}`, flexWrap: "wrap" }}>
                {EVENT_TYPES.map(t => (
                  <div key={t.value} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
                    <span style={{ fontSize: 11, color: textSecondary }}>{t.label}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316" }} />
                  <span style={{ fontSize: 11, color: textSecondary }}>إجازة موافق عليها</span>
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {selectedDay ? (
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, color: textPrimary, fontSize: 14 }}>{selectedDay}</span>
                    <button onClick={() => openAdd(selectedDay)} style={{ padding: "4px 10px", borderRadius: 8, border: "none", background: isDark ? "rgba(0,245,255,0.1)" : "rgba(0,180,200,0.1)", color: isDark ? "#00f5ff" : "#0891b2", fontSize: 11, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                      <Plus size={12} />
                    </button>
                  </div>
                  {selectedEvents.length === 0 && selectedLeaves.length === 0 && (
                    <p style={{ color: textSecondary, fontSize: 12, textAlign: "center", padding: "12px 0" }}>لا توجد أحداث</p>
                  )}
                  {selectedEvents.map(ev => (
                    <div key={ev.id} style={{ padding: "8px 10px", borderRadius: 10, marginBottom: 8, background: (ev.color || getTypeStyle(ev.event_type).color) + "11", border: `1px solid ${(ev.color || getTypeStyle(ev.event_type).color)}33` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13, flex: 1 }}>{ev.title}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => openEdit(ev)} style={{ padding: 4, border: "none", background: "none", color: textSecondary, cursor: "pointer" }}><Edit2 size={12} /></button>
                          <button onClick={() => setDeleteId(ev.id)} style={{ padding: 4, border: "none", background: "none", color: "#f87171", cursor: "pointer" }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: ev.color || getTypeStyle(ev.event_type).color, marginTop: 2 }}>{getTypeStyle(ev.event_type).label}</div>
                      {ev.description && <p style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>{ev.description}</p>}
                    </div>
                  ))}
                  {selectedLeaves.map(l => (
                    <div key={l.id} style={{ padding: "8px 10px", borderRadius: 10, marginBottom: 8, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
                      <div style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{l.employee_name}</div>
                      <div style={{ fontSize: 10, color: "#f97316", marginTop: 2 }}>إجازة مقبولة</div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                  <p style={{ color: textSecondary, fontSize: 13, textAlign: "center" }}>اختر يوماً لعرض أحداثه</p>
                </div>
              )}

              {/* Upcoming events */}
              <div style={{ background: cardBg, border: `1px solid ${cardBd}`, borderRadius: 16, padding: 16 }}>
                <h3 style={{ color: textPrimary, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>أحداث الشهر ({events.length})</h3>
                {events.length === 0 && <p style={{ color: textSecondary, fontSize: 12 }}>لا توجد أحداث</p>}
                {events.slice(0, 6).map(ev => (
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
              {/* Month nav */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${cardBd}` }}>
                <button onClick={prevMonth} style={{ padding: 6, borderRadius: 8, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textPrimary, cursor: "pointer" }}><ChevronRight size={16} /></button>
                <div style={{ fontWeight: 700, color: textPrimary, fontSize: 16 }}>{MONTHS_AR[month]} {year}</div>
                <button onClick={nextMonth} style={{ padding: 6, borderRadius: 8, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textPrimary, cursor: "pointer" }}><ChevronLeft size={16} /></button>
              </div>

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
                            <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", borderRadius: 8, marginBottom: 4, background: (ev.color || getTypeStyle(ev.event_type).color) + "15", border: `1px solid ${(ev.color || getTypeStyle(ev.event_type).color)}30` }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                                <div style={{ fontSize: 10, color: ev.color || getTypeStyle(ev.event_type).color }}>{getTypeStyle(ev.event_type).label} · {ev.start_date === ev.end_date ? "" : `${ev.start_date} → ${ev.end_date}`}</div>
                              </div>
                              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                <button onClick={() => openEdit(ev)} style={{ padding: 4, border: "none", background: "none", color: textSecondary, cursor: "pointer" }}><Edit2 size={12} /></button>
                                <button onClick={() => setDeleteId(ev.id)} style={{ padding: 4, border: "none", background: "none", color: "#f87171", cursor: "pointer" }}><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                          {lvs.map(l => (
                            <div key={l.id} style={{ padding: "4px 10px", borderRadius: 8, marginBottom: 4, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)" }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{l.employee_name}</div>
                              <div style={{ fontSize: 10, color: "#f97316" }}>إجازة مقبولة</div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => openAdd(ds)} style={{ padding: "4px 8px", borderRadius: 7, border: "none", background: isDark ? "rgba(0,245,255,0.08)" : "rgba(0,180,200,0.08)", color: isDark ? "#00f5ff" : "#0891b2", cursor: "pointer", flexShrink: 0 }}><Plus size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Side panel same in list mode */}
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

      {/* Add/Edit modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} dir="rtl">
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              style={{ background: isDark ? "rgba(5,13,31,0.98)" : "#fff", border: `1px solid ${cardBd}`, borderRadius: 18, width: "100%", maxWidth: 460, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${isDark ? "rgba(0,245,255,0.07)" : "#f1f5f9"}` }}>
                <h2 style={{ color: textPrimary, fontWeight: 700, fontSize: 15, margin: 0 }}>{editEvent ? "تعديل الحدث" : "إضافة حدث"}</h2>
                <button onClick={() => setShowModal(false)} style={{ padding: 6, border: "none", background: "none", color: textSecondary, cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>عنوان الحدث *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputSt} placeholder="عنوان الحدث" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>نوع الحدث</label>
                  <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))} style={inputSt}>
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>تاريخ البداية *</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputSt} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>تاريخ النهاية *</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputSt} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: textSecondary, marginBottom: 4, display: "block" }}>الوصف</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputSt, resize: "none" }} placeholder="وصف الحدث (اختياري)" />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowModal(false)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", color: textSecondary, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>إلغاء</button>
                  <button onClick={save} disabled={saving || !form.title} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,rgba(0,245,255,0.8),rgba(59,130,246,0.8))", color: "#020817", fontWeight: 700, cursor: "pointer", fontFamily: "'Tajawal',sans-serif" }}>
                    {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
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
              <h3 style={{ color: textPrimary, marginBottom: 8 }}>حذف الحدث؟</h3>
              <p style={{ color: textSecondary, fontSize: 13, marginBottom: 20 }}>هل أنت متأكد من حذف هذا الحدث؟</p>
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
