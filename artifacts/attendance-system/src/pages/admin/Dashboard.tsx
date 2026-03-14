import { useGetDashboardStats } from "@workspace/api-client-react";
import { Users, UserCheck, UserX, Clock, Plane, CalendarDays, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!stats) return null;

  const statCards = [
    { title: "إجمالي الموظفين", value: stats.totalEmployees, icon: Users, color: "bg-blue-500" },
    { title: "حاضر اليوم", value: stats.presentToday, icon: UserCheck, color: "bg-emerald-500" },
    { title: "غائب اليوم", value: stats.absentToday, icon: UserX, color: "bg-rose-500" },
    { title: "متأخر اليوم", value: stats.lateToday, icon: Clock, color: "bg-amber-500" },
    { title: "في إجازة", value: stats.onLeaveToday, icon: Plane, color: "bg-purple-500" },
    { title: "إجازات معلقة", value: stats.pendingLeaves, icon: CalendarDays, color: "bg-cyan-500" },
  ];

  const chartData = [
    { name: "حاضر", value: stats.presentToday, color: "#10b981" },
    { name: "غائب", value: stats.absentToday, color: "#f43f5e" },
    { name: "متأخر", value: stats.lateToday, color: "#f59e0b" },
    { name: "في إجازة", value: stats.onLeaveToday, color: "#a855f7" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-foreground">لوحة التحكم</h2>
        <p className="mt-2 text-muted-foreground">نظرة عامة على حالة الحضور والانصراف لهذا اليوم.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border hover:shadow-xl transition-all duration-300 flex items-center justify-between group"
          >
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
              <h3 className="text-3xl font-bold text-foreground">{card.value}</h3>
            </div>
            <div className={`w-14 h-14 rounded-xl ${card.color} flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform`}>
              <card.icon className="w-7 h-7" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-6 shadow-lg shadow-black/5 border border-border"
        >
          <h3 className="text-lg font-bold mb-6 text-foreground">إحصائيات اليوم</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary to-primary/90 rounded-2xl p-8 shadow-xl text-primary-foreground flex flex-col justify-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
          
          <h3 className="text-2xl font-bold mb-2 relative z-10">نسبة الحضور</h3>
          <p className="text-primary-foreground/80 mb-8 relative z-10">معدل التزام الموظفين بالدوام اليوم</p>
          
          <div className="flex items-end gap-4 relative z-10">
            <span className="text-7xl font-extrabold">{stats.attendanceRate}%</span>
            <span className="text-xl mb-2 text-accent bg-accent/20 px-3 py-1 rounded-lg font-bold">ممتاز</span>
          </div>
          
          <div className="w-full bg-primary-foreground/20 h-3 rounded-full mt-8 overflow-hidden relative z-10">
            <div className="bg-accent h-full rounded-full transition-all duration-1000" style={{ width: `${stats.attendanceRate}%` }}></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
