import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/StatCard';
import {
  Heart, Search, FileText, Users, Shield, AlertTriangle, Clock, CheckCircle2,
  Building2, DollarSign, Calendar, ClipboardList, Upload, Download, Eye,
  Plus, Edit2, MoreHorizontal, ArrowRight, RefreshCw, Info
} from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { useDebounce } from '@/hooks/useDebounce';

// ─── Mock data ───────────────────────────────────────────────

const MOCK_PLANS = [
  { id: '1', companyId: 'c1', cid: 'C2', companyName: 'Acme Corp', planType: 'Medical', carrier: 'Blue Cross', planName: 'PPO Gold', enrolledCount: 42, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 75, eeContribution: 25 },
  { id: '2', companyId: 'c1', cid: 'C2', companyName: 'Acme Corp', planType: 'Dental', carrier: 'Delta Dental', planName: 'Basic', enrolledCount: 38, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 50, eeContribution: 50 },
  { id: '3', companyId: 'c1', cid: 'C2', companyName: 'Acme Corp', planType: 'Vision', carrier: 'VSP', planName: 'Standard', enrolledCount: 30, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 100, eeContribution: 0 },
  { id: '4', companyId: 'c1', cid: 'C2', companyName: 'Acme Corp', planType: '401k', carrier: 'Fidelity', planName: 'Safe Harbor', enrolledCount: 35, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 4, eeContribution: 96 },
  { id: '5', companyId: 'c2', cid: 'C3', companyName: 'TechStart LLC', planType: 'Medical', carrier: 'Aetna', planName: 'HDHP', enrolledCount: 18, status: 'active', effectiveDate: '2026-03-01', renewalDate: '2027-03-01', erContribution: 60, eeContribution: 40 },
  { id: '6', companyId: 'c2', cid: 'C3', companyName: 'TechStart LLC', planType: 'Dental', carrier: 'MetLife', planName: 'Plus', enrolledCount: 15, status: 'active', effectiveDate: '2026-03-01', renewalDate: '2027-03-01', erContribution: 50, eeContribution: 50 },
];

const MOCK_ENROLLMENTS = [
  { id: '1', mid: 'M5', employeeName: 'John Smith', cid: 'C2', companyName: 'Acme Corp', planType: 'Medical', planName: 'PPO Gold', tier: 'Employee + Family', status: 'active', effectiveDate: '2026-01-01', monthlyPremium: 125000, erPortion: 93750, eePortion: 31250 },
  { id: '2', mid: 'M5', employeeName: 'John Smith', cid: 'C2', companyName: 'Acme Corp', planType: 'Dental', planName: 'Basic', tier: 'Employee + Spouse', status: 'active', effectiveDate: '2026-01-01', monthlyPremium: 8500, erPortion: 4250, eePortion: 4250 },
  { id: '3', mid: 'M6', employeeName: 'Sarah Johnson', cid: 'C2', companyName: 'Acme Corp', planType: 'Medical', planName: 'PPO Gold', tier: 'Employee Only', status: 'pending', effectiveDate: '2026-05-01', monthlyPremium: 65000, erPortion: 48750, eePortion: 16250 },
  { id: '4', mid: 'M7', employeeName: 'Mike Davis', cid: 'C3', companyName: 'TechStart LLC', planType: 'Medical', planName: 'HDHP', tier: 'Employee + Child(ren)', status: 'active', effectiveDate: '2026-03-01', monthlyPremium: 95000, erPortion: 57000, eePortion: 38000 },
  { id: '5', mid: 'M8', employeeName: 'Lisa Chen', cid: 'C2', companyName: 'Acme Corp', planType: 'Medical', planName: 'PPO Gold', tier: 'Employee Only', status: 'terminated', effectiveDate: '2026-01-01', monthlyPremium: 65000, erPortion: 48750, eePortion: 16250 },
];

const MOCK_QLES = [
  { id: '1', mid: 'M6', employeeName: 'Sarah Johnson', cid: 'C2', qleType: 'Marriage', eventDate: '2026-04-15', requestDate: '2026-04-16', status: 'pending_review', documentsUploaded: true, coverageImpact: 'Add spouse to Medical, Dental' },
  { id: '2', mid: 'M9', employeeName: 'Tom Wilson', cid: 'C3', qleType: 'Birth/Adoption', eventDate: '2026-03-28', requestDate: '2026-03-29', status: 'approved', documentsUploaded: true, coverageImpact: 'Add dependent to Medical' },
  { id: '3', mid: 'M10', employeeName: 'Amy Brown', cid: 'C2', qleType: 'Loss of Coverage', eventDate: '2026-04-01', requestDate: '2026-04-02', status: 'pending_documents', documentsUploaded: false, coverageImpact: 'Enroll in Medical' },
  { id: '4', mid: 'M11', employeeName: 'James Lee', cid: 'C2', qleType: 'Divorce', eventDate: '2026-02-20', requestDate: '2026-02-25', status: 'denied', documentsUploaded: true, coverageImpact: 'Remove spouse from all plans' },
];

const MOCK_COBRA = [
  { id: '1', mid: 'M5', employeeName: 'Mark Thompson', cid: 'C2', qualifyingEvent: 'Termination', eventDate: '2026-03-15', electionDeadline: '2026-05-14', status: 'election_pending', coverageType: 'Medical + Dental', monthlyPremium: 185000 },
  { id: '2', mid: 'M12', employeeName: 'Karen White', cid: 'C3', qualifyingEvent: 'Reduction in Hours', eventDate: '2026-02-01', electionDeadline: '2026-04-02', status: 'elected', coverageType: 'Medical', monthlyPremium: 72000 },
  { id: '3', mid: 'M13', employeeName: 'David Park', cid: 'C2', qualifyingEvent: 'Termination', eventDate: '2026-01-15', electionDeadline: '2026-03-16', status: 'declined', coverageType: 'Medical + Dental + Vision', monthlyPremium: 210000 },
];

const MOCK_ACA_TRACKING = [
  { id: '1', cid: 'C2', companyName: 'Acme Corp', aleStatus: 'ALE', ftEmployees: 42, ptEmployees: 8, measurementPeriod: 'Standard', affordabilityStatus: 'compliant', mvStatus: 'compliant', filingStatus: '1095-C Filed', filingYear: 2025 },
  { id: '2', cid: 'C3', companyName: 'TechStart LLC', aleStatus: 'Non-ALE', ftEmployees: 18, ptEmployees: 3, measurementPeriod: 'N/A', affordabilityStatus: 'n/a', mvStatus: 'n/a', filingStatus: 'Not Required', filingYear: 2025 },
];

const MOCK_CONTRIBUTIONS = [
  { id: '1', cid: 'C2', companyName: 'Acme Corp', month: '2026-03', totalPremiums: 485000, erContributions: 345000, eeDeductions: 140000, imputedIncome: 12500, payrollSynced: true, discrepancy: 0 },
  { id: '2', cid: 'C2', companyName: 'Acme Corp', month: '2026-02', totalPremiums: 490000, erContributions: 348000, eeDeductions: 142000, imputedIncome: 12500, payrollSynced: true, discrepancy: 0 },
  { id: '3', cid: 'C3', companyName: 'TechStart LLC', month: '2026-03', totalPremiums: 225000, erContributions: 135000, eeDeductions: 90000, imputedIncome: 0, payrollSynced: false, discrepancy: 2500 },
];

const MOCK_CARRIER_FILES = [
  { id: '1', carrier: 'Blue Cross', fileType: '834 EDI', lastSent: '2026-04-01', status: 'success', records: 42, errors: 0 },
  { id: '2', carrier: 'Delta Dental', fileType: '834 EDI', lastSent: '2026-04-01', status: 'success', records: 38, errors: 0 },
  { id: '3', carrier: 'Aetna', fileType: '834 EDI', lastSent: '2026-04-01', status: 'error', records: 18, errors: 2 },
  { id: '4', carrier: 'Fidelity', fileType: 'Census', lastSent: '2026-03-28', status: 'success', records: 35, errors: 0 },
];

const MOCK_DOCUMENTS = [
  { id: '1', title: 'Acme Corp - Medical SPD 2026', type: 'SPD', carrier: 'Blue Cross', cid: 'C2', uploadDate: '2026-01-05', version: 2 },
  { id: '2', title: 'Acme Corp - Dental SBC', type: 'SBC', carrier: 'Delta Dental', cid: 'C2', uploadDate: '2026-01-05', version: 1 },
  { id: '3', title: 'TechStart - Medical SPD 2026', type: 'SPD', carrier: 'Aetna', cid: 'C3', uploadDate: '2026-03-01', version: 1 },
  { id: '4', title: 'Blue Cross Carrier Contract', type: 'Contract', carrier: 'Blue Cross', cid: 'C2', uploadDate: '2025-12-15', version: 3 },
];

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'border-emerald-500 text-emerald-600',
    pending: 'border-amber-500 text-amber-600',
    pending_review: 'border-amber-500 text-amber-600',
    pending_documents: 'border-orange-500 text-orange-600',
    approved: 'border-emerald-500 text-emerald-600',
    denied: 'border-destructive text-destructive',
    terminated: 'border-muted-foreground text-muted-foreground',
    elected: 'border-emerald-500 text-emerald-600',
    election_pending: 'border-amber-500 text-amber-600',
    declined: 'border-muted-foreground text-muted-foreground',
    compliant: 'border-emerald-500 text-emerald-600',
    success: 'border-emerald-500 text-emerald-600',
    error: 'border-destructive text-destructive',
    'n/a': 'border-muted-foreground text-muted-foreground',
  };
  return <Badge variant="outline" className={map[status] ?? ''}>{status.replace(/_/g, ' ')}</Badge>;
};

// ─── Main Component ───────────────────────────────────────────

export default function BenefitsAdmin() {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [cidFilter, setCidFilter] = useState('all');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');

  if (role && role !== 'super_admin') return <Navigate to="/" replace />;

  // Summary metrics
  const pendingEnrollments = MOCK_ENROLLMENTS.filter(e => e.status === 'pending').length;
  const pendingQLEs = MOCK_QLES.filter(q => q.status === 'pending_review' || q.status === 'pending_documents').length;
  const cobraActive = MOCK_COBRA.filter(c => c.status === 'elected' || c.status === 'election_pending').length;
  const carrierErrors = MOCK_CARRIER_FILES.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benefits Administration"
        description="Manage benefits enrollments, compliance, and carrier administration"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending Enrollments" value={pendingEnrollments} icon={<Users className="h-5 w-5 text-primary" />} />
        <StatCard title="Open QLEs" value={pendingQLEs} icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} />
        <StatCard title="COBRA Active/Pending" value={cobraActive} icon={<Shield className="h-5 w-5 text-primary" />} />
        <StatCard title="Carrier File Errors" value={carrierErrors} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search CID, employee, carrier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={cidFilter} onValueChange={setCidFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All CIDs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All CIDs</SelectItem>
            <SelectItem value="C2">C2 – Acme Corp</SelectItem>
            <SelectItem value="C3">C3 – TechStart</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planTypeFilter} onValueChange={setPlanTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Plans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="Medical">Medical</SelectItem>
            <SelectItem value="Dental">Dental</SelectItem>
            <SelectItem value="Vision">Vision</SelectItem>
            <SelectItem value="401k">401k</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><Building2 className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="packages"><Heart className="h-3.5 w-3.5 mr-1" />Packages</TabsTrigger>
          <TabsTrigger value="enrollments"><Users className="h-3.5 w-3.5 mr-1" />Enrollments</TabsTrigger>
          <TabsTrigger value="qle"><AlertTriangle className="h-3.5 w-3.5 mr-1" />QLEs</TabsTrigger>
          <TabsTrigger value="cobra"><Shield className="h-3.5 w-3.5 mr-1" />COBRA</TabsTrigger>
          <TabsTrigger value="aca"><ClipboardList className="h-3.5 w-3.5 mr-1" />ACA</TabsTrigger>
          <TabsTrigger value="contributions"><DollarSign className="h-3.5 w-3.5 mr-1" />Contributions</TabsTrigger>
          <TabsTrigger value="carriers"><RefreshCw className="h-3.5 w-3.5 mr-1" />Carriers</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1" />Documents</TabsTrigger>
          <TabsTrigger value="reports"><ClipboardList className="h-3.5 w-3.5 mr-1" />Reports</TabsTrigger>
        </TabsList>

        {/* ──── Tab 1: Company Benefits Overview ──── */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Client Company Benefits Overview</h3>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Enroll Company</Button>
            </div>
            {['C2', 'C3'].filter(c => cidFilter === 'all' || cidFilter === c).map(cid => {
              const plans = MOCK_PLANS.filter(p => p.cid === cid);
              const company = plans[0];
              if (!company) return null;
              return (
                <Card key={cid}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{cid} – {company.companyName}</CardTitle>
                          <CardDescription>{plans.length} active benefit plans</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge('active')}
                        <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-1" /> View Details</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div><p className="text-muted-foreground">Plan Year</p><p className="font-medium">{company.effectiveDate} → {company.renewalDate}</p></div>
                      <div><p className="text-muted-foreground">Carriers</p><p className="font-medium">{[...new Set(plans.map(p => p.carrier))].join(', ')}</p></div>
                      <div><p className="text-muted-foreground">Total Enrolled</p><p className="font-semibold text-primary">{plans.reduce((s, p) => s + p.enrolledCount, 0)}</p></div>
                      <div><p className="text-muted-foreground">Renewal</p><p className="font-medium">{company.renewalDate}</p></div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan Type</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Plan Name</TableHead>
                          <TableHead>Enrolled</TableHead>
                          <TableHead>ER / EE Split</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.filter(p => planTypeFilter === 'all' || p.planType === planTypeFilter).map(plan => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.planType}</TableCell>
                            <TableCell>{plan.carrier}</TableCell>
                            <TableCell>{plan.planName}</TableCell>
                            <TableCell className="tabular-nums">{plan.enrolledCount}</TableCell>
                            <TableCell className="text-sm">{plan.erContribution}% / {plan.eeContribution}%</TableCell>
                            <TableCell>{statusBadge(plan.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ──── Tab 2: Benefit Package Configuration ──── */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Benefit Package Configuration</CardTitle>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Package</Button>
              </div>
              <CardDescription>Configure employer benefit offerings, eligibility, and carrier mappings</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CID</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Eligibility</TableHead>
                    <TableHead>Waiting Period</TableHead>
                    <TableHead>ER Contribution</TableHead>
                    <TableHead>Pre-Tax</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PLANS.filter(p => (cidFilter === 'all' || p.cid === cidFilter) && (planTypeFilter === 'all' || p.planType === planTypeFilter)).map(plan => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.cid}</TableCell>
                      <TableCell>{plan.planType}</TableCell>
                      <TableCell>{plan.carrier}</TableCell>
                      <TableCell>{plan.planName}</TableCell>
                      <TableCell className="text-sm">FT Employees</TableCell>
                      <TableCell className="text-sm">30 days</TableCell>
                      <TableCell className="tabular-nums">{plan.erContribution}%</TableCell>
                      <TableCell>{plan.planType !== '401k' ? 'Yes' : 'Yes (Trad)'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7"><Edit2 className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 3: Employee Enrollment Management ──── */}
        <TabsContent value="enrollments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Employee Enrollments</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Bulk Enroll</Button>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Enrollment</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Monthly Premium</TableHead>
                    <TableHead>ER / EE Split</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ENROLLMENTS.filter(e => (cidFilter === 'all' || e.cid === cidFilter) && (planTypeFilter === 'all' || e.planType === planTypeFilter)).map(enrollment => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">{enrollment.mid}</TableCell>
                      <TableCell>{enrollment.employeeName}</TableCell>
                      <TableCell>{enrollment.cid}</TableCell>
                      <TableCell>{enrollment.planType} – {enrollment.planName}</TableCell>
                      <TableCell className="text-sm">{enrollment.tier}</TableCell>
                      <TableCell className="tabular-nums">{fmt(enrollment.monthlyPremium)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{fmt(enrollment.erPortion)} / {fmt(enrollment.eePortion)}</TableCell>
                      <TableCell className="text-sm">{enrollment.effectiveDate}</TableCell>
                      <TableCell>{statusBadge(enrollment.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7"><FileText className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 4: Qualifying Life Events ──── */}
        <TabsContent value="qle">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Qualifying Life Events (QLEs)</CardTitle>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Log QLE</Button>
              </div>
              <CardDescription>Process and validate employee life events that trigger coverage changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Coverage Impact</TableHead>
                    <TableHead>Docs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_QLES.filter(q => cidFilter === 'all' || q.cid === cidFilter).map(qle => (
                    <TableRow key={qle.id}>
                      <TableCell className="font-medium">{qle.mid}</TableCell>
                      <TableCell>{qle.employeeName}</TableCell>
                      <TableCell>{qle.cid}</TableCell>
                      <TableCell className="font-medium">{qle.qleType}</TableCell>
                      <TableCell className="text-sm">{qle.eventDate}</TableCell>
                      <TableCell className="text-sm">{qle.requestDate}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{qle.coverageImpact}</TableCell>
                      <TableCell>
                        {qle.documentsUploaded
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      </TableCell>
                      <TableCell>{statusBadge(qle.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">Review</Button>
                          {qle.status === 'pending_review' && <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600">Approve</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 5: COBRA ──── */}
        <TabsContent value="cobra">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">COBRA Administration</CardTitle>
              <CardDescription>Manage COBRA-qualifying events, elections, and participant status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Qualifying Event</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Election Deadline</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Monthly Premium</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_COBRA.filter(c => cidFilter === 'all' || c.cid === cidFilter).map(cobra => (
                    <TableRow key={cobra.id}>
                      <TableCell className="font-medium">{cobra.mid}</TableCell>
                      <TableCell>{cobra.employeeName}</TableCell>
                      <TableCell>{cobra.cid}</TableCell>
                      <TableCell className="font-medium">{cobra.qualifyingEvent}</TableCell>
                      <TableCell className="text-sm">{cobra.eventDate}</TableCell>
                      <TableCell className="text-sm">{cobra.electionDeadline}</TableCell>
                      <TableCell className="text-sm">{cobra.coverageType}</TableCell>
                      <TableCell className="tabular-nums">{fmt(cobra.monthlyPremium)}</TableCell>
                      <TableCell>{statusBadge(cobra.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 6: ACA Compliance ──── */}
        <TabsContent value="aca">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">ACA Compliance Tracking</CardTitle>
                    <CardDescription>Monitor ALE status, measurement periods, affordability, and filing status</CardDescription>
                  </div>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Generate 1095-C</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CID</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>ALE Status</TableHead>
                      <TableHead>FT / PT</TableHead>
                      <TableHead>Measurement Period</TableHead>
                      <TableHead>Affordability</TableHead>
                      <TableHead>Minimum Value</TableHead>
                      <TableHead>Filing Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_ACA_TRACKING.filter(a => cidFilter === 'all' || a.cid === cidFilter).map(aca => (
                      <TableRow key={aca.id}>
                        <TableCell className="font-medium">{aca.cid}</TableCell>
                        <TableCell>{aca.companyName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={aca.aleStatus === 'ALE' ? 'border-primary text-primary' : ''}>{aca.aleStatus}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{aca.ftEmployees} / {aca.ptEmployees}</TableCell>
                        <TableCell className="text-sm">{aca.measurementPeriod}</TableCell>
                        <TableCell>{statusBadge(aca.affordabilityStatus)}</TableCell>
                        <TableCell>{statusBadge(aca.mvStatus)}</TableCell>
                        <TableCell className="text-sm">{aca.filingStatus}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                ACA compliance reports (1094-C, 1095-C) are generated annually. The next filing period opens January 2027 for tax year 2026.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        {/* ──── Tab 7: Contributions & Payroll ──── */}
        <TabsContent value="contributions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Contributions & Payroll Reconciliation</CardTitle>
                <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Sync Payroll</Button>
              </div>
              <CardDescription>Track employer/employee contributions and reconcile with payroll deductions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Total Premiums</TableHead>
                    <TableHead>ER Contributions</TableHead>
                    <TableHead>EE Deductions</TableHead>
                    <TableHead>Imputed Income</TableHead>
                    <TableHead>Payroll Synced</TableHead>
                    <TableHead>Discrepancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CONTRIBUTIONS.filter(c => cidFilter === 'all' || c.cid === cidFilter).map(contrib => (
                    <TableRow key={contrib.id}>
                      <TableCell className="font-medium">{contrib.cid}</TableCell>
                      <TableCell>{contrib.companyName}</TableCell>
                      <TableCell className="text-sm">{contrib.month}</TableCell>
                      <TableCell className="tabular-nums">{fmt(contrib.totalPremiums)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(contrib.erContributions)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(contrib.eeDeductions)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(contrib.imputedIncome)}</TableCell>
                      <TableCell>
                        {contrib.payrollSynced
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      </TableCell>
                      <TableCell className={`tabular-nums ${contrib.discrepancy > 0 ? 'text-destructive font-medium' : ''}`}>
                        {contrib.discrepancy > 0 ? fmt(contrib.discrepancy) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 8: Carrier File Status ──── */}
        <TabsContent value="carriers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Carrier File Status</CardTitle>
                <Button size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Resend Files</Button>
              </div>
              <CardDescription>Track 834 EDI and census file submissions to carriers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carrier</TableHead>
                    <TableHead>File Type</TableHead>
                    <TableHead>Last Sent</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CARRIER_FILES.map(file => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.carrier}</TableCell>
                      <TableCell>{file.fileType}</TableCell>
                      <TableCell className="text-sm">{file.lastSent}</TableCell>
                      <TableCell className="tabular-nums">{file.records}</TableCell>
                      <TableCell className={`tabular-nums ${file.errors > 0 ? 'text-destructive font-medium' : ''}`}>{file.errors}</TableCell>
                      <TableCell>{statusBadge(file.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                          {file.status === 'error' && <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive">Resolve</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 9: Documents & ID Cards ──── */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Benefits Documents</CardTitle>
                <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Upload Document</Button>
              </div>
              <CardDescription>Manage plan summaries, SBCs, carrier contracts, and employee ID cards</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DOCUMENTS.filter(d => cidFilter === 'all' || d.cid === cidFilter).map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">{doc.title}</TableCell>
                      <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                      <TableCell className="text-sm">{doc.carrier}</TableCell>
                      <TableCell className="font-medium">{doc.cid}</TableCell>
                      <TableCell className="text-sm">{doc.uploadDate}</TableCell>
                      <TableCell className="tabular-nums">v{doc.version}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7"><Download className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7"><Eye className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 10: Reports & Audits ──── */}
        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Enrollment Summary', desc: 'All current enrollments by plan type and CID', icon: Users },
              { title: 'Coverage Elections', desc: 'Employee tier and waiver elections', icon: CheckCircle2 },
              { title: 'Contribution Totals', desc: 'ER/EE contribution totals by period', icon: DollarSign },
              { title: 'Carrier Billing Support', desc: 'Reconciliation data for carrier billing', icon: RefreshCw },
              { title: 'ACA Compliance Report', desc: '1094-C / 1095-C generation and filing', icon: ClipboardList },
              { title: 'COBRA Compliance', desc: 'COBRA event tracking and election status', icon: Shield },
              { title: 'QLE Activity Log', desc: 'All qualifying life events and outcomes', icon: AlertTriangle },
              { title: 'Retroactive Changes', desc: 'All backdated enrollment changes with audit trail', icon: Clock },
              { title: 'Deduction Audit', desc: 'Pre-tax / post-tax deduction validation', icon: FileText },
            ].map(report => (
              <Card key={report.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <report.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{report.title}</CardTitle>
                      <CardDescription className="text-xs">{report.desc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7"><Download className="h-3 w-3 mr-1" /> CSV</Button>
                    <Button variant="outline" size="sm" className="text-xs h-7"><Download className="h-3 w-3 mr-1" /> PDF</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
