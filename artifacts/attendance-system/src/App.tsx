import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Loader2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────
const Login               = lazy(() => import("@/pages/Login"));
const SuperAdminLogin     = lazy(() => import("@/pages/super-admin/Login"));
const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/Dashboard"));
const SecurityDashboard   = lazy(() => import("@/pages/super-admin/Security"));
const AdminDashboard      = lazy(() => import("@/pages/admin/Dashboard"));
const ManagerDashboard    = lazy(() => import("@/pages/manager/Dashboard"));
const EmployeeDashboard   = lazy(() => import("@/pages/employee/Dashboard"));
const Employees           = lazy(() => import("@/pages/admin/Employees"));
const AdminAttendance     = lazy(() => import("@/pages/admin/Attendance"));
const AdminLeaves         = lazy(() => import("@/pages/admin/Leaves"));
const AdminReports        = lazy(() => import("@/pages/admin/Reports"));
const DepartmentsAndShifts = lazy(() => import("@/pages/admin/DepartmentsAndShifts"));
const AdminBranches       = lazy(() => import("@/pages/admin/Branches"));
const AdminSettings       = lazy(() => import("@/pages/admin/Settings"));
const AdminPayroll        = lazy(() => import("@/pages/admin/Payroll"));
const MyLeaves            = lazy(() => import("@/pages/employee/MyLeaves"));
const ChatPage            = lazy(() => import("@/pages/Chat"));
const NotFound            = lazy(() => import("@/pages/not-found"));

// ─── Query client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } }
});

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex h-screen items-center justify-center bg-[#0f1623]">
    <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
  </div>
);

// ─── Guards ───────────────────────────────────────────────────────────────────
function Guard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "super_admin") return <Redirect to="/super-admin" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/" />;
  return <AppLayout>{children}</AppLayout>;
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user || user.role !== "super_admin") return <Redirect to="/super-admin/login" />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "super_admin") return <Redirect to="/super-admin" />;
  if (user.role === "admin") return <Guard><AdminDashboard /></Guard>;
  if (user.role === "manager") return <Guard><ManagerDashboard /></Guard>;
  return <Guard><EmployeeDashboard /></Guard>;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<Spinner />}>
      <Switch>
        {/* Super Admin */}
        <Route path="/super-admin/login" component={SuperAdminLogin} />
        <Route path="/super-admin/security">{() => <SuperAdminGuard><SecurityDashboard /></SuperAdminGuard>}</Route>
        <Route path="/super-admin">{() => <SuperAdminGuard><SuperAdminDashboard /></SuperAdminGuard>}</Route>

        {/* Company */}
        <Route path="/login" component={Login} />
        <Route path="/" component={RootRedirect} />

        {/* Admin-only */}
        <Route path="/employees">{() => <Guard adminOnly><Employees /></Guard>}</Route>
        <Route path="/branches">{() => <Guard adminOnly><AdminBranches /></Guard>}</Route>
        <Route path="/attendance">{() => <Guard adminOnly><AdminAttendance /></Guard>}</Route>
        <Route path="/leaves">{() => <Guard adminOnly><AdminLeaves /></Guard>}</Route>
        <Route path="/reports">{() => <Guard adminOnly><AdminReports /></Guard>}</Route>
        <Route path="/departments">{() => <Guard adminOnly><DepartmentsAndShifts /></Guard>}</Route>
        <Route path="/shifts">{() => <Guard adminOnly><DepartmentsAndShifts /></Guard>}</Route>
        <Route path="/settings">{() => <Guard adminOnly><AdminSettings /></Guard>}</Route>
        <Route path="/payroll">{() => <Guard adminOnly><AdminPayroll /></Guard>}</Route>

        {/* Employee */}
        <Route path="/my-attendance">{() => <Guard><EmployeeDashboard /></Guard>}</Route>
        <Route path="/my-leaves">{() => <Guard><MyLeaves /></Guard>}</Route>

        {/* Chat */}
        <Route path="/chat">{() => <Guard><ChatPage /></Guard>}</Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
