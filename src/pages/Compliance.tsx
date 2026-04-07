import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Building2, Users, Shield, Calendar, Key, AlertTriangle, FileText, FileCheck, UserPlus } from 'lucide-react';
import { useComplianceItems, useComplianceLicenses } from '@/hooks/useCompliance';
import { useAuth } from '@/contexts/AuthContext';

import { ComplianceStatusCard } from '@/components/compliance/ComplianceStatusCard';
import { ComplianceScoreBadge } from '@/components/compliance/ComplianceScoreBadge';
import { ComplianceItemsTable } from '@/components/compliance/ComplianceItemsTable';
import { LicensesTable } from '@/components/compliance/LicensesTable';
import { ComplianceCalendar } from '@/components/compliance/ComplianceCalendar';
import { RiskDashboard } from '@/components/compliance/RiskDashboard';
import { ComplianceItemDialog } from '@/components/compliance/ComplianceItemDialog';
import { LicenseDialog } from '@/components/compliance/LicenseDialog';
import { Form8973Tab } from '@/components/compliance/Form8973Tab';
import { NewHireReportingDirectory } from '@/components/compliance/NewHireReportingDirectory';
import { computeComplianceScore } from '@/hooks/useCompliance';

const ENTERPRISE_CATEGORIES = ['PEO Licensing', 'CPEO Status', 'Annual Filings', 'SUI Registration', 'Business Entity', 'Workers Comp', 'Compliance Calendar'];
const CLIENT_CATEGORIES = ['State Registration', 'Local Tax', 'ACA Eligibility', 'COBRA', 'ERISA', 'Client Agreement', 'Onboarding Compliance'];
const EMPLOYEE_CATEGORIES = ['I-9 Verification', 'W-4 / Withholding', 'New Hire Reporting', 'Classification', 'Work Authorization', 'State Notices', 'Garnishment', 'Benefits Eligibility'];

export default function Compliance() {
  const { isSuperAdmin, isClientAdmin, isEmployee, profile } = useAuth();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addLicenseOpen, setAddLicenseOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [itemDialogEntity, setItemDialogEntity] = useState<'enterprise' | 'client' | 'employee'>('enterprise');
  const [licenseDialogEntity, setLicenseDialogEntity] = useState<'enterprise' | 'client'>('enterprise');

  // Fetch data based on role
  const { data: allItems = [], isLoading: itemsLoading } = useComplianceItems(
    isEmployee ? 'employee' : undefined,
    isClientAdmin ? profile?.company_id || undefined : undefined
  );
  const { data: licenses = [], isLoading: licensesLoading } = useComplianceLicenses();

  const enterpriseItems = allItems.filter(i => i.entity_type === 'enterprise');
  const clientItems = allItems.filter(i => i.entity_type === 'client');
  const employeeItems = allItems.filter(i => i.entity_type === 'employee');

  const overallScore = computeComplianceScore(allItems);
  const compliant = allItems.filter(i => i.status === 'compliant' || i.status === 'waived').length;
  const atRisk = allItems.filter(i => i.status === 'at_risk').length;
  const nonCompliant = allItems.filter(i => i.status === 'non_compliant' || i.status === 'expired').length;
  const pending = allItems.filter(i => i.status === 'pending' || i.status === 'in_progress').length;

  const openAddItem = (entityType: 'enterprise' | 'client' | 'employee') => {
    setItemDialogEntity(entityType);
    setAddItemOpen(true);
  };

  const openAddLicense = (entityType: 'enterprise' | 'client') => {
    setLicenseDialogEntity(entityType);
    setAddLicenseOpen(true);
  };

  const getCategoriesForEntity = (et: string) => {
    if (et === 'enterprise') return ENTERPRISE_CATEGORIES;
    if (et === 'client') return CLIENT_CATEGORIES;
    return EMPLOYEE_CATEGORIES;
  };

  // Employee view - simplified
  if (isEmployee) {
    return (
      <div className="space-y-5">
        <PageHeader title="My Compliance" description="Your compliance requirements and documents" />
        <ComplianceItemsTable items={employeeItems} loading={itemsLoading} />
      </div>
    );
  }

  // Client admin view
  if (isClientAdmin) {
    const clientScore = computeComplianceScore(clientItems.concat(employeeItems));
    return (
      <div className="space-y-5">
        <PageHeader title="Compliance" description="Company compliance status and requirements" actions={
          <Button size="sm" onClick={() => openAddItem('client')}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        } />
        <div className="flex items-start gap-4">
          <ComplianceScoreBadge score={clientScore} size="lg" />
          <div className="grid grid-cols-4 gap-3 flex-1">
            <ComplianceStatusCard title="Compliant" count={clientItems.filter(i => i.status === 'compliant').length} variant="compliant" />
            <ComplianceStatusCard title="At Risk" count={clientItems.filter(i => i.status === 'at_risk').length} variant="at_risk" />
            <ComplianceStatusCard title="Non-Compliant" count={clientItems.filter(i => i.status === 'non_compliant').length} variant="non_compliant" />
            <ComplianceStatusCard title="Pending" count={clientItems.filter(i => i.status === 'pending').length} variant="pending" />
          </div>
        </div>
        <Tabs defaultValue="company">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="company" className="mt-4">
            <ComplianceItemsTable items={clientItems} loading={itemsLoading} />
          </TabsContent>
          <TabsContent value="employees" className="mt-4">
            <ComplianceItemsTable items={employeeItems} loading={itemsLoading} />
          </TabsContent>
          <TabsContent value="calendar" className="mt-4">
            <ComplianceCalendar items={clientItems.concat(employeeItems)} licenses={licenses} />
          </TabsContent>
        </Tabs>
        <ComplianceItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} entityType="client" companyId={profile?.company_id || undefined} categories={CLIENT_CATEGORIES} />
      </div>
    );
  }

  // Super admin view - full dashboard
  return (
    <div className="space-y-5">
      <PageHeader title="Compliance Engine" description="Enterprise compliance management across all entities" actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openAddLicense('enterprise')}>
            <Key className="h-4 w-4 mr-1" /> Add License
          </Button>
          <Button size="sm" onClick={() => openAddItem('enterprise')}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>
      } />

      {/* Overview cards */}
      <div className="flex items-start gap-4 animate-in-up stagger-1">
        <ComplianceScoreBadge score={overallScore} size="lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          <ComplianceStatusCard title="Compliant" count={compliant} total={allItems.length} variant="compliant" />
          <ComplianceStatusCard title="At Risk" count={atRisk} variant="at_risk" />
          <ComplianceStatusCard title="Non-Compliant" count={nonCompliant} variant="non_compliant" />
          <ComplianceStatusCard title="Pending" count={pending} variant="pending" />
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-in-up stagger-2">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Risk & Alerts</TabsTrigger>
          <TabsTrigger value="enterprise" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Enterprise</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Clients</TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Employees</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Calendar</TabsTrigger>
          <TabsTrigger value="licenses" className="gap-1.5"><Key className="h-3.5 w-3.5" /> Licenses</TabsTrigger>
          <TabsTrigger value="form8973" className="gap-1.5"><FileCheck className="h-3.5 w-3.5" /> Form 8973</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <RiskDashboard items={allItems} licenses={licenses} />
        </TabsContent>

        <TabsContent value="enterprise" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">AtlasOne Enterprise Compliance</h3>
              <p className="text-sm text-muted-foreground">PEO-level licensing, registrations, and filings</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openAddLicense('enterprise')}>
                <Key className="h-4 w-4 mr-1" /> Add License
              </Button>
              <Button size="sm" onClick={() => openAddItem('enterprise')}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </div>
          <ComplianceItemsTable items={enterpriseItems} loading={itemsLoading} />
        </TabsContent>

        <TabsContent value="clients" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Client Company Compliance</h3>
              <p className="text-sm text-muted-foreground">Worksite employer registrations, agreements, and benefits compliance</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openAddLicense('client')}>
                <Key className="h-4 w-4 mr-1" /> Add Registration
              </Button>
              <Button size="sm" onClick={() => openAddItem('client')}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          </div>
          <ComplianceItemsTable items={clientItems} loading={itemsLoading} showCompany />
        </TabsContent>

        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Employee Compliance</h3>
              <p className="text-sm text-muted-foreground">I-9, W-4, new hire reporting, classification, and work authorization</p>
            </div>
            <Button size="sm" onClick={() => openAddItem('employee')}>
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </div>
          <ComplianceItemsTable items={employeeItems} loading={itemsLoading} showCompany showEntity />
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <ComplianceCalendar items={allItems} licenses={licenses} />
        </TabsContent>

        <TabsContent value="licenses" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Licenses & Registrations Hub</h3>
              <p className="text-sm text-muted-foreground">Central registry for all tax accounts, state registrations, and PEO licenses</p>
            </div>
            <Button size="sm" onClick={() => openAddLicense('enterprise')}>
              <Plus className="h-4 w-4 mr-1" /> Add License
            </Button>
          </div>
          <LicensesTable licenses={licenses} loading={licensesLoading} />
        </TabsContent>

        <TabsContent value="form8973" className="mt-4">
          <Form8973Tab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ComplianceItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        entityType={itemDialogEntity}
        categories={getCategoriesForEntity(itemDialogEntity)}
      />
      <LicenseDialog
        open={addLicenseOpen}
        onOpenChange={setAddLicenseOpen}
        entityType={licenseDialogEntity}
      />
    </div>
  );
}
