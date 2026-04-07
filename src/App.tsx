import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Companies from "@/pages/Companies";
import CompanyDetail from "@/pages/CompanyDetail";
import Employees from "@/pages/Employees";
import EmployeeDetail from "@/pages/EmployeeDetail";
import Payroll from "@/pages/Payroll";
import PayrollDetail from "@/pages/PayrollDetail";
import PTO from "@/pages/PTO";
import Onboarding from "@/pages/Onboarding";
import OnboardingDetail from "@/pages/OnboardingDetail";
import ClientOnboardingWizard from "@/pages/ClientOnboardingWizard";
import Invoices from "@/pages/Invoices";
import Documents from "@/pages/Documents";
import Compliance from "@/pages/Compliance";
import AuditLog from "@/pages/AuditLog";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import WorkflowDemo from "@/pages/WorkflowDemo";
import WorkersComp from "@/pages/WorkersComp";
import Timecards from "@/pages/Timecards";
import TaxManagement from "@/pages/TaxManagement";
import AchTool from "@/pages/AchTool";
import Communications from "@/pages/Communications";
import CommunicationWizard from "@/pages/CommunicationWizard";
import CommunicationDetail from "@/pages/CommunicationDetail";
import NotFound from "@/pages/NotFound";

// Employee portal pages
import EmployeeDashboard from "@/pages/employee/EmployeeDashboard";
import MyPay from "@/pages/employee/MyPay";
import TimeOff from "@/pages/employee/TimeOff";
import TimeCard from "@/pages/employee/TimeCard";
import Benefits from "@/pages/employee/Benefits";
import MyDocuments from "@/pages/employee/MyDocuments";
import MyProfile from "@/pages/employee/MyProfile";
import VerificationLetter from "@/pages/employee/VerificationLetter";

const queryClient = new QueryClient();

/**
 * Role-aware dashboard wrapper: renders employee dashboard for employee role,
 * admin dashboard otherwise. We use a small wrapper to keep the router declarative.
 */
import { useAuth } from "@/contexts/AuthContext";
function RoleDashboard() {
  const { role } = useAuth();
  return role === 'employee' ? <EmployeeDashboard /> : <Dashboard />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<RoleDashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/:id" element={<EmployeeDetail />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/payroll/:id" element={<PayrollDetail />} />
              <Route path="/pto" element={<PTO />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/:id" element={<OnboardingDetail />} />
              <Route path="/onboarding/client/:id" element={<ClientOnboardingWizard />} />
              <Route path="/workers-comp" element={<WorkersComp />} />
              <Route path="/timecards" element={<Timecards />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/tax-management" element={<TaxManagement />} />
              <Route path="/ach-tool" element={<AchTool />} />
              <Route path="/communications" element={<Communications />} />
              <Route path="/communications/new" element={<CommunicationWizard />} />
              <Route path="/communications/:id" element={<CommunicationDetail />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/workflow-demo" element={<WorkflowDemo />} />

              {/* Employee portal routes */}
              <Route path="/my-pay" element={<MyPay />} />
              <Route path="/time-off" element={<TimeOff />} />
              <Route path="/time-card" element={<TimeCard />} />
              <Route path="/benefits" element={<Benefits />} />
              <Route path="/my-documents" element={<MyDocuments />} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/verification-letter" element={<VerificationLetter />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
