import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { usePayrollRuns, centsToUSD, type PayrollRunRow } from '@/hooks/usePayrollRuns';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGate } from '@/components/RoleGate';
import { NewPayrollRunDialog } from '@/components/payroll/NewPayrollRunDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Clock, Loader2, AlertTriangle, Search, Filter,
  Calendar, DollarSign, Zap, FileWarning, ChevronRight,
  CheckCircle2, Building2, Play, ShieldAlert, UserX,
  FileCheck, Receipt, TrendingUp, RotateCcw, ListChecks,
  ArrowUpRight
} from 'lucide-react';
import { format, parseISO, isBefore, differenceInHours } from 'date-fns';

// ── Quick filter presets ───────────────────────────────────
type QuickFilter = 'all' | 'ready' | 'blocked_compliance' | 'needs_review' | 'off_cycle' | 'no_invoice'
  | 'upcoming' | 'open' | 'approvals' | 'late' | 'expedited' | 'manual_check' | 'processing' | 'completed' | 'blocked';

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string; color?: string }> = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready to Process' },
  { key: 'blocked_compliance', label: 'Blocked by Compliance', color: 'text-destructive' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'off_cycle', label: 'Off-Cycle Pending' },
  { key: 'no_invoice', label: 'Invoice Not Generated' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'late', label: 'Late', color: 'text-destructive' },
  { key: 'expedited', label: 'Expedited', color: 'text-warning' },
  { key: 'manual_check', label: 'Manual Checks', color: 'text-destructive' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
];

function matchesQuickFilter(run: PayrollRunRow, filter: QuickFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'ready': return ['client_approved', 'admin_approved', 'auto_approved'].includes(run.status) && run.exception_count === 0;
    case 'blocked_compliance': return run.exception_count > 0;
    case 'needs_review': return ['awaiting_approval', 'pending_client_approval', 'pending_admin_approval', 'awaiting_timecard_approval'].includes(run.status);
    case 'off_cycle': return run.run_type === 'off_cycle';
    case 'no_invoice': return run.invoice_status === 'none' && ['completed', 'paid', 'processing'].includes(run.status);
    case 'upcoming': return run.status === 'upcoming';
    case 'approvals': return ['awaiting_timecard_approval', 'awaiting_approval', 'pending_client_approval', 'pending_admin_approval'].includes(run.status);
    case 'late': return run.status === 'late_submission';
    case 'expedited': return ['expedited_funding_required', 'expedited_processing'].includes(run.status);
    case 'manual_check': return run.status === 'manual_check_required';
    case 'processing': return ['processing', 'submitting', 'submitted', 'funding', 'funded'].includes(run.status);
    case 'completed': return ['completed', 'paid'].includes(run.status);
    case 'blocked': return ['blocked', 'failed', 'voided'].includes(run.status);
    default: return true;
  }
}

function getDeadlineUrgency(deadline: string | null): 'none' | 'warning' | 'critical' | 'passed' {
  if (!deadline) return 'none';
  const dl = parseISO(deadline);
  if (isBefore(dl, new Date())) return 'passed';
  const h = differenceInHours(dl, new Date());
  return h <= 6 ? 'critical' : h <= 48 ? 'warning' : 'none';
}

function DeadlineTag({ deadline, label }: { deadline: string | null; label: string }) {
  if (!deadline) return null;
  const u = getDeadlineUrgency(deadline);
  const c = { none: 'text-muted-foreground', warning: 'text-warning', critical: 'text-destructive font-medium', passed: 'text-destructive font-bold' };
  return (
    <span className={`text-[10px] ${c[u]}`}>
      {label}: {format(parseISO(deadline), 'MMM d, h:mm a')} EST{u === 'passed' ? ' (PASSED)' : ''}
    </span>
  );
}

// ── Payroll Run Row ────────────────────────────────────────
function PayrollRunRow({
  run, onClick, selected, onSelect
}: {
  run: PayrollRunRow; onClick: () => void; selected: boolean; onSelect: (v: boolean) => void;
}) {
  const companyName = run.companies?.name ?? 'Unknown';
  const freqLabel = run.pay_frequency === 'semimonthly' ? 'Semi-Monthly' : run.pay_frequency === 'biweekly' ? 'Bi-Weekly' : run.pay_frequency;
  const isReady = ['client_approved', 'admin_approved', 'auto_approved'].includes(run.status) && run.exception_count === 0;

  return (
    <div className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 p-4">
        <RoleGate allowedRoles={['super_admin']}>
          <Checkbox checked={selected} onCheckedChange={v => onSelect(!!v)} className="shrink-0" />
        </RoleGate>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{companyName}</h3>
            <Badge variant="outline" className="text-[10px] capitalize shrink-0">{freqLabel}</Badge>
            <StatusBadge status={run.status as any} />
            {run.auto_approved && <Badge variant="secondary" className="text-[10px] shrink-0">Auto-Approve</Badge>}
            {run.is_expedited && <Badge className="text-[10px] bg-warning/10 text-warning shrink-0 border-0">Expedited</Badge>}
            {run.is_manual_check && <Badge className="text-[10px] bg-destructive/10 text-destructive shrink-0 border-0">Manual Check</Badge>}
            {run.run_type === 'off_cycle' && <Badge className="text-[10px] bg-accent text-accent-foreground shrink-0 border-0">Off-Cycle</Badge>}
            {isReady && <Badge className="text-[10px] bg-success/10 text-success shrink-0 border-0">Ready</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {run.pay_period_start} — {run.pay_period_end} · Check: {run.pay_date}
            </span>
            <span className="text-xs text-muted-foreground">· ID: {run.company_id.substring(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <DeadlineTag deadline={run.approval_deadline} label="Approval" />
            <DeadlineTag deadline={run.timecard_deadline} label="Timecard" />
            <DeadlineTag deadline={run.expedited_deadline} label="Wire" />
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-4 shrink-0 text-sm">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-muted-foreground">Employees</p>
            <p className="font-semibold tabular-nums">{run.employee_count}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Gross</p>
            <p className="font-semibold tabular-nums">{centsToUSD(run.gross_pay_cents)}</p>
          </div>
          {run.exception_count > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-destructive">Exceptions</p>
              <p className="font-semibold tabular-nums text-destructive">{run.exception_count}</p>
            </div>
          )}
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-muted-foreground">Funding</p>
            <StatusBadge status={run.funding_status === 'confirmed' ? 'funded' : 'pending'} />
          </div>
          <div className="text-right hidden lg:block">
            <p className="text-[10px] text-muted-foreground">Invoice</p>
            <Badge variant="outline" className="text-[10px] capitalize">{run.invoice_status}</Badge>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer" onClick={onClick} />
        </div>
      </div>
    </div>
  );
}

// ── KPI Cards ──────────────────────────────────────────────
function KPICards({ runs }: { runs: PayrollRunRow[] }) {
  const stats = useMemo(() => {
    const upcoming = runs.filter(r => r.status === 'upcoming').length;
    const ready = runs.filter(r => ['client_approved', 'admin_approved', 'auto_approved'].includes(r.status) && r.exception_count === 0).length;
    const blockedCompliance = runs.filter(r => r.exception_count > 0 && !['completed', 'paid', 'voided', 'reversed', 'failed'].includes(r.status)).length;
    const offCycle = runs.filter(r => r.run_type === 'off_cycle' && !['completed', 'paid', 'voided'].includes(r.status)).length;
    const invoicedToday = runs.filter(r => r.invoice_status !== 'none' && r.updated_at && new Date(r.updated_at).toDateString() === new Date().toDateString()).length;
    const processedToday = runs.filter(r => ['completed', 'paid'].includes(r.status) && r.updated_at && new Date(r.updated_at).toDateString() === new Date().toDateString()).length;
    const totalGross = runs.filter(r => !['voided', 'reversed', 'failed'].includes(r.status)).reduce((s, r) => s + r.gross_pay_cents, 0);
    const late = runs.filter(r => r.status === 'late_submission').length;
    return { upcoming, ready, blockedCompliance, offCycle, invoicedToday, processedToday, totalGross, late };
  }, [runs]);

  const cards = [
    { label: 'Upcoming Payrolls', value: stats.upcoming, icon: Calendar, color: 'text-muted-foreground' },
    { label: 'Ready to Process', value: stats.ready, icon: CheckCircle2, color: 'text-success' },
    { label: 'Blocked by Compliance', value: stats.blockedCompliance, icon: ShieldAlert, color: 'text-destructive' },
    { label: 'Off-Cycle Pending', value: stats.offCycle, icon: RotateCcw, color: 'text-warning' },
    { label: 'Invoices Generated Today', value: stats.invoicedToday, icon: Receipt, color: 'text-info' },
    { label: 'Processed Today', value: stats.processedToday, icon: TrendingUp, color: 'text-success' },
    { label: 'Late Payrolls', value: stats.late, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Total Pipeline', value: centsToUSD(stats.totalGross), icon: DollarSign, color: 'text-primary', isText: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="pt-3.5 pb-3 px-3">
            <div className={`flex items-center gap-1 ${c.color} mb-1`}>
              <c.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium truncate">{c.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Payroll() {
  const navigate = useNavigate();
  const { data: runs = [], isLoading, refetch } = usePayrollRuns();
  const { data: companies = [] } = useCompanies();
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fundingFilter, setFundingFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const filteredRuns = useMemo(() => {
    let result = runs;
    if (quickFilter !== 'all') result = result.filter(r => matchesQuickFilter(r, quickFilter));
    if (companyFilter !== 'all') result = result.filter(r => r.company_id === companyFilter);
    if (frequencyFilter !== 'all') result = result.filter(r => r.pay_frequency === frequencyFilter);
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter);
    if (fundingFilter !== 'all') result = result.filter(r => r.funding_status === fundingFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.companies?.name ?? '').toLowerCase().includes(q) ||
        r.company_id.toLowerCase().includes(q) ||
        r.pay_date.includes(q)
      );
    }
    return result;
  }, [runs, quickFilter, companyFilter, frequencyFilter, statusFilter, fundingFilter, searchQuery]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of QUICK_FILTERS) {
      counts[f.key] = runs.filter(r => matchesQuickFilter(r, f.key)).length;
    }
    return counts;
  }, [runs]);

  const toggleSelect = (id: string, v: boolean) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      v ? n.add(id) : n.delete(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredRuns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRuns.map(r => r.id)));
    }
  };

  const handleBulkProcess = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const toProcess = runs.filter(r =>
        selectedIds.has(r.id) &&
        ['client_approved', 'admin_approved', 'auto_approved'].includes(r.status)
      );

      if (toProcess.length === 0) {
        toast({ title: 'No approved payrolls selected', description: 'Only approved payroll runs can be processed.', variant: 'destructive' });
        setBulkProcessing(false);
        return;
      }

      let processed = 0;
      let failed = 0;

      for (const run of toProcess) {
        try {
          // Transition to processing
          const { error } = await supabase
            .from('payroll_runs')
            .update({ status: 'processing' as any } as any)
            .eq('id', run.id);
          if (error) throw error;

          // Generate invoice
          await supabase.functions.invoke('generate-invoice', {
            body: { payroll_run_id: run.id },
          });

          // Mark invoice generated
          await supabase
            .from('payroll_runs')
            .update({ invoice_status: 'generated' } as any)
            .eq('id', run.id);

          processed++;
        } catch {
          failed++;
        }
      }

      toast({
        title: `Bulk processing complete`,
        description: `${processed} processed, ${failed} failed out of ${toProcess.length} selected.`,
      });
      setSelectedIds(new Set());
      refetch();
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/generate-payroll-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      toast({ title: 'Payroll runs generated' });
      refetch();
    } catch {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  };

  const allStatuses = useMemo(() => {
    const set = new Set(runs.map(r => r.status));
    return Array.from(set).sort();
  }, [runs]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll Operations"
        description={isSuperAdmin ? "Enterprise payroll processing across all worksite employers" : "Manage your company's payroll runs"}
        actions={
          <div className="flex items-center gap-2">
            <RoleGate allowedRoles={['super_admin']}>
              <Button variant="outline" size="sm" onClick={handleAutoGenerate}>
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <Clock className="h-4 w-4 text-warning shrink-0" />
          <div>
            <p className="font-medium text-xs">Bi-Weekly Cutoff</p>
            <p className="text-xs text-muted-foreground whitespace-pre-line">
              {"Timecard Approval: Mon 10:00 AM EST\nPayroll Approval: Tue 5:00 PM EST\nWire (if late): Thurs 1:00 PM EST"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="font-medium text-xs">Semi-Monthly Cutoff</p>
            <p className="text-xs text-muted-foreground">Approval required 4 days before pay date at 5:00 PM EST</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <RoleGate allowedRoles={['super_admin']}>
        <KPICards runs={runs} />
      </RoleGate>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <RoleGate allowedRoles={['super_admin']}>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="All Companies" />
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
          <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Frequency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="semimonthly">Semi-Monthly</SelectItem>
            <SelectItem value="biweekly">Bi-Weekly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><ListChecks className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={fundingFilter} onValueChange={setFundingFilter}>
          <SelectTrigger className="w-[140px] h-9"><DollarSign className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Funding" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Funding</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick filter tabs */}
      <Tabs value={quickFilter} onValueChange={v => { setQuickFilter(v as QuickFilter); setSelectedIds(new Set()); }}>
        <TabsList className="flex-wrap h-auto gap-1">
          {QUICK_FILTERS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1">
              <span className={tab.color}>{tab.label}</span>
              {tabCounts[tab.key] > 0 && (
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] leading-none">{tabCounts[tab.key]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <Checkbox checked={selectedIds.size === filteredRuns.length} onCheckedChange={selectAll} />
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Separator orientation="vertical" className="h-5" />
          <Button size="sm" onClick={handleBulkProcess} disabled={bulkProcessing}>
            <Play className="h-3.5 w-3.5 mr-1" />
            {bulkProcessing ? 'Processing…' : 'Process Approved Payrolls'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {/* Payroll list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No payroll runs found</p>
          <p className="text-xs mt-1">
            {quickFilter !== 'all' ? 'No runs match these filters.' : 'Create a new payroll run or set up payroll schedules.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all header for super admin */}
          <RoleGate allowedRoles={['super_admin']}>
            <div className="flex items-center gap-3 px-4 py-1">
              <Checkbox
                checked={selectedIds.size === filteredRuns.length && filteredRuns.length > 0}
                onCheckedChange={selectAll}
              />
              <span className="text-xs text-muted-foreground">Select all ({filteredRuns.length})</span>
            </div>
          </RoleGate>
          {filteredRuns.map(run => (
            <PayrollRunRow
              key={run.id}
              run={run}
              onClick={() => navigate(`/payroll/${run.id}`)}
              selected={selectedIds.has(run.id)}
              onSelect={v => toggleSelect(run.id, v)}
            />
          ))}
        </div>
      )}

      <NewPayrollRunDialog open={newRunOpen} onOpenChange={setNewRunOpen} />
    </div>
  );
}
