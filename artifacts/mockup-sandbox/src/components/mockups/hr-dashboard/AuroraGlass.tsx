import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import {
  Users, Clock, UserCheck, Calendar, Bell, Search, Home,
  BarChart3, Settings, LogOut, Zap, Shield, MapPin,
  Activity, CreditCard, Database, ArrowUp, ArrowDown,
  Fingerprint, TrendingUp, Star, ChevronLeft, Grid3X3,
  Moon, Sun, Sparkles
} from "lucide-react";

const barData = [
  { day: "السبت",  val: 82 },
  { day: "الأحد",  val: 91 },
  { day: "الاثنين", val: 78 },
  { day: "الثلاثاء", val: 95 },
  { day: "الأربعاء", val: 88 },
  { day: "الخميس", val: 93 },
  { day: "الجمعة", val: 85 },
];

const lineData = [
  { h: "08", attendance: 45, onTime: 40 },
  { h: "09", attendance: 120, onTime: 98 },
  { h: "10", attendance: 185, onTime: 162 },
  { h: "11", attendance: 198, onTime: 175 },
  { h: "12", attendance: 195, onTime: 172 },
  { h: "13", attendance: 188, onTime: 170 },
  { h: "14", attendance: 192, onTime: 174 },
  { h: "15", attendance: 175, onTime: 158 },
];

const deptData = [
  { name: "تقنية المعلومات", present: 18, absent: 2, color: "#7c3aed" },
  { name: "التسويق",         present: 12, absent: 1, color: "#0891b2" },
  { name: "المالية",          present: 8,  absent: 0, color: "#059669" },
  { name: "الموارد البشرية",  present: 6,  absent: 1, color: "#d97706" },
  { name: "العمليات",         present: 22, absent: 3, color: "#db2777" },
];

const recentActivity = [
  { name: "أحمد الكريمي",  action: "سجّل حضوره",   time: "منذ 2 دقيقة",  color: "#34d399" },
  { name: "سارة المنصور",  action: "تأخر 15 دقيقة", time: "منذ 8 دقائق",  color: "#fbbf24" },
  { name: "علي حسن",       action: "غادر مبكراً",   time: "منذ 20 دقيقة", color: "#f87171" },
  { name: "فاطمة نور",     action: "طلبت إجازة",    time: "منذ 35 دقيقة", color: "#818cf8" },
  { name: "خالد إبراهيم",  action: "سجّل حضوره",   time: "منذ 1 ساعة",   color: "#34d399" },
];

const stats = [
  { label: "إجمالي الموظفين", value: "247", sub: "+12 هذا الشهر", icon: Users,     color: ["#7c3aed", "#a78bfa"] },
  { label: "حاضرون الآن",     value: "198", sub: "87% من الكادر",  icon: UserCheck, color: ["#0891b2", "#67e8f9"] },
  { label: "في إجازة",        value: "23",  sub: "9 مصادق عليها", icon: Calendar,  color: ["#059669", "#6ee7b7"] },
  { label: "تنبيهات اليوم",   value: "11",  sub: "3 عاجلة",       icon: Bell,      color: ["#d97706", "#fcd34d"] },
];

const navItems = [
  { icon: Home,       label: "الرئيسية",        active: true },
  { icon: Users,      label: "الموظفون" },
  { icon: Clock,      label: "الحضور والانصراف" },
  { icon: BarChart3,  label: "التقارير" },
  { icon: CreditCard, label: "الرواتب" },
  { icon: Calendar,   label: "الجداول الزمنية" },
  { icon: MapPin,     label: "تتبع المواقع" },
  { icon: Shield,     label: "الأمان" },
  { icon: Database,   label: "النسخ الاحتياطي" },
  { icon: Settings,   label: "الإعدادات" },
];

export function AuroraGlass() {
  const [activeNav, setActiveNav] = useState(0);

  return (
    <div
      dir="rtl"
      className="flex h-screen w-full overflow-hidden text-white"
      style={{
        background: "#080b18",
        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      }}
    >
      {/* Aurora background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          top: -200, right: -100,
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          bottom: -100, left: 100,
          background: "radial-gradient(circle, rgba(8,145,178,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          top: "40%", left: "40%",
          background: "radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: 230,
          background: "rgba(255,255,255,0.03)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(24px)",
          display: "flex", flexDirection: "column",
          flexShrink: 0, zIndex: 10, position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 14,
              background: "linear-gradient(135deg, #7c3aed, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(124,58,237,0.5)",
            }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Aurora <span style={{ color: "#a78bfa" }}>HR</span></div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>نظام الموارد البشرية</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto", scrollbarWidth: "none" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", padding: "4px 10px 8px", textTransform: "uppercase", letterSpacing: 2 }}>القائمة الرئيسية</div>
          {navItems.slice(0, 6).map((item, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveNav(i)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", marginBottom: 2, borderRadius: 10,
                background: activeNav === i
                  ? "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(8,145,178,0.15))"
                  : "transparent",
                border: activeNav === i ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
                cursor: "pointer", color: activeNav === i ? "#a78bfa" : "rgba(255,255,255,0.4)",
                transition: "all 0.2s", textAlign: "right",
                boxShadow: activeNav === i ? "0 4px 20px rgba(124,58,237,0.2)" : "none",
              }}
            >
              <item.icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: activeNav === i ? 600 : 400 }}>{item.label}</span>
              {activeNav === i && <ChevronLeft size={12} style={{ marginRight: "auto", opacity: 0.5 }} />}
            </motion.button>
          ))}

          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", padding: "12px 10px 8px", textTransform: "uppercase", letterSpacing: 2 }}>النظام</div>
          {navItems.slice(6).map((item, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveNav(i + 6)}
              whileHover={{ scale: 1.02 }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", marginBottom: 2, borderRadius: 10,
                background: activeNav === i + 6 ? "rgba(124,58,237,0.15)" : "transparent",
                border: "1px solid transparent",
                cursor: "pointer", color: activeNav === i + 6 ? "#a78bfa" : "rgba(255,255,255,0.35)",
                transition: "all 0.2s", textAlign: "right",
              }}
            >
              <item.icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{item.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* User card */}
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{
            background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #0891b2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, boxShadow: "0 0 12px rgba(124,58,237,0.4)",
              flexShrink: 0,
            }}>أد</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>المدير العام</div>
              <div style={{ fontSize: 10, color: "rgba(167,139,250,0.7)" }}>admin@aurora.hr</div>
            </div>
            <LogOut size={14} style={{ color: "rgba(255,255,255,0.25)", cursor: "pointer", flexShrink: 0 }} />
          </div>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0" style={{ position: "relative", zIndex: 1 }}>

        {/* Navbar */}
        <motion.header
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            height: 62,
            background: "rgba(8,11,24,0.7)",
            backdropFilter: "blur(24px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", padding: "0 24px", gap: 14,
            flexShrink: 0,
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            <Home size={14} />
            <span>/</span>
            <span style={{ color: "#a78bfa" }}>لوحة التحكم</span>
          </div>

          {/* Search */}
          <div style={{
            flex: 1, maxWidth: 340, marginRight: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, display: "flex", alignItems: "center",
            padding: "0 14px", gap: 8, transition: "border-color 0.2s",
          }}>
            <Search size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              placeholder="ابحث في النظام..."
              style={{
                background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: 13, flex: 1,
              }}
            />
            <kbd style={{
              fontSize: 10, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 5px",
            }}>⌘K</kbd>
          </div>

          <div className="flex items-center gap-3 mr-auto">
            {/* Status pill */}
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px",
                background: "rgba(5,150,105,0.1)",
                border: "1px solid rgba(5,150,105,0.25)",
                borderRadius: 20, fontSize: 11,
              }}
            >
              <span style={{ width: 6, height: 6, background: "#34d399", borderRadius: "50%", display: "inline-block" }} />
              <span style={{ color: "#34d399" }}>مباشر</span>
            </motion.div>

            {/* Notification bell */}
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
            }}>
              <Bell size={16} style={{ color: "rgba(255,255,255,0.5)" }} />
              <span style={{
                position: "absolute", top: 4, right: 4,
                width: 12, height: 12, background: "#7c3aed",
                borderRadius: "50%", fontSize: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>3</span>
            </div>

            {/* Grid view */}
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <Grid3X3 size={15} style={{ color: "rgba(255,255,255,0.4)" }} />
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20, scrollbarWidth: "thin", scrollbarColor: "rgba(124,58,237,0.3) transparent" }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>
                مرحباً، <span style={{ color: "#a78bfa" }}>المدير العام</span> 👋
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
                الأربعاء، 7 مايو 2025 — هنا نظرة شاملة على اليوم
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: 12,
                background: "linear-gradient(135deg, #7c3aed, #0891b2)",
                border: "none", color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              }}
            >
              <TrendingUp size={15} />
              تقرير اليوم
            </motion.button>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                whileHover={{ y: -4 }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18, padding: "18px 20px",
                  backdropFilter: "blur(16px)",
                  cursor: "pointer", transition: "all 0.3s",
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Gradient accent top */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, ${s.color[0]}, ${s.color[1]})`,
                  borderRadius: "18px 18px 0 0",
                }} />
                {/* Glow blob */}
                <div style={{
                  position: "absolute", bottom: -20, left: -20,
                  width: 80, height: 80, borderRadius: "50%",
                  background: `radial-gradient(circle, ${s.color[0]}22, transparent 70%)`,
                }} />

                <div className="flex items-start justify-between mb-4">
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: `linear-gradient(135deg, ${s.color[0]}22, ${s.color[1]}11)`,
                    border: `1px solid ${s.color[0]}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <s.icon size={18} style={{ color: s.color[1] }} />
                  </div>
                  <div className="flex items-center gap-1" style={{ fontSize: 11, color: "#34d399" }}>
                    <ArrowUp size={11} />
                    <span>+5.2%</span>
                  </div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: s.color[1] }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "1fr 1fr" }}>

            {/* Bar chart - weekly attendance % */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18, padding: 20, backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>نسبة الحضور الأسبوعية</h3>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>متوسط: 87.4%</p>
                </div>
                <div style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 11,
                  background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}>أسبوعي</div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={24}>
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{ background: "rgba(8,11,24,0.95)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: 10, fontSize: 12 }}
                    cursor={{ fill: "rgba(124,58,237,0.08)" }}
                  />
                  <Bar dataKey="val" name="الحضور %" radius={[6, 6, 0, 0]}
                    fill="url(#purpleBlue)"
                  />
                  <defs>
                    <linearGradient id="purpleBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Line chart - real-time arrivals */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18, padding: 20, backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>تدفق الحضور اليومي</h3>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>توزيع الحضور بالساعة</p>
                </div>
                <div className="flex gap-3" style={{ fontSize: 11 }}>
                  {[["حضور", "#67e8f9"], ["في الوقت", "#a78bfa"]].map(([l, c]) => (
                    <div key={l} className="flex items-center gap-1">
                      <span style={{ width: 16, height: 2, background: c as string, display: "inline-block", borderRadius: 1 }} />
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="h" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}:00`} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(8,11,24,0.95)", border: "1px solid rgba(8,145,178,0.35)", borderRadius: 10, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="attendance" name="حضور" stroke="#67e8f9" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="onTime" name="في الوقت" stroke="#a78bfa" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Bottom row */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>

            {/* Departments */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18, padding: 20, backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>حضور الأقسام</h3>
                <button style={{
                  fontSize: 12, color: "#a78bfa", background: "transparent",
                  border: "none", cursor: "pointer",
                }}>عرض التفاصيل ←</button>
              </div>
              <div className="space-y-3">
                {deptData.map((dept, i) => {
                  const pct = Math.round((dept.present / (dept.present + dept.absent)) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1" style={{ fontSize: 12 }}>
                        <span style={{ color: "rgba(255,255,255,0.65)" }}>{dept.name}</span>
                        <div className="flex items-center gap-3">
                          <span style={{ color: "#34d399" }}>{dept.present} حاضر</span>
                          {dept.absent > 0 && <span style={{ color: "#f87171" }}>{dept.absent} غائب</span>}
                          <span style={{ color: dept.color, fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.7 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                          style={{
                            height: "100%", borderRadius: 99,
                            background: `linear-gradient(90deg, ${dept.color}, ${dept.color}88)`,
                            boxShadow: `0 0 8px ${dept.color}55`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Activity feed */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 18, padding: 20, backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>النشاط الأخير</h3>
                <Activity size={14} style={{ color: "#a78bfa" }} />
              </div>
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 + i * 0.08 }}
                    className="flex items-start gap-3"
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: `${a.color}22`,
                      border: `1px solid ${a.color}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: a.color,
                    }}>{a.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{a.action}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{a.time}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
