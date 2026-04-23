import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WCDashboard } from '@/components/workers-comp/WCDashboard';
import { WCPoliciesTab } from '@/components/workers-comp/WCPoliciesTab';
import { WCCodesTab } from '@/components/workers-comp/WCCodesTab';
import { WCAssignmentsTab } from '@/components/workers-comp/WCAssignmentsTab';
import { WCExceptionsTab } from '@/components/workers-comp/WCExceptionsTab';
import { WCReportsTab } from '@/components/workers-comp/WCReportsTab';

export default function WorkersComp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers' Compensation"
        description="Manage WC policies, class codes, employee assignments, and premium calculations."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="codes">Class Codes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><WCDashboard /></TabsContent>
        <TabsContent value="policies"><WCPoliciesTab /></TabsContent>
        <TabsContent value="codes"><WCCodesTab /></TabsContent>
        <TabsContent value="assignments"><WCAssignmentsTab /></TabsContent>
        <TabsContent value="exceptions"><WCExceptionsTab /></TabsContent>
        <TabsContent value="reports"><WCReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
