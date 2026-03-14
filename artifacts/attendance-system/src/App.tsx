import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";

// Layout & Pages
import AppLayout from "@/components/layout/AppLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import Employees from "@/pages/admin/Employees";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminLeaves from "@/pages/admin/Leaves";
import AdminReports from "@/pages/admin/Reports";
import DepartmentsAndShifts from "@/pages/admin/DepartmentsAndShifts";
import MyLeaves from "@/pages/employee/MyLeaves";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } }
});

function wrap(Component: React.ComponentType) {
  return () => (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Default → Admin Dashboard */}
      <Route path="/" component={wrap(AdminDashboard)} />

      {/* Admin Routes */}
      <Route path="/employees" component={wrap(Employees)} />
      <Route path="/attendance" component={wrap(AdminAttendance)} />
      <Route path="/leaves" component={wrap(AdminLeaves)} />
      <Route path="/reports" component={wrap(AdminReports)} />
      <Route path="/departments" component={wrap(DepartmentsAndShifts)} />
      <Route path="/shifts" component={wrap(DepartmentsAndShifts)} />
      <Route path="/settings" component={wrap(AdminDashboard)} />

      {/* Employee Routes */}
      <Route path="/my-attendance" component={wrap(EmployeeDashboard)} />
      <Route path="/my-leaves" component={wrap(MyLeaves)} />

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
