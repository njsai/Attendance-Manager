import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

// Layout & Pages
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
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

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
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
