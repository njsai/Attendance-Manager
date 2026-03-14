import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Loader2, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsPending(true);
    try {
      await login({ data: { username, password } });
      setLocation("/");
    } catch (err: any) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-sm lg:w-96"
        >
          <div className="text-center">
            <img 
              className="h-16 w-auto mx-auto drop-shadow-md" 
              src={`${import.meta.env.BASE_URL}images/logo.png`} 
              alt="شعار النظام" 
            />
            <h2 className="mt-8 text-3xl font-extrabold text-foreground">تسجيل الدخول</h2>
            <p className="mt-2 text-sm text-muted-foreground">أدخل بياناتك للوصول لنظام الحضور</p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 ps-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground ml-3" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pe-10 py-3 rounded-xl border-2 border-border bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 sm:text-sm"
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 ps-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground ml-3" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pe-10 py-3 rounded-xl border-2 border-border bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/25 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1 bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 mix-blend-multiply" />
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-60"
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="خلفية النظام"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
        <div className="absolute bottom-12 right-12 text-white max-w-lg">
          <h2 className="text-4xl font-bold mb-4">نظام إدارة الموارد البشرية</h2>
          <p className="text-lg opacity-80 leading-relaxed">قم بإدارة الحضور، الانصراف، الإجازات وتقارير الأداء بكل سهولة وفعالية من خلال لوحة تحكم واحدة متكاملة.</p>
        </div>
      </div>
    </div>
  );
}
