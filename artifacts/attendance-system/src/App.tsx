import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

// Layout & Pages
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import AdminDashboard from "@/pages/admin/Dashboard";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import Employees from "@/pages/admin/Employees";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminLeaves from "@/pages/admin/Leaves";
import AdminReports from "@/pages/admin/Reports";
import DepartmentsAndShifts from "@/pages/admin/DepartmentsAndShifts";
import MyLeaves from "@/pages/employee/MyLeaves";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } }
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  if (!user) return <Redirect to="/login" />;

  if (adminOnly && user.role !== "admin" && user.role !== "manager") return <Redirect to="/" />;

  return <AppLayout><Component /></AppLayout>;
}

function Router() {
  const { user } = useAuth();

  // Check if system is set up
  const { data: setupStatus, isLoading: setupLoading } = useQuery<{ isSetup: boolean }>({
    queryKey: ["/api/setup/status"],
    queryFn: async () => {
      const res = await fetch("/api/setup/status", { credentials: "include" });
      return res.json();
    },
    staleTime: 0,
  });

  if (setupLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Not set up yet → show setup page
  if (setupStatus && !setupStatus.isSetup) {
    return (
      <Switch>
        <Route path="/setup" component={Setup} />
        <Route>{() => <Redirect to="/setup" />}</Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/setup">{() => <Redirect to="/" />}</Route>

      <Route path="/">
        {() => (
          <ProtectedRoute
            component={user?.role === "admin" || user?.role === "manager" ? AdminDashboard : EmployeeDashboard}
          />
        )}
      </Route>

      {/* Admin Routes */}
      <Route path="/employees">{() => <ProtectedRoute component={Employees} adminOnly />}</Route>
      <Route path="/attendance">{() => <ProtectedRoute component={AdminAttendance} adminOnly />}</Route>
      <Route path="/leaves">{() => <ProtectedRoute component={AdminLeaves} adminOnly />}</Route>
      <Route path="/reports">{() => <ProtectedRoute component={AdminReports} adminOnly />}</Route>
      <Route path="/departments">{() => <ProtectedRoute component={DepartmentsAndShifts} adminOnly />}</Route>
      <Route path="/shifts">{() => <ProtectedRoute component={DepartmentsAndShifts} adminOnly />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={AdminDashboard} adminOnly />}</Route>

      {/* Employee Routes */}
      <Route path="/my-attendance">{() => <ProtectedRoute component={EmployeeDashboard} />}</Route>
      <Route path="/my-leaves">{() => <ProtectedRoute component={MyLeaves} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;
