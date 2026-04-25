import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, User, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

async function apiPost(url: string, body: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "خطأ");
  return data;
}

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const BASE = import.meta.env.BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      const data = await apiPost(`${BASE}api/auth/super-admin/login`, { username, password });
      queryClient.setQueryData(["/api/auth/me"], { ...data.superAdmin, role: "super_admin" });
      setLocation("/super-admin");
    } catch (err: any) {
      setError(err?.message || "بيانات الدخول غير صحيحة");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-4" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-bl from-indigo-700 to-indigo-900 px-8 py-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl mb-4 border border-white/30">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">لوحة التحكم الرئيسية</h1>
              <p className="text-white/70 mt-1 text-sm">مدير النظام العام</p>
            </div>
          </div>

          <div className="p-8 space-y-5">
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />{error}
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300">الرمز</label>
                <div className="relative">
                  <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                </div>
              </div>
              <button type="submit" disabled={isPending}
                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-900/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الدخول...</> : <><Shield className="w-5 h-5" /> دخول لوحة التحكم</>}
              </button>
            </form>
            <div className="text-center pt-2">
              <button onClick={() => setLocation("/login")} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                الدخول كموظف →
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
