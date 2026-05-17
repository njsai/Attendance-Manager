import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";

import AppLayout from "@/components/layout/AppLayout";

// ─── Eagerly loaded (critical path + frequently visited) ─────────────────────
import AdminDashboard    from "@/pages/admin/Dashboard";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import ManagerDashboard  from "@/pages/manager/Dashboard";
import Login             from "@/pages/Login";
import SuperAdminLogin   from "@/pages/super-admin/Login";
import Employees         from "@/pages/admin/Employees";
import AdminAttendance   from "@/pages/admin/Attendance";
import AdminLeaves       from "@/pages/admin/Leaves";
import AdminReports      from "@/pages/admin/Reports";
import DepartmentsAndShifts from "@/pages/admin/DepartmentsAndShifts";
import AdminBranches     from "@/pages/admin/Branches";
import AdminSettings     from "@/pages/admin/Settings";
import AdminPayroll      from "@/pages/admin/Payroll";
import MyLeaves          from "@/pages/employee/MyLeaves";
import ChatPage          from "@/pages/Chat";
import EmployeeProfile   from "@/pages/employee/Profile";
import AdminEmployeeProfile from "@/pages/admin/EmployeeProfile";

// ─── Lazy-loaded (super admin + rarely visited) ───────────────────────────────
const SuperAdminDashboard  = lazy(() => import("@/pages/super-admin/Dashboard"));
const SecurityDashboard    = lazy(() => import("@/pages/super-admin/Security"));
const MonitoringPage       = lazy(() => import("@/pages/super-admin/Monitoring"));
const SubscriptionsPage    = lazy(() => import("@/pages/super-admin/Subscriptions"));
const NotificationsPage    = lazy(() => import("@/pages/super-admin/Notifications"));
const AccountSettingsPage  = lazy(() => import("@/pages/super-admin/AccountSettings"));
const NotFound             = lazy(() => import("@/pages/not-found"));

// ─── Prefetch super-admin chunks after app is idle ────────────────────────────
// Use setTimeout fallback for Safari which doesn't support requestIdleCallback
const idle: (cb: () => void) => void =
  typeof requestIdleCallback === "function"
    ? (cb) => requestIdleCallback(cb)
    : (cb) => setTimeout(cb, 200);

function prefetchSuperAdminChunks() {
  idle(() => {
    import("@/pages/super-admin/Dashboard");
    import("@/pages/super-admin/Security");
    import("@/pages/super-admin/Monitoring");
    import("@/pages/super-admin/Subscriptions");
    import("@/pages/super-admin/Notifications");
    import("@/pages/super-admin/AccountSettings");
  });
}

// ─── Query client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 60_000,
      gcTime:    300_000,
    },
  },
});

// ─── Thin progress bar shown only during lazy-chunk loading ──────────────────
// Shown for super-admin pages (the only remaining lazy ones)
const LazyFallback = () => (
  <div style={{
    position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 9999,
    background: "linear-gradient(90deg, #a855f7, #00f5ff, #a855f7)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1s linear infinite",
  }}>
    <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
  </div>
);

// ─── Guards ───────────────────────────────────────────────────────────────────
function Guard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;                                   // invisible — avoids flash
  if (!user) return <Redirect to="/login" />;
  if (user.role === "super_admin") return <Redirect to="/super-admin" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/" />;
  return <AppLayout>{children}</AppLayout>;
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.role !== "super_admin") return <Redirect to="/super-admin/login" />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "super_admin") return <Redirect to="/super-admin" />;
  if (user.role === "admin")   return <Guard><AdminDashboard /></Guard>;
  if (user.role === "manager") return <Guard><ManagerDashboard /></Guard>;
  return <Guard><EmployeeDashboard /></Guard>;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  // Prefetch lazy chunks once app is idle
  useEffect(() => {
    prefetchSuperAdminChunks();
  }, []);

  return (
    <Suspense fallback={<LazyFallback />}>
      <Switch>
        {/* Super Admin */}
        <Route path="/super-admin/login" component={SuperAdminLogin} />
        <Route path="/super-admin/security">{() => <SuperAdminGuard><SecurityDashboard /></SuperAdminGuard>}</Route>
        <Route path="/super-admin/monitoring">{() => <SuperAdminGuard><MonitoringPage /></SuperAdminGuard>}</Route>
        <Route path="/super-admin/subscriptions">{() => <SuperAdminGuard><SubscriptionsPage /></SuperAdminGuard>}</Route>
        <Route path="/super-admin/notifications">{() => <SuperAdminGuard><NotificationsPage /></SuperAdminGuard>}</Route>
        <Route path="/super-admin/settings">{() => <SuperAdminGuard><AccountSettingsPage /></SuperAdminGuard>}</Route>
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
        <Route path="/my-profile">{() => <Guard><EmployeeProfile /></Guard>}</Route>

        {/* Admin profile view */}
        <Route path="/employees/:id/profile">{() => <Guard adminOnly><AdminEmployeeProfile /></Guard>}</Route>

        {/* Chat */}
        <Route path="/chat">{() => <Guard><ChatPage /></Guard>}</Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ─── Inner app ────────────────────────────────────────────────────────────────
function InnerApp() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}
