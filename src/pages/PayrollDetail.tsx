import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Check, AlertTriangle, ChevronRight,
  FileText, DollarSign, Users, Send, ShieldCheck, CreditCard,
  ClipboardList, Edit3, Eye, UserCheck, Landmark, CheckCircle2,
  Loader2, Ban, Zap, FileWarning, Timer, Download
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovalPanel } from '@/components/workflow/ApprovalPanel';
import { DeadlineCountdown } from '@/components/workflow/DeadlineCountdown';
import { InternalNotes } from '@/components/workflow/InternalNotes';
import { useInternalNotes, useAddInternalNote } from '@/hooks/useInternalNotes';
import { AuditTimeline, type AuditEntry } from '@/components/workflow/AuditTimeline';
import { RoleGate } from '@/components/RoleGate';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  usePayrollRun, usePayrollRunEmployees, useUpdatePayrollRunStatus,
  centsToUSD, type PayrollRunRow, type PayrollRunEmployeeRow, type PayrollRunStatus,
} from '@/hooks/usePayrollRuns';
import { useTimecards, useUpdateTimecard, useApproveTimecards, type TimecardRow } from '@/hooks/useTimecards';
import { useFundingEvents, useCreateFundingEvent, useConfirmFunding } from '@/hooks/useFundingEvents';
import { useAuditLogs, formatAuditChanges } from '@/hooks/useAuditLogs';
import { format, parseISO, differenceInHours, isBefore } from 'date-fns';

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);

// ── Timecard Section ────────────────────────────────────────
function TimecardSection({ timecards, userId }: { timecards: TimecardRow[]; userId?: string }) {
  const updateTimecard = useUpdateTimecard();
  const approveTimecards = useApproveTimecards();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pending = timecards.filter(t => t.approval_status === 'pending');
  const approved = timecards.filter(t => t.approval_status === 'approved');
  const missing = timecards.filter(t => t.regular_hours === 0 && t.overtime_hours === 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleApproveSelected = () => {
    if (!userId || selectedIds.size === 0) return;
    approveTimecards.mutate({ ids: Array.from(selectedIds), approvedBy: userId });
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {approved.length}/{timecards.length} Approved
          </Badge>
          {missing.length > 0 && (
            <Badge className="text-xs bg-destructive/10 text-destructive">
              {missing.length} Missing Hours
            </Badge>
          )}
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={handleApproveSelected} disabled={approveTimecards.isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Approve Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2.5 w-10" />
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">OT</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">PTO</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {timecards.map(tc => {
              const name = tc.employees ? `${tc.employees.first_name} ${tc.employees.last_name}` : 'Unknown';
              const isPending = tc.approval_status === 'pending';
              return (
                <tr key={tc.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    {isPending && <Checkbox checked={selectedIds.has(tc.id)} onCheckedChange={() => toggleSelect(tc.id)} />}
                  </td>
                  <td className="px-3 py-2.5 font-medium">{name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {isPending ? (
                      <Input
                        type="number"
                        className="w-16 h-7 text-right text-xs inline-block"
                        defaultValue={tc.regular_hours}
                        onBlur={e => updateTimecard.mutate({ id: tc.id, regular_hours: Number(e.target.value) } as any)}
                      />
                    ) : tc.regular_hours}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {isPending ? (
                      <Input
                        type="number"
                        className="w-16 h-7 text-right text-xs inline-block"
                        defaultValue={tc.overtime_hours}
                        onBlur={e => updateTimecard.mutate({ id: tc.id, overtime_hours: Number(e.target.value) } as any)}
                      />
                    ) : tc.overtime_hours}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tc.pto_hours}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{tc.total_hours}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={tc.approval_status === 'approved' ? 'approved' : 'pending'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Funding Section ─────────────────────────────────────────
function FundingSection({ run, userId }: { run: PayrollRunRow; userId?: string }) {
  const { data: events = [] } = useFundingEvents(run.id);
  const createFunding = useCreateFundingEvent();
  const confirmFunding = useConfirmFunding();
  const [wireRef, setWireRef] = useState('');

  const handleCreateFunding = (method: string) => {
    createFunding.mutate({
      company_id: run.company_id,
      payroll_run_id: run.id,
      method,
      amount_cents: run.total_employer_cost_cents || run.gross_pay_cents,
      status: 'pending',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">Required Funding</p>
            <p className="text-xl font-semibold tabular-nums">{fmtCurrency(run.total_employer_cost_cents || run.gross_pay_cents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">Funding Status</p>
            <StatusBadge status={run.funding_status === 'confirmed' ? 'funded' : 'pending'} />
          </CardContent>
        </Card>
      </div>

      {run.is_expedited && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <Zap className="h-4 w-4 text-warning" />
          <div>
            <p className="font-medium text-xs">Expedited Wire Required</p>
            <p className="text-xs text-muted-foreground">
              Wire must be received by {run.expedited_deadline ? format(parseISO(run.expedited_deadline), 'EEEE h:mm a') : 'Thursday 1:00 PM'} EST
            </p>
          </div>
        </div>
      )}

      <RoleGate allowedRoles={['super_admin']}>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => handleCreateFunding('ach')}>
            <Landmark className="h-3.5 w-3.5 mr-1" />ACH
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleCreateFunding('wire')}>
            <Zap className="h-3.5 w-3.5 mr-1" />Wire
          </Button>
        </div>
      </RoleGate>

      {events.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Funding Events</h4>
          {events.map(ev => (
            <div key={ev.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium capitalize">{ev.method} · {fmtCurrency(ev.amount_cents)}</p>
                <p className="text-xs text-muted-foreground">{format(parseISO(ev.created_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ev.status === 'confirmed' ? 'funded' : 'pending'} />
                {ev.status !== 'confirmed' && (
                  <RoleGate allowedRoles={['super_admin']}>
                    <div className="flex items-center gap-1">
                      {ev.method === 'wire' && (
                        <Input
                          placeholder="Wire ref"
                          className="h-7 w-24 text-xs"
                          value={wireRef}
                          onChange={e => setWireRef(e.target.value)}
                        />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => confirmFunding.mutate({ id: ev.id, confirmedBy: userId!, wireReference: wireRef })}
                      >
                        Confirm
                      </Button>
                    </div>
                  </RoleGate>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Employee Table ──────────────────────────────────────────
function EmployeeTable({ lines, mode }: { lines: PayrollRunEmployeeRow[]; mode: 'edit' | 'preview' }) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No employee lines for this payroll run.</p>;
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Hours</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Gross</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Deductions</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map(line => {
            const name = line.employees ? `${line.employees.first_name} ${line.employees.last_name}` : line.employee_id.substring(0, 8);
            return (
              <tr key={line.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{name}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{line.employees?.pay_type ?? 'salary'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{line.regular_hours + line.overtime_hours}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(line.regular_pay_cents)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtCurrency(line.gross_pay_cents)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtCurrency(line.total_deductions_cents)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(line.net_pay_cents)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/30 font-semibold">
            <td className="px-4 py-2.5" colSpan={4}>Totals</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{fmtCurrency(lines.reduce((s, l) => s + l.gross_pay_cents, 0))}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{fmtCurrency(lines.reduce((s, l) => s + l.total_deductions_cents, 0))}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{fmtCurrency(lines.reduce((s, l) => s + l.net_pay_cents, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Summary Cards ───────────────────────────────────────────
function SummaryCards({ run }: { run: PayrollRunRow }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Gross Pay', value: fmtCurrency(run.gross_pay_cents), icon: DollarSign },
        { label: 'Employer Taxes', value: fmtCurrency(run.employer_taxes_cents), icon: FileText },
        { label: 'Benefits', value: fmtCurrency(run.employer_benefits_cents), icon: ShieldCheck },
        { label: 'Net Pay', value: fmtCurrency(run.net_pay_cents), icon: CreditCard },
      ].map(s => (
        <Card key={s.label}>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <s.icon className="h-4 w-4" />
              <span className="text-xs">{s.label}</span>
            </div>
            <p className="text-xl font-semibold tabular-nums">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main PayrollDetail ──────────────────────────────────────
export default function PayrollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const { data: run, isLoading, error } = usePayrollRun(id);
  const { data: lines = [] } = usePayrollRunEmployees(id);
  const { data: timecards = [] } = useTimecards(id);
  const { data: auditLogs = [] } = useAuditLogs({ tableName: 'payroll_runs', recordId: id, limit: 20 });
  const updateStatus = useUpdatePayrollRunStatus();
  const { data: internalNotes = [] } = useInternalNotes('payroll_run', id);
  const addNoteMutation = useAddInternalNote();

  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!run || error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <p className="text-muted-foreground">Payroll run not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/payroll')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
      </div>
    );
  }

  const isTerminal = ['completed', 'paid', 'voided', 'reversed', 'failed'].includes(run.status);
  const isBiweekly = run.pay_frequency === 'biweekly';
  const isSemimonthly = run.pay_frequency === 'semimonthly';
  const freqLabel = isSemimonthly ? 'Semi-Monthly' : isBiweekly ? 'Bi-Weekly' : run.pay_frequency;

  // Determine available actions based on current status
  const getActions = (): Array<{ label: string; status: PayrollRunStatus; icon: any; variant?: string }> => {
    const actions: Array<{ label: string; status: PayrollRunStatus; icon: any; variant?: string }> = [];
    const s = run.status;

    if (s === 'upcoming') actions.push({ label: isBiweekly ? 'Open for Timecards' : 'Open Payroll', status: isBiweekly ? 'open_for_timecards' : 'open', icon: ClipboardList });
    if (s === 'open') actions.push({ label: 'Send for Approval', status: 'awaiting_approval', icon: UserCheck });
    if (s === 'open_for_timecards') actions.push({ label: 'Submit for Timecard Approval', status: 'awaiting_timecard_approval', icon: ClipboardList });
    if (s === 'awaiting_timecard_approval') actions.push({ label: 'Approve Timecards', status: 'timecards_approved', icon: Check });
    if (s === 'timecards_approved') actions.push({ label: 'Send for Payroll Approval', status: 'awaiting_approval', icon: UserCheck });
    if (s === 'awaiting_approval') {
      actions.push({ label: 'Approve Payroll', status: 'pending_client_approval', icon: Check });
      if (run.auto_approved) actions.push({ label: 'Auto-Approve', status: 'auto_approved', icon: Zap });
    }
    if (s === 'pending_client_approval') actions.push({ label: 'Client Approve', status: 'client_approved', icon: Check });
    if (s === 'client_approved') actions.push({ label: 'Proceed to Funding', status: 'funding', icon: Landmark });
    if (s === 'auto_approved') actions.push({ label: 'Process Payroll', status: 'processing', icon: Send });
    if (s === 'funding') actions.push({ label: 'Send for Admin Approval', status: 'pending_admin_approval', icon: ShieldCheck });
    if (s === 'pending_admin_approval') actions.push({ label: 'Admin Approve', status: 'admin_approved', icon: Check });
    if (s === 'admin_approved') actions.push({ label: 'Submit to Provider', status: 'submitting', icon: Send });
    if (s === 'submitting') actions.push({ label: 'Mark Submitted', status: 'submitted', icon: CheckCircle2 });
    if (s === 'submitted') actions.push({ label: 'Mark Processing', status: 'processing', icon: Loader2 });
    if (s === 'processing') actions.push({ label: 'Mark Completed', status: 'completed', icon: CheckCircle2 });
    if (s === 'funded') actions.push({ label: 'Mark Paid', status: 'paid', icon: CheckCircle2 });
    if (s === 'late_submission') {
      actions.push({ label: 'Request Expedited', status: 'expedited_funding_required', icon: Zap });
      actions.push({ label: 'Manual Checks', status: 'manual_check_required', icon: FileWarning, variant: 'destructive' });
    }
    if (s === 'expedited_funding_required') actions.push({ label: 'Confirm Expedited', status: 'expedited_processing', icon: Zap });
    if (s === 'expedited_processing') actions.push({ label: 'Process', status: 'processing', icon: Send });
    if (s === 'manual_check_required') actions.push({ label: 'Mark Completed', status: 'completed', icon: CheckCircle2 });

    return actions;
  };

  const handleStatusChange = async (newStatus: PayrollRunStatus) => {
    try {
      const extras: Record<string, unknown> = {};
      if (newStatus === 'client_approved') {
        extras.client_approved_by = user?.id;
        extras.client_approved_at = new Date().toISOString();
      }
      if (newStatus === 'admin_approved') {
        extras.admin_approved_by = user?.id;
        extras.admin_approved_at = new Date().toISOString();
      }
      if (newStatus === 'submitted') extras.submitted_at = new Date().toISOString();
      if (newStatus === 'expedited_funding_required' || newStatus === 'expedited_processing') extras.is_expedited = true;
      if (newStatus === 'manual_check_required') extras.is_manual_check = true;
      if (newStatus === 'auto_approved') extras.auto_approved = true;

      await updateStatus.mutateAsync({ id: run.id, status: newStatus, ...extras });
      toast({ title: `Status updated to ${newStatus.replace(/_/g, ' ')}` });
    } catch (err: any) {
      toast({ title: 'Transition failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleVoid = async () => {
    try {
      await updateStatus.mutateAsync({
        id: run.id,
        status: 'voided' as PayrollRunStatus,
        voided_by: user?.id,
        voided_at: new Date().toISOString(),
        void_reason: 'Voided by admin',
      });
      toast({ title: 'Payroll run voided' });
    } catch (err: any) {
      toast({ title: 'Void failed', description: err.message, variant: 'destructive' });
    }
  };

  const auditEntries: AuditEntry[] = auditLogs.map(log => ({
    id: log.id,
    action: log.action,
    actor: log.user_email || 'System',
    actorRole: log.user_role || undefined,
    entity: 'Payroll Run',
    details: formatAuditChanges(log),
    timestamp: log.created_at,
  }));

  const actions = getActions();

  // Determine active deadline
  const activeDeadline = run.timecard_deadline && ['open_for_timecards', 'awaiting_timecard_approval'].includes(run.status)
    ? { deadline: run.timecard_deadline, label: 'Timecard Deadline' }
    : run.approval_deadline && !isTerminal
    ? { deadline: run.approval_deadline, label: 'Approval Deadline' }
    : run.expedited_deadline && ['expedited_funding_required'].includes(run.status)
    ? { deadline: run.expedited_deadline, label: 'Wire Deadline' }
    : run.submission_deadline
    ? { deadline: run.submission_deadline, label: 'Submission Deadline' }
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 animate-in-up">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{run.companies?.name ?? 'Payroll Run'}</h1>
            <StatusBadge status={run.status as any} />
            <Badge variant="outline" className="capitalize text-xs">{freqLabel}</Badge>
            <Badge variant="outline" className="capitalize text-xs">{run.run_type.replace(/_/g, ' ')}</Badge>
            {run.auto_approved && <Badge variant="secondary" className="text-xs">Auto-Approve</Badge>}
            {run.is_expedited && <Badge className="text-xs bg-warning/10 text-warning border-warning/30">Expedited</Badge>}
            {run.is_manual_check && <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/30">Manual Check</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {run.pay_period_start} — {run.pay_period_end} · Pay date: {run.pay_date} · {run.employee_count} employees
          </p>
        </div>
        {activeDeadline && !isTerminal && (
          <DeadlineCountdown deadline={activeDeadline.deadline} label={activeDeadline.label} warningHours={48} criticalHours={6} />
        )}
        <div className="flex items-center gap-4 text-sm shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gross</p>
            <p className="font-semibold tabular-nums">{centsToUSD(run.gross_pay_cents)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className="font-semibold tabular-nums">{centsToUSD(run.net_pay_cents)}</p>
          </div>
        </div>
      </div>

      {/* Late / Expedited / Manual Check banners */}
      {run.status === 'late_submission' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm animate-in-up">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-xs text-destructive">Late Submission</p>
            <p className="text-xs text-muted-foreground">This payroll missed the standard cutoff. Choose expedited processing (wire required) or manual checks.</p>
          </div>
        </div>
      )}
      {run.status === 'expedited_funding_required' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm animate-in-up">
          <Zap className="h-4 w-4 text-warning shrink-0" />
          <div>
            <p className="font-medium text-xs">Expedited Wire Required</p>
            <p className="text-xs text-muted-foreground">
              Wire must be confirmed by {run.expedited_deadline ? format(parseISO(run.expedited_deadline), 'EEEE, MMM d h:mm a') : 'Thursday 1:00 PM'} EST
            </p>
          </div>
        </div>
      )}
      {run.status === 'manual_check_required' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm animate-in-up">
          <FileWarning className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-xs text-destructive">Manual Check Required</p>
            <p className="text-xs text-muted-foreground">This payroll cannot be processed normally. Manual checks must be issued for all employees.</p>
          </div>
        </div>
      )}

      {/* Content Tabs + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-up stagger-2">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {isBiweekly && <TabsTrigger value="timecards">Timecards ({timecards.length})</TabsTrigger>}
              <TabsTrigger value="employees">Employees ({lines.length})</TabsTrigger>
              <TabsTrigger value="funding">Funding</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5 mt-4">
              <SummaryCards run={run} />

              {/* Payroll Breakdown */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Payroll Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2.5 text-sm">
                    {[
                      ['Gross Pay', fmtCurrency(run.gross_pay_cents)],
                      ['Employer FICA', fmtCurrency(run.employer_taxes_cents)],
                      ['Employer Benefits', fmtCurrency(run.employer_benefits_cents)],
                      ['Workers\' Comp', fmtCurrency(run.workers_comp_cents)],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-muted-foreground">{l}</span>
                        <span className="font-medium tabular-nums">{v}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Employer Cost</span>
                      <span className="tabular-nums">{fmtCurrency(run.total_employer_cost_cents)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deadlines summary */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Deadlines</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {isBiweekly && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Timecard Deadline</span>
                        <span className="font-medium">{run.timecard_deadline ? format(parseISO(run.timecard_deadline), 'EEE MMM d, h:mm a') : 'Mon 10:00 AM'} EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Expedited Wire Deadline</span>
                        <span className="font-medium">{run.expedited_deadline ? format(parseISO(run.expedited_deadline), 'EEE MMM d, h:mm a') : 'Thu 1:00 PM'} EST</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />Approval Deadline</span>
                    <span className="font-medium">{run.approval_deadline ? format(parseISO(run.approval_deadline), 'EEE MMM d, h:mm a') : isSemimonthly ? '4 days before pay date' : 'Tue 5:00 PM'} EST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Pay Date</span>
                    <span className="font-medium">{run.pay_date}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Readiness Score */}
              {run.readiness_score > 0 && (
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Payroll Readiness</span>
                      <span className={`text-lg font-bold ${run.readiness_score >= 80 ? 'text-success' : run.readiness_score >= 50 ? 'text-warning' : 'text-destructive'}`}>
                        {run.readiness_score}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${run.readiness_score >= 80 ? 'bg-success' : run.readiness_score >= 50 ? 'bg-warning' : 'bg-destructive'}`}
                        style={{ width: `${run.readiness_score}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timecards" className="mt-4">
              <TimecardSection timecards={timecards} userId={user?.id} />
            </TabsContent>

            <TabsContent value="employees" className="mt-4">
              <EmployeeTable lines={lines} mode="preview" />
            </TabsContent>

            <TabsContent value="funding" className="mt-4">
              <FundingSection run={run} userId={user?.id} />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              {auditEntries.length > 0 ? (
                <AuditTimeline entries={auditEntries} maxItems={50} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No audit entries yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          {!isTerminal && actions.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {actions.map(action => (
                  <Button
                    key={action.status}
                    size="sm"
                    variant={action.variant === 'destructive' ? 'destructive' : 'default'}
                    className="w-full gap-1.5"
                    disabled={updateStatus.isPending}
                    onClick={() => handleStatusChange(action.status)}
                  >
                    <action.icon className="h-4 w-4" />
                    {updateStatus.isPending ? 'Updating…' : action.label}
                  </Button>
                ))}
                <RoleGate allowedRoles={['super_admin']}>
                  <Separator className="my-2" />
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-destructive hover:text-destructive" disabled={updateStatus.isPending} onClick={handleVoid}>
                    <Ban className="h-3.5 w-3.5" />Void Run
                  </Button>
                  {run.status === 'late_submission' && (
                    <Button variant="outline" size="sm" className="w-full gap-1.5" disabled={updateStatus.isPending} onClick={() => handleStatusChange('pending_client_approval')}>
                      <Check className="h-3.5 w-3.5" />Override — Approve
                    </Button>
                  )}
                </RoleGate>
              </CardContent>
            </Card>
          )}

          {/* Terminal state */}
          {isTerminal && (
            <Card>
              <CardContent className="pt-5">
                <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  ['completed', 'paid'].includes(run.status) ? 'border border-success/30 bg-success/5' : 'border border-destructive/30 bg-destructive/5'
                }`}>
                  {['completed', 'paid'].includes(run.status)
                    ? <CheckCircle2 className="h-5 w-5 text-success" />
                    : <AlertTriangle className="h-5 w-5 text-destructive" />}
                  <div>
                    <p className="text-sm font-medium capitalize">{run.status.replace(/_/g, ' ')}</p>
                    {run.void_reason && <p className="text-xs text-muted-foreground">{run.void_reason}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Run details */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Run Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Frequency', freqLabel],
                ['Run Type', run.run_type.replace(/_/g, ' ')],
                ['Employees', String(run.employee_count)],
                ['Funding Status', run.funding_status],
                ['Exceptions', String(run.exception_count)],
                ['Created', format(parseISO(run.created_at), 'MMM d, yyyy h:mm a')],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-muted-foreground">{l}</span>
                  <span className="font-medium capitalize">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {auditEntries.length > 0 ? (
                <AuditTimeline entries={auditEntries} maxItems={5} />
              ) : (
                <p className="text-xs text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Internal notes */}
          <RoleGate allowedRoles={['super_admin']}>
            <InternalNotes
              notes={internalNotes.map(n => ({
                id: n.id,
                author: n.author_name,
                authorRole: n.author_role,
                content: n.content,
                jiraRef: n.jira_ref ?? undefined,
                createdAt: n.created_at,
              }))}
              onAddNote={(content, jiraRef) => {
                if (!user) return;
                addNoteMutation.mutate({
                  record_type: 'payroll_run',
                  record_id: id!,
                  author_id: user.id,
                  author_name: profile?.full_name || user.email || 'Unknown',
                  author_role: role || 'super_admin',
                  content,
                  jira_ref: jiraRef,
                });
              }}
            />
          </RoleGate>
        </div>
      </div>
    </div>
  );
}
