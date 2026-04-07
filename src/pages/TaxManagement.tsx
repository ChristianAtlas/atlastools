import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeoSuiRatesTab } from '@/components/tax-management/PeoSuiRatesTab';
import { ClientSuiUploadTab } from '@/components/tax-management/ClientSuiUploadTab';
import { SuiAdjustmentsTab } from '@/components/tax-management/SuiAdjustmentsTab';
import { RoleGate } from '@/components/RoleGate';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function TaxManagement() {
  const { role } = useAuth();

  if (role && role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Management"
        subtitle="Manage PEO & client SUI rates, bulk uploads, and SUI adjustments"
      />

      <Tabs defaultValue="peo_rates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="peo_rates">PEO SUI Rates</TabsTrigger>
          <TabsTrigger value="client_upload">Client SUI Upload</TabsTrigger>
          <TabsTrigger value="adjustments">SUI Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="peo_rates">
          <PeoSuiRatesTab />
        </TabsContent>

        <TabsContent value="client_upload">
          <ClientSuiUploadTab />
        </TabsContent>

        <TabsContent value="adjustments">
          <SuiAdjustmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
