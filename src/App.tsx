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
import ComplianceTicketDetail from "@/pages/ComplianceTicketDetail";
import AuditLog from "@/pages/AuditLog";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import ClientSettingsPage from "@/pages/ClientSettingsPage";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import WorkflowDemo from "@/pages/WorkflowDemo";
import WorkersComp from "@/pages/WorkersComp";
import Timecards from "@/pages/Timecards";
import TimekeepingOversight from "@/pages/TimekeepingOversight";
import TaxManagement from "@/pages/TaxManagement";
import AchTool from "@/pages/AchTool";
import BenefitsAdmin from "@/pages/BenefitsAdmin";
import ClientTaxManagement from "@/pages/ClientTaxManagement";
import ClientBenefitsAdmin from "@/pages/ClientBenefitsAdmin";
import Communications from "@/pages/Communications";
import CommunicationWizard from "@/pages/CommunicationWizard";
import CommunicationDetail from "@/pages/CommunicationDetail";
import AtlasHrHub from "@/pages/AtlasHrHub";
import NotFound from "@/pages/NotFound";
import Vendors from "@/pages/vendors/Vendors";
import VendorDetail from "@/pages/vendors/VendorDetail";
import VendorOnboardingWizard from "@/pages/vendors/VendorOnboardingWizard";
import Vendor1099Summary from "@/pages/vendors/Vendor1099Summary";
import Vendor1099EligibilityReport from "@/pages/vendors/Vendor1099EligibilityReport";
import VendorPaymentRuns from "@/pages/vendors/VendorPaymentRuns";
import VendorPaymentRunDetail from "@/pages/vendors/VendorPaymentRunDetail";

// Employee portal pages
import EmployeeDashboard from "@/pages/employee/EmployeeDashboard";
import MyPay from "@/pages/employee/MyPay";
import TimeOff from "@/pages/employee/TimeOff";
import TimeCard from "@/pages/employee/TimeCard";
import Benefits from "@/pages/employee/Benefits";
import MyDocuments from "@/pages/employee/MyDocuments";
import MyProfile from "@/pages/employee/MyProfile";
import VerificationLetter from "@/pages/employee/VerificationLetter";

// Contractor portal pages
import ContractorDashboard from "@/pages/contractor/ContractorDashboard";
import ContractorOnboarding from "@/pages/contractor/ContractorOnboarding";
import ContractorPayments from "@/pages/contractor/ContractorPayments";
import ContractorDocuments from "@/pages/contractor/ContractorDocuments";
import ContractorBanking from "@/pages/contractor/ContractorBanking";
import ContractorProfile from "@/pages/contractor/ContractorProfile";

const queryClient = new QueryClient();

/**
 * Role-aware dashboard wrapper: renders employee dashboard for employee role,
 * admin dashboard otherwise. We use a small wrapper to keep the router declarative.
 */
import { useAuth } from "@/contexts/AuthContext";
function RoleDashboard() {
  const { role } = useAuth();
  if (role === 'employee') return <EmployeeDashboard />;
  if (role === 'contractor') return <ContractorDashboard />;
  return <Dashboard />;
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
              <Route path="/timekeeping-oversight" element={<TimekeepingOversight />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/compliance/tickets/:id" element={<ComplianceTicketDetail />} />
              <Route path="/tax-management" element={<TaxManagement />} />
              <Route path="/client-tax" element={<ClientTaxManagement />} />
              <Route path="/ach-tool" element={<AchTool />} />
              <Route path="/benefits-admin" element={<BenefitsAdmin />} />
              <Route path="/client-benefits" element={<ClientBenefitsAdmin />} />
              <Route path="/atlas-hr-hub" element={<AtlasHrHub />} />
              <Route path="/communications" element={<Communications />} />
              <Route path="/communications/new" element={<CommunicationWizard />} />
              <Route path="/communications/:id" element={<CommunicationDetail />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendors/new" element={<VendorOnboardingWizard />} />
              <Route path="/vendors/1099-summary" element={<Vendor1099Summary />} />
              <Route path="/vendors/1099-eligibility" element={<Vendor1099EligibilityReport />} />
              <Route path="/vendors/payments" element={<VendorPaymentRuns />} />
              <Route path="/vendors/payments/:id" element={<VendorPaymentRunDetail />} />
              <Route path="/vendors/:id" element={<VendorDetail />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/client-settings" element={<ClientSettingsPage />} />
              <Route path="/workflow-demo" element={<WorkflowDemo />} />

              {/* Employee portal routes */}
              <Route path="/my-pay" element={<MyPay />} />
              <Route path="/time-off" element={<TimeOff />} />
              <Route path="/time-card" element={<TimeCard />} />
              <Route path="/benefits" element={<Benefits />} />
              <Route path="/my-documents" element={<MyDocuments />} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="/verification-letter" element={<VerificationLetter />} />

              {/* Contractor portal routes */}
              <Route path="/contractor/onboarding" element={<ContractorOnboarding />} />
              <Route path="/contractor/payments" element={<ContractorPayments />} />
              <Route path="/contractor/documents" element={<ContractorDocuments />} />
              <Route path="/contractor/banking" element={<ContractorBanking />} />
              <Route path="/contractor/profile" element={<ContractorProfile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
