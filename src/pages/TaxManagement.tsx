import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxNoticesTab } from '@/components/tax-management/TaxNoticesTab';
import { AmendmentsTab } from '@/components/tax-management/AmendmentsTab';
import { W2Tab } from '@/components/tax-management/W2Tab';
import { Form1099Tab } from '@/components/tax-management/Form1099Tab';
import { PeoSuiRatesTab } from '@/components/tax-management/PeoSuiRatesTab';
import { ClientSuiUploadTab } from '@/components/tax-management/ClientSuiUploadTab';
import { SuiAdjustmentsTab } from '@/components/tax-management/SuiAdjustmentsTab';
import { SuiClaimsTab } from '@/components/tax-management/SuiClaimsTab';
import { FutaCreditReductionTab } from '@/components/tax-management/FutaCreditReductionTab';
import { SuiAgencyDirectory } from '@/components/tax-management/SuiAgencyDirectory';
import { StateIncomeTaxDirectory } from '@/components/tax-management/StateIncomeTaxDirectory';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FileWarning, FileText, FileCheck, Receipt, Shield, Landmark, Building2 } from 'lucide-react';

export default function TaxManagement() {
  const { role } = useAuth();

  if (role && role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Console"
        description="Manage tax notices, amendments, W-2/1099 filing, SUI rates & claims, and FUTA credit reductions"
      />

      <Tabs defaultValue="notices" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="notices"><FileWarning className="h-3.5 w-3.5 mr-1" />Tax Notices</TabsTrigger>
          <TabsTrigger value="amendments"><FileText className="h-3.5 w-3.5 mr-1" />Amendments</TabsTrigger>
          <TabsTrigger value="w2"><FileCheck className="h-3.5 w-3.5 mr-1" />W-2 / W-2C</TabsTrigger>
          <TabsTrigger value="1099"><Receipt className="h-3.5 w-3.5 mr-1" />1099 / 1099C</TabsTrigger>
          <TabsTrigger value="sui"><Shield className="h-3.5 w-3.5 mr-1" />SUI Rates & Claims</TabsTrigger>
          <TabsTrigger value="futa"><Landmark className="h-3.5 w-3.5 mr-1" />FUTA Credit Reduction</TabsTrigger>
          <TabsTrigger value="directories"><Building2 className="h-3.5 w-3.5 mr-1" />State Directories</TabsTrigger>
        </TabsList>

        <TabsContent value="notices">
          <TaxNoticesTab />
        </TabsContent>

        <TabsContent value="amendments">
          <AmendmentsTab />
        </TabsContent>

        <TabsContent value="w2">
          <W2Tab />
        </TabsContent>

        <TabsContent value="1099">
          <Form1099Tab />
        </TabsContent>

        <TabsContent value="sui">
          <Tabs defaultValue="peo_rates" className="space-y-4">
            <TabsList>
              <TabsTrigger value="peo_rates">PEO SUI Rates</TabsTrigger>
              <TabsTrigger value="client_upload">Client SUI Upload</TabsTrigger>
              <TabsTrigger value="adjustments">SUI Adjustments</TabsTrigger>
              <TabsTrigger value="claims">SUI Claims</TabsTrigger>
            </TabsList>
            <TabsContent value="peo_rates"><PeoSuiRatesTab /></TabsContent>
            <TabsContent value="client_upload"><ClientSuiUploadTab /></TabsContent>
            <TabsContent value="adjustments"><SuiAdjustmentsTab /></TabsContent>
            <TabsContent value="claims"><SuiClaimsTab /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="futa">
          <FutaCreditReductionTab />
        </TabsContent>

        <TabsContent value="directories">
          <Tabs defaultValue="sui_directory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sui_directory">SUI Agencies</TabsTrigger>
              <TabsTrigger value="income_tax_directory">Income Tax Withholding Agencies</TabsTrigger>
            </TabsList>
            <TabsContent value="sui_directory"><SuiAgencyDirectory /></TabsContent>
            <TabsContent value="income_tax_directory"><StateIncomeTaxDirectory /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
