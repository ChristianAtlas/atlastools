import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { usePayrollRuns, centsToUSD, type PayrollRunRow, type PayrollRunStatus } from '@/hooks/usePayrollRuns';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGate } from '@/components/RoleGate';
import { NewPayrollRunDialog } from '@/components/payroll/NewPayrollRunDialog';
import {
  Plus, Clock, Loader2, AlertTriangle, Search, Filter,
  Calendar, Users, DollarSign, Zap, FileWarning, ChevronRight,
  CheckCircle2, AlertCircle, TrendingUp, Building2
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, differenceInHours } from 'date-fns';

// ── Status groups for queue tabs ────────────────────────────
const STATUS_GROUPS = {
  all: null,
  upcoming: ['upcoming'],
  open: ['open', 'open_for_timecards', 'draft', 'time_review', 'editing', 'preview'],
  approvals: ['awaiting_timecard_approval', 'awaiting_approval', 'pending_client_approval', 'pending_admin_approval'],
  late: ['late_submission'],
  expedited: ['expedited_funding_required', 'expedited_processing'],
  manual_check: ['manual_check_required'],
  processing: ['auto_approved', 'client_approved', 'admin_approved', 'funding', 'funded', 'submitting', 'submitted', 'processing'],
  completed: ['completed', 'paid'],
  blocked: ['blocked', 'failed', 'voided', 'reversed'],
} as const;

function getDeadlineUrgency(deadline: string | null): 'none' | 'warning' | 'critical' | 'passed' {
  if (!deadline) return 'none';
  const now = new Date();
  const dl = parseISO(deadline);
  if (isBefore(dl, now)) return 'passed';
  const hoursLeft = differenceInHours(dl, now);
  if (hoursLeft <= 6) return 'critical';
  if (hoursLeft <= 48) return 'warning';
  return 'none';
}

function DeadlineTag({ deadline, label }: { deadline: string | null; label: string }) {
  if (!deadline) return null;
  const urgency = getDeadlineUrgency(deadline);
  const colors = {
    none: 'text-muted-foreground',
    warning: 'text-warning',
    critical: 'text-destructive font-medium',
    passed: 'text-destructive font-bold',
  };
  return (
    <span className={`text-[10px] ${colors[urgency]}`}>
      {label}: {format(parseISO(deadline), 'MMM d, h:mm a')} EST
      {urgency === 'passed' && ' (PASSED)'}
    </span>
  );
}

function PayrollRunCard({ run, onClick }: { run: PayrollRunRow; onClick: () => void }) {
  const companyName = run.companies?.name ?? 'Unknown';
  const freqLabel = run.pay_frequency === 'semimonthly' ? 'Semi-Monthly' : run.pay_frequency === 'biweekly' ? 'Bi-Weekly' : run.pay_frequency;
  
  return (
    <div
      onClick={onClick}
      className="rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{companyName}</h3>
            <Badge variant="outline" className="text-[10px] capitalize shrink-0">{freqLabel}</Badge>
            {run.auto_approved && <Badge variant="secondary" className="text-[10px] shrink-0">Auto-Approve</Badge>}
            {run.is_expedited && <Badge className="text-[10px] bg-warning/10 text-warning shrink-0">Expedited</Badge>}
            {run.is_manual_check && <Badge className="text-[10px] bg-destructive/10 text-destructive shrink-0">Manual Check</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {run.pay_period_start} — {run.pay_period_end} · Pay date: {run.pay_date}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <DeadlineTag deadline={run.approval_deadline} label="Approval" />
            <DeadlineTag deadline={run.timecard_deadline} label="Timecard" />
            <DeadlineTag deadline={run.expedited_deadline} label="Wire" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={run.status as any} />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-5 text-sm">
        <div>
          <p className="text-[10px] text-muted-foreground">Gross Pay</p>
          <p className="font-semibold tabular-nums text-sm">{centsToUSD(run.gross_pay_cents)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Net Pay</p>
          <p className="font-semibold tabular-nums text-sm">{centsToUSD(run.net_pay_cents)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Employees</p>
          <p className="font-semibold tabular-nums text-sm">{run.employee_count}</p>
        </div>
        {run.exception_count > 0 && (
          <div>
            <p className="text-[10px] text-destructive">Exceptions</p>
            <p className="font-semibold tabular-nums text-sm text-destructive">{run.exception_count}</p>
          </div>
        )}
        {run.readiness_score > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground">Readiness</p>
            <p className={`font-semibold tabular-nums text-sm ${run.readiness_score >= 80 ? 'text-success' : run.readiness_score >= 50 ? 'text-warning' : 'text-destructive'}`}>
              {run.readiness_score}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatSummary({ runs }: { runs: PayrollRunRow[] }) {
  const stats = useMemo(() => {
    const open = runs.filter(r => ['open', 'open_for_timecards', 'draft', 'editing'].includes(r.status));
    const pendingApproval = runs.filter(r => ['awaiting_approval', 'pending_client_approval', 'pending_admin_approval', 'awaiting_timecard_approval'].includes(r.status));
    const late = runs.filter(r => r.status === 'late_submission');
    const expedited = runs.filter(r => ['expedited_funding_required', 'expedited_processing'].includes(r.status));
    const manualCheck = runs.filter(r => r.status === 'manual_check_required');
    const totalGross = runs.filter(r => !['voided', 'reversed', 'failed'].includes(r.status))
      .reduce((s, r) => s + r.gross_pay_cents, 0);

    return { open: open.length, pendingApproval: pendingApproval.length, late: late.length, expedited: expedited.length, manualCheck: manualCheck.length, totalGross };
  }, [runs]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {[
        { label: 'Open Runs', value: stats.open, icon: Calendar, color: 'text-info' },
        { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: 'text-warning' },
        { label: 'Late', value: stats.late, icon: AlertTriangle, color: 'text-destructive' },
        { label: 'Expedited', value: stats.expedited, icon: Zap, color: 'text-warning' },
        { label: 'Manual Checks', value: stats.manualCheck, icon: FileWarning, color: 'text-destructive' },
        { label: 'Total Gross', value: centsToUSD(stats.totalGross), icon: DollarSign, color: 'text-success', isText: true },
      ].map(s => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-3 px-3">
            <div className={`flex items-center gap-1.5 ${s.color} mb-1`}>
              <s.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">{s.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{(s as any).isText ? s.value : s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Payroll() {
  const navigate = useNavigate();
  const { data: runs = [], isLoading } = usePayrollRuns();
  const { data: companies = [] } = useCompanies();
  const { isSuperAdmin, isClientAdmin } = useAuth();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRuns = useMemo(() => {
    let result = runs;

    // Tab filter
    const statusGroup = STATUS_GROUPS[activeTab as keyof typeof STATUS_GROUPS];
    if (statusGroup) {
      result = result.filter(r => (statusGroup as string[]).includes(r.status));
    }

    // Company filter
    if (companyFilter !== 'all') {
      result = result.filter(r => r.company_id === companyFilter);
    }

    // Frequency filter
    if (frequencyFilter !== 'all') {
      result = result.filter(r => r.pay_frequency === frequencyFilter);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.companies?.name ?? '').toLowerCase().includes(q) ||
        r.pay_date.includes(q)
      );
    }

    return result;
  }, [runs, activeTab, companyFilter, frequencyFilter, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: runs.length };
    for (const [key, statuses] of Object.entries(STATUS_GROUPS)) {
      if (!statuses) continue;
      counts[key] = runs.filter(r => (statuses as string[]).includes(r.status)).length;
    }
    return counts;
  }, [runs]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll Operations"
        description={isSuperAdmin ? "Enterprise payroll management across all companies" : "Manage your company's payroll runs"}
        actions={
          <div className="flex items-center gap-2">
            <RoleGate allowedRoles={['super_admin']}>
              <Button variant="outline" size="sm" onClick={() => {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                // trigger auto-generation via edge function
                fetch(`${supabaseUrl}/functions/v1/generate-payroll-runs`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
                }).then(() => window.location.reload());
              }}>
                <Zap className="h-4 w-4 mr-1.5" />Auto-Generate Runs
              </Button>
            </RoleGate>
            <Button size="sm" onClick={() => setNewRunOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />New Payroll Run
            </Button>
          </div>
        }
      />

      {/* Cutoff notices */}
      <div className="grid gap-3 sm:grid-cols-2 animate-in-up stagger-1">
        <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <Clock className="h-4 w-4 text-warning shrink-0" />
          <div>
            <p className="font-medium text-xs">Bi-Weekly Cutoff</p>
            <p className="text-xs text-muted-foreground">Payroll approval: Tuesday 5:00 PM EST · Timecards: Monday 10:00 AM EST</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm">
          <Calendar className="h-4 w-4 text-info shrink-0" />
          <div>
            <p className="font-medium text-xs">Semi-Monthly Cutoff</p>
            <p className="text-xs text-muted-foreground">Approval required 4 days before pay date at 5:00 PM EST</p>
          </div>
        </div>
      </div>

      {/* Stats summary (super admin only) */}
      <RoleGate allowedRoles={['super_admin']}>
        <div className="animate-in-up stagger-2">
          <StatSummary runs={runs} />
        </div>
      </RoleGate>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap animate-in-up stagger-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company or pay date..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <RoleGate allowedRoles={['super_admin']}>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.filter(c => c.status === 'active').map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RoleGate>
        <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Frequencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="semimonthly">Semi-Monthly</SelectItem>
            <SelectItem value="biweekly">Bi-Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Queue tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-in-up stagger-3">
        <TabsList className="flex-wrap h-auto gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'open', label: 'Open' },
            { key: 'approvals', label: 'Approvals' },
            { key: 'late', label: 'Late', color: 'text-destructive' },
            { key: 'expedited', label: 'Expedited', color: 'text-warning' },
            { key: 'manual_check', label: 'Manual Checks', color: 'text-destructive' },
            { key: 'processing', label: 'Processing' },
            { key: 'completed', label: 'Completed' },
            { key: 'blocked', label: 'Blocked' },
          ].map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1">
              <span className={(tab as any).color}>{tab.label}</span>
              {tabCounts[tab.key] > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">
                  {tabCounts[tab.key]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No payroll runs found</p>
            <p className="text-xs mt-1">
              {activeTab !== 'all' ? 'No runs in this category.' : 'Create a new payroll run or set up payroll schedules.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredRuns.map(run => (
              <PayrollRunCard
                key={run.id}
                run={run}
                onClick={() => navigate(`/payroll/${run.id}`)}
              />
            ))}
          </div>
        )}
      </Tabs>

      <NewPayrollRunDialog open={newRunOpen} onOpenChange={setNewRunOpen} />
    </div>
  );
}
