import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, User, Lock, Briefcase, Shield, UserCog } from "lucide-react";

const roles = [
  { value: "admin", label: "مدير النظام", icon: Shield, desc: "صلاحيات كاملة على النظام" },
  { value: "manager", label: "مشرف / مدير قسم", icon: UserCog, desc: "إدارة الموظفين والتقارير" },
  { value: "employee", label: "موظف", icon: User, desc: "تسجيل الحضور والإجازات" },
];

export default function Setup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"welcome" | "form">("welcome");
  const [role, setRole] = useState("admin");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fullName, username, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "حدث خطأ");
        return;
      }
      setLocation("/login");
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <img src="/images/logo.png" alt="شعار" className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
          </div>
          <h1 className="text-3xl font-bold text-white">مرحباً بك</h1>
          <p className="text-slate-400 mt-2">إعداد نظام الحضور والانصراف</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {step === "welcome" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8">
              <h2 className="text-xl font-bold text-white text-center mb-2">البدء الأول للنظام</h2>
              <p className="text-slate-400 text-center text-sm mb-8">
                يبدو أنك تستخدم النظام للمرة الأولى. أنشئ الحساب الأول للبدء.
              </p>

              <div className="space-y-3 mb-8">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right ${
                      role === r.value
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-slate-600/50 hover:border-slate-500 bg-slate-700/30"
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${role === r.value ? "bg-primary/20" : "bg-slate-600/50"}`}>
                      <r.icon className={`w-5 h-5 ${role === r.value ? "text-primary" : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${role === r.value ? "text-white" : "text-slate-300"}`}>{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${role === r.value ? "border-primary bg-primary" : "border-slate-600"}`}>
                      {role === r.value && <div className="w-full h-full rounded-full bg-white scale-50 block" />}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep("form")}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                التالي ←
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8">
              <button onClick={() => setStep("welcome")} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
                → رجوع
              </button>

              <h2 className="text-xl font-bold text-white mb-1">بيانات الحساب</h2>
              <p className="text-slate-400 text-sm mb-6">
                أنشئ حساب <span className="text-primary font-medium">{roles.find(r => r.value === role)?.label}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="محمد أحمد"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pr-10 pl-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">اسم المستخدم</label>
                  <div className="relative">
                    <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pr-10 pl-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pr-10 pl-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">6 أحرف على الأقل</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الحساب وبدء النظام"}
                </button>
              </form>
            </motion.div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          بعد إنشاء الحساب سيُطلب منك تسجيل الدخول في كل مرة
        </p>
      </motion.div>
    </div>
  );
}
