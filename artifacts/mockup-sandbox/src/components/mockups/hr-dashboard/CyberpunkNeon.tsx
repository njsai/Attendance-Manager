import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell
} from "recharts";
import {
  Users, Clock, UserCheck, UserX, TrendingUp, Bell, Search,
  Home, BarChart3, Settings, LogOut, ChevronRight, Zap,
  Shield, Calendar, MapPin, Activity, CreditCard, Menu,
  ArrowUp, ArrowDown, Star, Fingerprint, Cpu, Database
} from "lucide-react";

const areaData = [
  { day: "السبت", حاضر: 38, غائب: 4, متأخر: 3 },
  { day: "الأحد", حاضر: 42, غائب: 2, متأخر: 5 },
  { day: "الاثنين", حاضر: 40, غائب: 5, متأخر: 2 },
  { day: "الثلاثاء", حاضر: 45, غائب: 1, متأخر: 4 },
  { day: "الأربعاء", حاضر: 43, غائب: 3, متأخر: 6 },
  { day: "الخميس", حاضر: 47, غائب: 2, متأخر: 1 },
  { day: "الجمعة", حاضر: 41, غائب: 6, متأخر: 3 },
];

const radialData = [
  { name: "حضور", value: 87, fill: "#00f5ff" },
  { name: "انصراف", value: 62, fill: "#a855f7" },
  { name: "إجازات", value: 34, fill: "#f97316" },
];

const pieData = [
  { name: "حاضر", value: 87 },
  { name: "متأخر", value: 8 },
  { name: "غائب", value: 5 },
];
const PIE_COLORS = ["#00f5ff", "#f97316", "#ef4444"];

const employees = [
  { name: "أحمد الكريم", role: "مطور برمجيات", status: "حاضر", time: "08:02", late: 0, avatar: "أك" },
  { name: "سارة منصور", role: "مديرة تسويق", status: "متأخر", time: "09:17", late: 17, avatar: "سم" },
  { name: "علي حسين", role: "محاسب", status: "حاضر", time: "07:58", late: 0, avatar: "عح" },
  { name: "فاطمة نور", role: "موارد بشرية", status: "غائب", time: "—", late: 0, avatar: "فن" },
  { name: "محمد خالد", role: "مصمم جرافيك", status: "حاضر", time: "08:10", late: 0, avatar: "مخ" },
];

const navItems = [
  { icon: Home, label: "الرئيسية", active: true },
  { icon: Users, label: "الموظفون" },
  { icon: Clock, label: "الحضور" },
  { icon: BarChart3, label: "التقارير" },
  { icon: CreditCard, label: "الرواتب" },
  { icon: Calendar, label: "الجداول" },
  { icon: MapPin, label: "المواقع" },
  { icon: Shield, label: "الأمان" },
  { icon: Database, label: "النسخ الاحتياطي" },
  { icon: Settings, label: "الإعدادات" },
];

const statCards = [
  { label: "إجمالي الموظفين", value: "247", change: "+12", up: true, icon: Users, color: "cyan" },
  { label: "حاضرون اليوم", value: "198", change: "+5", up: true, icon: UserCheck, color: "green" },
  { label: "في إجازة", value: "23", change: "-2", up: false, icon: Calendar, color: "purple" },
  { label: "متأخرون", value: "26", change: "+3", up: false, icon: Clock, color: "orange" },
];

const colorMap: Record<string, { neon: string; glow: string; bg: string; border: string }> = {
  cyan:   { neon: "#00f5ff", glow: "rgba(0,245,255,0.3)", bg: "rgba(0,245,255,0.08)", border: "rgba(0,245,255,0.3)" },
  green:  { neon: "#00ff9f", glow: "rgba(0,255,159,0.3)", bg: "rgba(0,255,159,0.08)", border: "rgba(0,255,159,0.3)" },
  purple: { neon: "#a855f7", glow: "rgba(168,85,247,0.3)", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.3)" },
  orange: { neon: "#f97316", glow: "rgba(249,115,22,0.3)", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)" },
};

export function CyberpunkNeon() {
  const [activeNav, setActiveNav] = useState(0);
  const [sidebarOpen] = useState(true);

  return (
    <div
      dir="rtl"
      className="flex h-screen w-full overflow-hidden text-white"
      style={{
        background: "linear-gradient(135deg, #020817 0%, #050d1f 40%, #0a0520 100%)",
        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      }}
    >
      {/* Ambient background glows */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(0,245,255,0.06) 0%, transparent 70%), radial-gradient(ellipse 50% 60% at 85% 80%, rgba(168,85,247,0.07) 0%, transparent 70%)",
      }} />

      {/* Sidebar */}
      <motion.aside
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: sidebarOpen ? 220 : 72,
          background: "linear-gradient(180deg, rgba(0,245,255,0.04) 0%, rgba(168,85,247,0.03) 100%)",
          borderLeft: "1px solid rgba(0,245,255,0.15)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 16px 20px", borderBottom: "1px solid rgba(0,245,255,0.1)" }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #00f5ff, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(0,245,255,0.5)",
              flexShrink: 0,
            }}>
              <Cpu size={20} color="#000" />
            </div>
            {sidebarOpen && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#00f5ff", letterSpacing: 1 }}>NEXUS HR</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>نظام الموارد البشرية</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {navItems.map((item, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveNav(i)}
              whileHover={{ x: -4 }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", marginBottom: 2,
                background: activeNav === i ? "rgba(0,245,255,0.1)" : "transparent",
                borderLeft: activeNav === i ? "3px solid #00f5ff" : "3px solid transparent",
                cursor: "pointer", border: "none", color: activeNav === i ? "#00f5ff" : "rgba(255,255,255,0.45)",
                transition: "all 0.2s", textAlign: "right",
              }}
            >
              <item.icon size={18} style={{
                filter: activeNav === i ? "drop-shadow(0 0 6px #00f5ff)" : "none",
                flexShrink: 0,
              }} />
              {sidebarOpen && (
                <span style={{ fontSize: 13, fontWeight: activeNav === i ? 600 : 400 }}>{item.label}</span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(0,245,255,0.1)" }}>
          <div className="flex items-center gap-2">
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #00f5ff, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#000", flexShrink: 0,
            }}>أد</div>
            {sidebarOpen && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>المدير العام</div>
                <div style={{ fontSize: 10, color: "rgba(0,245,255,0.6)" }}>admin@nexus.io</div>
              </div>
            )}
            {sidebarOpen && <LogOut size={14} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative" style={{ zIndex: 1 }}>

        {/* Top Navbar */}
        <motion.header
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            height: 60,
            borderBottom: "1px solid rgba(0,245,255,0.12)",
            backdropFilter: "blur(20px)",
            background: "rgba(2,8,23,0.8)",
            display: "flex", alignItems: "center",
            padding: "0 24px", gap: 16,
            flexShrink: 0,
          }}
        >
          <Menu size={18} style={{ color: "rgba(255,255,255,0.4)", cursor: "pointer", flexShrink: 0 }} />

          {/* Search */}
          <div style={{
            flex: 1, maxWidth: 360,
            background: "rgba(0,245,255,0.05)",
            border: "1px solid rgba(0,245,255,0.15)",
            borderRadius: 10, display: "flex", alignItems: "center",
            padding: "0 12px", gap: 8,
          }}>
            <Search size={14} style={{ color: "rgba(0,245,255,0.5)" }} />
            <input
              placeholder="ابحث عن موظف، قسم، تقرير..."
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: 13, flex: 1,
              }}
            />
          </div>

          <div className="flex items-center gap-3 mr-auto">
            {/* Live badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
              background: "rgba(0,255,159,0.08)", border: "1px solid rgba(0,255,159,0.25)",
              borderRadius: 20, fontSize: 11,
            }}>
              <span style={{ width: 6, height: 6, background: "#00ff9f", borderRadius: "50%", display: "inline-block", boxShadow: "0 0 6px #00ff9f" }} />
              <span style={{ color: "#00ff9f" }}>نظام يعمل</span>
            </div>

            {/* Notifications */}
            <div style={{ position: "relative", cursor: "pointer" }}>
              <Bell size={18} style={{ color: "rgba(255,255,255,0.5)" }} />
              <span style={{
                position: "absolute", top: -4, right: -4,
                width: 14, height: 14, background: "#f97316",
                borderRadius: "50%", fontSize: 9, display: "flex",
                alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 8px rgba(249,115,22,0.6)",
              }}>3</span>
            </div>

            {/* Date */}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              {new Date().toLocaleDateString("ar-IQ", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
        </motion.header>

        {/* Dashboard body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20, scrollbarWidth: "thin", scrollbarColor: "rgba(0,245,255,0.2) transparent" }}>

          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
            <div className="flex items-center gap-3">
              <Activity size={20} style={{ color: "#00f5ff", filter: "drop-shadow(0 0 8px #00f5ff)" }} />
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>لوحة التحكم</h1>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>الأربعاء، 7 مايو 2025 — آخر تحديث منذ 2 دقيقة</p>
              </div>
            </div>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {statCards.map((card, i) => {
              const c = colorMap[card.color];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  whileHover={{ y: -4, boxShadow: `0 8px 32px ${c.glow}` }}
                  style={{
                    background: `linear-gradient(135deg, ${c.bg} 0%, rgba(255,255,255,0.02) 100%)`,
                    border: `1px solid ${c.border}`,
                    borderRadius: 16, padding: "16px 18px",
                    backdropFilter: "blur(12px)",
                    cursor: "pointer", transition: "all 0.3s",
                    boxShadow: `0 4px 20px ${c.glow}`,
                    position: "relative", overflow: "hidden",
                  }}
                >
                  {/* Glow line at top */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${c.neon}, transparent)`,
                  }} />

                  <div className="flex items-start justify-between mb-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: c.bg, border: `1px solid ${c.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <card.icon size={16} style={{ color: c.neon }} />
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 3,
                      fontSize: 11, color: card.up ? "#00ff9f" : "#f87171",
                    }}>
                      {card.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {card.change}
                    </div>
                  </div>

                  <div style={{ fontSize: 28, fontWeight: 700, color: c.neon, lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{card.label}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "1fr 280px" }}>

            {/* Area chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(0,245,255,0.12)",
                borderRadius: 16, padding: 20,
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>تحليل الحضور الأسبوعي</h3>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>آخر 7 أيام</p>
                </div>
                <div className="flex gap-3" style={{ fontSize: 11 }}>
                  {[["حاضر", "#00f5ff"], ["غائب", "#ef4444"], ["متأخر", "#f97316"]].map(([l, c]) => (
                    <div key={l} className="flex items-center gap-1">
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c as string, display: "inline-block" }} />
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f5ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00f5ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,8,23,0.95)", border: "1px solid rgba(0,245,255,0.3)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "#00f5ff" }}
                  />
                  <Area type="monotone" dataKey="حاضر" stroke="#00f5ff" strokeWidth={2} fill="url(#cyanGrad)" />
                  <Area type="monotone" dataKey="غائب" stroke="#ef4444" strokeWidth={2} fill="url(#redGrad)" />
                  <Area type="monotone" dataKey="متأخر" stroke="#f97316" strokeWidth={2} fill="url(#orangeGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Pie / donut */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: 16, padding: 20,
                backdropFilter: "blur(12px)",
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>توزيع اليوم</h3>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>نسبة الحضور الحالية</p>
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} style={{ filter: `drop-shadow(0 0 6px ${PIE_COLORS[i]})` }} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#00f5ff" }}>87%</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>حاضر</div>
                </div>
              </div>
              <div className="space-y-2 mt-3">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i], display: "inline-block", boxShadow: `0 0 6px ${PIE_COLORS[i]}` }} />
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>{d.name}</span>
                    </div>
                    <span style={{ color: PIE_COLORS[i], fontWeight: 600 }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Employee table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(0,245,255,0.1)",
              borderRadius: 16, overflow: "hidden",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(0,245,255,0.1)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div className="flex items-center gap-2">
                <Fingerprint size={16} style={{ color: "#00f5ff" }} />
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>سجل الحضور اليوم</h3>
              </div>
              <button style={{
                fontSize: 12, color: "#00f5ff", background: "rgba(0,245,255,0.08)",
                border: "1px solid rgba(0,245,255,0.2)", borderRadius: 8,
                padding: "4px 12px", cursor: "pointer",
              }}>عرض الكل</button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,245,255,0.04)" }}>
                  {["الموظف", "المنصب", "وقت الدخول", "الحالة"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)", textAlign: "right", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => {
                  const sc = emp.status === "حاضر" ? { color: "#00ff9f", bg: "rgba(0,255,159,0.1)", border: "rgba(0,255,159,0.3)" }
                    : emp.status === "متأخر" ? { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" }
                    : { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" };
                  return (
                    <motion.tr
                      key={i}
                      whileHover={{ background: "rgba(0,245,255,0.04)" }}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                    >
                      <td style={{ padding: "10px 16px" }}>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, #00f5ff22, #a855f722)",
                            border: "1px solid rgba(0,245,255,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, color: "#00f5ff",
                          }}>{emp.avatar}</div>
                          <span style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{emp.role}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, color: "#a855f7", fontFamily: "monospace" }}>{emp.time}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: "3px 10px", borderRadius: 20,
                          color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                          boxShadow: `0 0 8px ${sc.border}`,
                        }}>{emp.status}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
