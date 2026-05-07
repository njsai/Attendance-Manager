import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import SuperAdminLogin from "@/pages/super-admin/Login";
import SuperAdminDashboard from "@/pages/super-admin/Dashboard";
import SecurityDashboard from "@/pages/super-admin/Security";
import AdminDashboard from "@/pages/admin/Dashboard";
import ManagerDashboard from "@/pages/manager/Dashboard";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import Employees from "@/pages/admin/Employees";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminLeaves from "@/pages/admin/Leaves";
import AdminReports from "@/pages/admin/Reports";
import DepartmentsAndShifts from "@/pages/admin/DepartmentsAndShifts";
import AdminBranches from "@/pages/admin/Branches";
import AdminSettings from "@/pages/admin/Settings";
import MyLeaves from "@/pages/employee/MyLeaves";
import ChatPage from "@/pages/Chat";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } }
});

const Spinner = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <Loader2 className="w-12 h-12 animate-spin text-primary" />
  </div>
);

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

function Router() {
  return (
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

      {/* Employee */}
      <Route path="/my-attendance">{() => <Guard><EmployeeDashboard /></Guard>}</Route>
      <Route path="/my-leaves">{() => <Guard><MyLeaves /></Guard>}</Route>

      {/* Chat */}
      <Route path="/chat">{() => <Guard><ChatPage /></Guard>}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
