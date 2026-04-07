import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/StatCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart, Search, Users, AlertTriangle, DollarSign, FileText, CheckCircle2,
  Clock, Eye, Plus, Upload, Download, Calendar, ExternalLink, ShieldOff,
  Info, Save
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// ─── Mock data (scoped to a single company) ─────────────────

const MOCK_PLANS = [
  { id: '1', planType: 'Medical', carrier: 'Blue Cross', planName: 'PPO Gold', enrolledCount: 42, eligibleCount: 50, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 75, eeContribution: 25, monthlyPremiumCents: 125000 },
  { id: '2', planType: 'Dental', carrier: 'Delta Dental', planName: 'Basic', enrolledCount: 38, eligibleCount: 50, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 50, eeContribution: 50, monthlyPremiumCents: 8500 },
  { id: '3', planType: 'Vision', carrier: 'VSP', planName: 'Standard', enrolledCount: 30, eligibleCount: 50, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 100, eeContribution: 0, monthlyPremiumCents: 3200 },
  { id: '4', planType: '401k', carrier: 'Fidelity', planName: 'Safe Harbor', enrolledCount: 35, eligibleCount: 48, status: 'active', effectiveDate: '2026-01-01', renewalDate: '2027-01-01', erContribution: 4, eeContribution: 96, monthlyPremiumCents: 0 },
];

const MOCK_ENROLLED_EMPLOYEES = [
  { id: '1', mid: 'M5', name: 'John Smith', department: 'Engineering', planType: 'Medical', planName: 'PPO Gold', tier: 'Employee + Family', status: 'active', effectiveDate: '2026-01-01', monthlyPremiumCents: 125000, erPortionCents: 93750, eePortionCents: 31250 },
  { id: '2', mid: 'M5', name: 'John Smith', department: 'Engineering', planType: 'Dental', planName: 'Basic', tier: 'Employee + Spouse', status: 'active', effectiveDate: '2026-01-01', monthlyPremiumCents: 8500, erPortionCents: 4250, eePortionCents: 4250 },
  { id: '3', mid: 'M6', name: 'Sarah Johnson', department: 'Marketing', planType: 'Medical', planName: 'PPO Gold', tier: 'Employee Only', status: 'active', effectiveDate: '2026-01-01', monthlyPremiumCents: 65000, erPortionCents: 48750, eePortionCents: 16250 },
  { id: '4', mid: 'M7', name: 'Mike Davis', department: 'Sales', planType: 'Medical', planName: 'PPO Gold', tier: 'Employee + Child(ren)', status: 'active', effectiveDate: '2026-03-01', monthlyPremiumCents: 95000, erPortionCents: 71250, eePortionCents: 23750 },
  { id: '5', mid: 'M8', name: 'Lisa Chen', department: 'Engineering', planType: 'Vision', planName: 'Standard', tier: 'Employee Only', status: 'active', effectiveDate: '2026-01-01', monthlyPremiumCents: 3200, erPortionCents: 3200, eePortionCents: 0 },
  { id: '6', mid: 'M9', name: 'Tom Wilson', department: 'Operations', planType: '401k', planName: 'Safe Harbor', tier: 'N/A', status: 'active', effectiveDate: '2026-01-01', monthlyPremiumCents: 0, erPortionCents: 0, eePortionCents: 0 },
  { id: '7', mid: 'M6', name: 'Sarah Johnson', department: 'Marketing', planType: 'Dental', planName: 'Basic', tier: 'Employee Only', status: 'pending', effectiveDate: '2026-05-01', monthlyPremiumCents: 4500, erPortionCents: 2250, eePortionCents: 2250 },
];

const MOCK_ELIGIBLE_EMPLOYEES = [
  { id: '1', mid: 'M5', name: 'John Smith', department: 'Engineering', startDate: '2024-06-15', eligibleDate: '2024-09-15', enrolledPlans: ['Medical', 'Dental'], waivedPlans: ['Vision'] },
  { id: '2', mid: 'M6', name: 'Sarah Johnson', department: 'Marketing', startDate: '2025-03-01', eligibleDate: '2025-06-01', enrolledPlans: ['Medical'], waivedPlans: [] },
  { id: '3', mid: 'M7', name: 'Mike Davis', department: 'Sales', startDate: '2025-08-10', eligibleDate: '2025-11-10', enrolledPlans: ['Medical'], waivedPlans: ['Dental', 'Vision'] },
  { id: '4', mid: 'M8', name: 'Lisa Chen', department: 'Engineering', startDate: '2025-01-20', eligibleDate: '2025-04-20', enrolledPlans: ['Vision'], waivedPlans: ['Medical'] },
  { id: '5', mid: 'M9', name: 'Tom Wilson', department: 'Operations', startDate: '2024-11-01', eligibleDate: '2025-02-01', enrolledPlans: ['401k'], waivedPlans: [] },
  { id: '6', mid: 'M10', name: 'Amy Brown', department: 'HR', startDate: '2026-02-01', eligibleDate: '2026-05-01', enrolledPlans: [], waivedPlans: [] },
  { id: '7', mid: 'M11', name: 'James Lee', department: 'Finance', startDate: '2026-03-15', eligibleDate: '2026-06-15', enrolledPlans: [], waivedPlans: [] },
];

const MOCK_QLES = [
  { id: '1', mid: 'M6', employeeName: 'Sarah Johnson', qleType: 'Marriage', eventDate: '2026-04-15', requestDate: '2026-04-16', status: 'pending_review', documentsUploaded: true, coverageImpact: 'Add spouse to Medical, Dental', deadline: '2026-05-15' },
  { id: '2', mid: 'M9', employeeName: 'Tom Wilson', qleType: 'Birth/Adoption', eventDate: '2026-03-28', requestDate: '2026-03-29', status: 'approved', documentsUploaded: true, coverageImpact: 'Add dependent to Medical', deadline: '2026-04-28' },
  { id: '3', mid: 'M10', employeeName: 'Amy Brown', qleType: 'Loss of Coverage', eventDate: '2026-04-01', requestDate: '2026-04-02', status: 'pending_documents', documentsUploaded: false, coverageImpact: 'Enroll in Medical', deadline: '2026-05-01' },
  { id: '4', mid: 'M11', employeeName: 'James Lee', qleType: 'Divorce', eventDate: '2026-02-20', requestDate: '2026-02-25', status: 'denied', documentsUploaded: true, coverageImpact: 'Remove spouse from all plans', deadline: '2026-03-22' },
];

const MOCK_CONTRIBUTION_REPORTS = [
  { id: '1', month: '2026-03', totalPremiumsCents: 485000, erContributionsCents: 345000, eeDeductionsCents: 140000, enrolledCount: 42, avgEeCostCents: 3333 },
  { id: '2', month: '2026-02', totalPremiumsCents: 490000, erContributionsCents: 348000, eeDeductionsCents: 142000, enrolledCount: 43, avgEeCostCents: 3302 },
  { id: '3', month: '2026-01', totalPremiumsCents: 478000, erContributionsCents: 340000, eeDeductionsCents: 138000, enrolledCount: 41, avgEeCostCents: 3366 },
  { id: '4', month: '2025-12', totalPremiumsCents: 470000, erContributionsCents: 335000, eeDeductionsCents: 135000, enrolledCount: 40, avgEeCostCents: 3375 },
];

// Mock active employees for external benefits entry
const MOCK_ACTIVE_EMPLOYEES = [
  { id: '1', mid: 'M5', name: 'John Smith', department: 'Engineering', eeDeductionCents: 31250, erContributionCents: 93750, carrierName: 'Anthem Blue Cross', planType: 'Medical - PPO' },
  { id: '2', mid: 'M6', name: 'Sarah Johnson', department: 'Marketing', eeDeductionCents: 16250, erContributionCents: 48750, carrierName: 'Anthem Blue Cross', planType: 'Medical - PPO' },
  { id: '3', mid: 'M7', name: 'Mike Davis', department: 'Sales', eeDeductionCents: 23750, erContributionCents: 71250, carrierName: 'Kaiser', planType: 'Medical - HMO' },
  { id: '4', mid: 'M8', name: 'Lisa Chen', department: 'Engineering', eeDeductionCents: 12500, erContributionCents: 37500, carrierName: 'Anthem Blue Cross', planType: 'Medical - PPO' },
  { id: '5', mid: 'M9', name: 'Tom Wilson', department: 'Operations', eeDeductionCents: 18000, erContributionCents: 54000, carrierName: 'United Healthcare', planType: 'Medical - HDHP' },
  { id: '6', mid: 'M10', name: 'Amy Brown', department: 'HR', eeDeductionCents: 0, erContributionCents: 0, carrierName: '', planType: '' },
  { id: '7', mid: 'M11', name: 'James Lee', department: 'Finance', eeDeductionCents: 0, erContributionCents: 0, carrierName: '', planType: '' },
];


const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'border-emerald-500 text-emerald-600',
    pending: 'border-amber-500 text-amber-600',
    pending_review: 'border-amber-500 text-amber-600',
    pending_documents: 'border-orange-500 text-orange-600',
    approved: 'border-emerald-500 text-emerald-600',
    denied: 'border-destructive text-destructive',
    waived: 'border-muted-foreground text-muted-foreground',
  };
  return <Badge variant="outline" className={map[status] ?? ''}>{status.replace(/_/g, ' ')}</Badge>;
};

// ─── Main Component ───────────────────────────────────────────

export default function ClientBenefitsAdmin() {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');
  const [qleStatusFilter, setQleStatusFilter] = useState('all');
  const [hasExternalBenefits, setHasExternalBenefits] = useState(false);
  const [externalEmployeeData, setExternalEmployeeData] = useState(
    MOCK_ACTIVE_EMPLOYEES.map(e => ({
      ...e,
      eeDeductionCents: e.eeDeductionCents,
      erContributionCents: e.erContributionCents,
      carrierName: e.carrierName,
      planType: e.planType,
      verified: e.erContributionCents > 0,
    }))
  );

  const filteredEnrollments = useMemo(() => {
    return MOCK_ENROLLED_EMPLOYEES.filter(e => {
      if (planTypeFilter !== 'all' && e.planType !== planTypeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.mid.toLowerCase().includes(q) || e.department.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, planTypeFilter]);

  const filteredQLEs = useMemo(() => {
    return MOCK_QLES.filter(q => {
      if (qleStatusFilter !== 'all' && q.status !== qleStatusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return q.employeeName.toLowerCase().includes(s) || q.mid.toLowerCase().includes(s);
      }
      return true;
    });
  }, [search, qleStatusFilter]);

  if (role && role !== 'client_admin') return <Navigate to="/" replace />;

  // Summary metrics
  const totalEnrolled = MOCK_PLANS.reduce((s, p) => s + p.enrolledCount, 0);
  const totalEligible = MOCK_PLANS.reduce((s, p) => s + p.eligibleCount, 0);
  const pendingQLEs = MOCK_QLES.filter(q => q.status === 'pending_review' || q.status === 'pending_documents').length;
  const latestContrib = MOCK_CONTRIBUTION_REPORTS[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Benefits Administration"
        description="View your company's benefit plans, enrollments, and employee contributions"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Enrolled" value={String(totalEnrolled)} icon={Users} />
        <StatCard title="Eligible Employees" value={String(totalEligible)} icon={CheckCircle2} />
        <StatCard title="Open QLEs" value={String(pendingQLEs)} icon={AlertTriangle} />
        <StatCard title="Monthly ER Cost" value={fmt(latestContrib.erContributionsCents)} icon={DollarSign} />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="plans"><Heart className="h-3.5 w-3.5 mr-1" />Plans Offered</TabsTrigger>
          <TabsTrigger value="enrolled"><Users className="h-3.5 w-3.5 mr-1" />Enrolled Employees</TabsTrigger>
          <TabsTrigger value="eligible"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Eligible Employees</TabsTrigger>
          <TabsTrigger value="qle"><AlertTriangle className="h-3.5 w-3.5 mr-1" />QLE Submissions</TabsTrigger>
          <TabsTrigger value="contributions"><DollarSign className="h-3.5 w-3.5 mr-1" />Contribution Reports</TabsTrigger>
          <TabsTrigger value="external"><ExternalLink className="h-3.5 w-3.5 mr-1" />External Benefits</TabsTrigger>
        </TabsList>

        {/* ──── Tab 1: Plans Offered ──── */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Benefit Plans</CardTitle>
              <CardDescription>Plans currently offered to your employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {MOCK_PLANS.map(plan => (
                  <Card key={plan.id} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Heart className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">{plan.planType}</CardTitle>
                            <CardDescription className="text-xs">{plan.carrier} — {plan.planName}</CardDescription>
                          </div>
                        </div>
                        {statusBadge(plan.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Enrolled / Eligible</p>
                          <p className="font-semibold">{plan.enrolledCount} / {plan.eligibleCount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">ER / EE Split</p>
                          <p className="font-semibold">{plan.erContribution}% / {plan.eeContribution}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Effective Date</p>
                          <p className="font-medium">{plan.effectiveDate}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Renewal Date</p>
                          <p className="font-medium">{plan.renewalDate}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 2: Enrolled Employees ──── */}
        <TabsContent value="enrolled">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Enrolled Employees</CardTitle>
                  <CardDescription>Employees currently enrolled in benefit plans</CardDescription>
                </div>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search employee, MID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Coverage Tier</TableHead>
                    <TableHead>EE Monthly Cost</TableHead>
                    <TableHead>ER Monthly Cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No enrollments found</TableCell></TableRow>
                  ) : filteredEnrollments.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.mid}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.department}</TableCell>
                      <TableCell>
                        <span className="text-xs">{e.planType}</span>
                        <span className="text-muted-foreground text-xs ml-1">({e.planName})</span>
                      </TableCell>
                      <TableCell>{e.tier}</TableCell>
                      <TableCell className="tabular-nums">{fmt(e.eePortionCents)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(e.erPortionCents)}</TableCell>
                      <TableCell>{statusBadge(e.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 3: Eligible Employees ──── */}
        <TabsContent value="eligible">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Eligible Employees</CardTitle>
              <CardDescription>All employees eligible for benefit enrollment based on eligibility rules</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Eligible Date</TableHead>
                    <TableHead>Enrolled Plans</TableHead>
                    <TableHead>Waived Plans</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ELIGIBLE_EMPLOYEES.map(e => {
                    const isFullyEnrolled = e.enrolledPlans.length > 0 && e.waivedPlans.length === 0;
                    const notEnrolled = e.enrolledPlans.length === 0 && e.waivedPlans.length === 0;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.mid}</TableCell>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.department}</TableCell>
                        <TableCell>{e.startDate}</TableCell>
                        <TableCell>{e.eligibleDate}</TableCell>
                        <TableCell>
                          {e.enrolledPlans.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {e.enrolledPlans.map(p => (
                                <Badge key={p} variant="outline" className="border-emerald-500 text-emerald-600 text-xs">{p}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {e.waivedPlans.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {e.waivedPlans.map(p => (
                                <Badge key={p} variant="outline" className="border-muted-foreground text-muted-foreground text-xs">{p}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {notEnrolled ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">Pending Election</Badge>
                          ) : isFullyEnrolled ? (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-600">Enrolled</Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-500 text-blue-600">Partial</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 4: QLE Submissions ──── */}
        <TabsContent value="qle">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Qualifying Life Event Submissions</CardTitle>
                  <CardDescription>QLE requests from employees for mid-year benefit changes</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Submit QLE</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit a Qualifying Life Event</DialogTitle>
                      <DialogDescription>Report a qualifying life event for an employee's benefit change</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label>Employee</Label>
                        <Select><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>
                            {MOCK_ELIGIBLE_EMPLOYEES.map(e => <SelectItem key={e.id} value={e.mid}>{e.name} ({e.mid})</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>QLE Type</Label>
                        <Select><SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="marriage">Marriage</SelectItem>
                            <SelectItem value="birth">Birth/Adoption</SelectItem>
                            <SelectItem value="divorce">Divorce</SelectItem>
                            <SelectItem value="loss_coverage">Loss of Coverage</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Event Date</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Describe the qualifying life event and desired coverage changes..." />
                      </div>
                      <div>
                        <Label>Supporting Documents</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
                          <span className="text-xs text-muted-foreground">Marriage certificate, birth certificate, etc.</span>
                        </div>
                      </div>
                      <Button className="w-full">Submit QLE Request</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Select value={qleStatusFilter} onValueChange={setQleStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="pending_documents">Pending Documents</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>QLE Type</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Coverage Impact</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQLEs.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No QLE submissions found</TableCell></TableRow>
                  ) : filteredQLEs.map(q => (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs">{q.mid}</TableCell>
                      <TableCell className="font-medium">{q.employeeName}</TableCell>
                      <TableCell>{q.qleType}</TableCell>
                      <TableCell>{q.eventDate}</TableCell>
                      <TableCell>{q.requestDate}</TableCell>
                      <TableCell>
                        <span className="text-xs">{q.deadline}</span>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{q.coverageImpact}</TableCell>
                      <TableCell>
                        {q.documentsUploaded ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(q.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── Tab 5: Contribution Reports ──── */}
        <TabsContent value="contributions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Employee Contribution Cost Reports</CardTitle>
                  <CardDescription>Monthly breakdown of employer and employee benefit contributions</CardDescription>
                </div>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export Report</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Total Premiums</TableHead>
                    <TableHead>ER Contributions</TableHead>
                    <TableHead>EE Deductions</TableHead>
                    <TableHead>Avg EE Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CONTRIBUTION_REPORTS.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.month}</TableCell>
                      <TableCell className="tabular-nums">{r.enrolledCount}</TableCell>
                      <TableCell className="tabular-nums font-semibold">{fmt(r.totalPremiumsCents)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(r.erContributionsCents)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(r.eeDeductionsCents)}</TableCell>
                      <TableCell className="tabular-nums">{fmt(r.avgEeCostCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Per-plan breakdown for latest month */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Per-Plan Breakdown — {MOCK_CONTRIBUTION_REPORTS[0].month}</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {MOCK_PLANS.map(plan => (
                    <Card key={plan.id} className="border">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{plan.planType} — {plan.planName}</span>
                          <Badge variant="outline" className="text-xs">{plan.enrolledCount} enrolled</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">ER Share</p>
                            <p className="font-semibold">{plan.erContribution}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">EE Share</p>
                            <p className="font-semibold">{plan.eeContribution}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Carrier</p>
                            <p className="font-medium">{plan.carrier}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
