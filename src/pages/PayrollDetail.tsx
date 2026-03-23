import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Check, AlertTriangle, ChevronRight,
  FileText, DollarSign, Users, Send, ShieldCheck, CreditCard,
  ClipboardList, Edit3, Eye, UserCheck, Landmark, CheckCircle2,
  Loader2, Ban
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useAuditLogs, formatAuditChanges } from '@/hooks/useAuditLogs';

// ── Constants ──────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { key: 'time_review', label: 'Time Review', icon: ClipboardList, description: 'Review and approve timesheets' },
  { key: 'editing', label: 'Payroll Edit', icon: Edit3, description: 'Edit compensation, bonuses, deductions' },
  { key: 'preview', label: 'Preview', icon: Eye, description: 'Review final payroll calculations' },
  { key: 'pending_client_approval', label: 'Client Approval', icon: UserCheck, description: 'Client admin reviews and approves' },
  { key: 'funding', label: 'Funding', icon: Landmark, description: 'Verify funding and process payment' },
  { key: 'pending_admin_approval', label: 'Admin Approval', icon: ShieldCheck, description: 'Super admin final approval' },
  { key: 'submitting', label: 'Submit', icon: Send, description: 'Submit to payroll provider' },
] as const;

const STATUS_TO_STEP: Record<string, number> = {
  draft: -1, time_review: 0, editing: 1, preview: 2,
  pending_client_approval: 3, client_approved: 4,
  funding: 4, pending_admin_approval: 5,
  admin_approved: 6, submitting: 6, submitted: 7,
  processing: 7, completed: 7, failed: -1, voided: -1, reversed: -1,
};

// Valid "advance" transitions
const ADVANCE_MAP: Record<string, { next: PayrollRunStatus; label: string; icon: typeof Check }> = {
  draft: { next: 'time_review', label: 'Start Time Review', icon: ClipboardList },
  time_review: { next: 'editing', label: 'Proceed to Editing', icon: Edit3 },
  editing: { next: 'preview', label: 'Preview Payroll', icon: Eye },
  preview: { next: 'pending_client_approval', label: 'Send for Client Approval', icon: UserCheck },
  pending_client_approval: { next: 'client_approved', label: 'Approve (Client)', icon: Check },
  client_approved: { next: 'funding', label: 'Proceed to Funding', icon: Landmark },
  funding: { next: 'pending_admin_approval', label: 'Send for Admin Approval', icon: ShieldCheck },
  pending_admin_approval: { next: 'admin_approved', label: 'Approve & Submit', icon: Check },
  admin_approved: { next: 'submitting', label: 'Submit to Provider', icon: Send },
  submitting: { next: 'submitted', label: 'Mark Submitted', icon: CheckCircle2 },
  submitted: { next: 'processing', label: 'Mark Processing', icon: Loader2 },
  processing: { next: 'completed', label: 'Mark Completed', icon: CheckCircle2 },
};

const ROLLBACK_MAP: Record<string, PayrollRunStatus> = {
  time_review: 'draft',
  editing: 'time_review',
  preview: 'editing',
  pending_client_approval: 'editing',
  client_approved: 'funding', // can't roll back
  funding: 'client_approved',
  pending_admin_approval: 'editing',
};

function getNextPayrollDeadline(): string {
  const now = new Date();
  const estOffset = -5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc + estOffset * 60000);
  const dayOfWeek = est.getDay();
  let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  if (daysUntilTuesday === 0 && est.getHours() >= 18) daysUntilTuesday = 7;
  const deadline = new Date(est);
  deadline.setDate(deadline.getDate() + daysUntilTuesday);
  deadline.setHours(18, 0, 0, 0);
  return new Date(deadline.getTime() - estOffset * 60000).toISOString();
}

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);

// ── Step components ────────────────────────────────────────

function EmployeeTable({ lines, mode }: { lines: PayrollRunEmployeeRow[]; mode: 'time' | 'edit' | 'preview' }) {
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setReviewed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No employee lines for this payroll run.</p>;
  }

  return (
    <div className="space-y-3">
      {mode === 'time' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{reviewed.size} of {lines.length} reviewed</p>
          <Button variant="outline" size="sm" onClick={() => setReviewed(new Set(lines.map(l => l.id)))}>Mark All Reviewed</Button>
        </div>
      )}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {mode === 'time' && <th className="px-4 py-2.5 w-10" />}
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              {mode === 'time' && <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Hours</th>}
              {mode === 'time' && <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>}
              {(mode === 'edit' || mode === 'preview') && (
                <>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Bonus</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Deductions</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Gross</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Net</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map(line => {
              const name = line.employees ? `${line.employees.first_name} ${line.employees.last_name}` : line.employee_id.substring(0, 8);
              const initials = line.employees ? `${line.employees.first_name[0]}${line.employees.last_name[0]}` : '??';
              const payType = line.employees?.pay_type ?? 'salary';
              return (
                <tr key={line.id} className="hover:bg-muted/30 transition-colors">
                  {mode === 'time' && (
                    <td className="px-4 py-3"><Checkbox checked={reviewed.has(line.id)} onCheckedChange={() => toggle(line.id)} /></td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</div>
                      <span className="font-medium">{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{payType}</td>
                  {mode === 'time' && (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {payType === 'hourly' ? `${line.regular_hours + line.overtime_hours} hrs` : 'Salaried'}
                      </td>
                      <td className="px-4 py-3">
                        {reviewed.has(line.id)
                          ? <Badge variant="secondary" className="text-xs bg-success/10 text-success">Reviewed</Badge>
                          : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                      </td>
                    </>
                  )}
                  {(mode === 'edit' || mode === 'preview') && (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(line.regular_pay_cents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {line.bonus_cents > 0 ? <span className="text-success">{fmtCurrency(line.bonus_cents)}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmtCurrency(line.total_deductions_cents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtCurrency(line.gross_pay_cents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(line.net_pay_cents)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

function PayrollBreakdown({ run }: { run: PayrollRunRow }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Payroll Breakdown</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2.5 text-sm">
          {[
            ['Gross Pay', fmtCurrency(run.gross_pay_cents)],
            ['Employer FICA', fmtCurrency(run.employer_taxes_cents)],
            ['Employer Benefits', fmtCurrency(run.employer_benefits_cents)],
            ['Workers Comp', fmtCurrency(run.workers_comp_cents)],
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
  );
}

// ── Main component ─────────────────────────────────────────

export default function PayrollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: run, isLoading, error } = usePayrollRun(id);
  const { data: lines = [] } = usePayrollRunEmployees(id);
  const { data: auditLogs = [] } = useAuditLogs({ tableName: 'payroll_runs', recordId: id, limit: 20 });
  const updateStatus = useUpdatePayrollRunStatus();

  const [activeStep, setActiveStep] = useState<number | null>(null);
  const { data: internalNotes = [] } = useInternalNotes('payroll_run', id);
  const addNoteMutation = useAddInternalNote();

  const payrollDeadline = useMemo(() => getNextPayrollDeadline(), []);

  // Loading / error states
  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!run || error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <p className="text-muted-foreground">Payroll run not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/payroll')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Payroll</Button>
      </div>
    );
  }

  const currentStepIdx = STATUS_TO_STEP[run.status] ?? -1;
  const displayStep = activeStep ?? Math.max(currentStepIdx, 0);
  const advance = ADVANCE_MAP[run.status];
  const rollbackTo = ROLLBACK_MAP[run.status];
  const isTerminal = ['completed', 'voided', 'reversed', 'failed'].includes(run.status);

  const handleAdvance = async () => {
    if (!advance) return;
    try {
      const extras: Record<string, unknown> = {};
      if (advance.next === 'client_approved') {
        extras.client_approved_by = user?.id;
        extras.client_approved_at = new Date().toISOString();
      }
      if (advance.next === 'admin_approved') {
        extras.admin_approved_by = user?.id;
        extras.admin_approved_at = new Date().toISOString();
      }
      if (advance.next === 'submitted') {
        extras.submitted_at = new Date().toISOString();
      }
      await updateStatus.mutateAsync({ id: run.id, status: advance.next, ...extras });
      toast({ title: `Status updated to ${advance.next.replace(/_/g, ' ')}` });
    } catch (err: any) {
      toast({ title: 'Transition failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleRollback = async () => {
    if (!rollbackTo) return;
    try {
      await updateStatus.mutateAsync({ id: run.id, status: rollbackTo });
      toast({ title: `Rolled back to ${rollbackTo.replace(/_/g, ' ')}` });
    } catch (err: any) {
      toast({ title: 'Rollback failed', description: err.message, variant: 'destructive' });
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

  // Build audit entries from real data
  const auditEntries: AuditEntry[] = auditLogs.map(log => ({
    id: log.id,
    action: log.action,
    actor: log.user_email || 'System',
    actorRole: log.user_role || undefined,
    entity: 'Payroll Run',
    details: formatAuditChanges(log),
    timestamp: log.created_at,
  }));

  function renderStepContent() {
    switch (displayStep) {
      case 0: return <EmployeeTable lines={lines} mode="time" />;
      case 1: return <EmployeeTable lines={lines} mode="edit" />;
      case 2:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Review the final payroll summary before submitting for approval.</p>
            <SummaryCards run={run} />
            <PayrollBreakdown run={run} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Awaiting client admin review and approval.</p>
            <SummaryCards run={run} />
            <EmployeeTable lines={lines} mode="preview" />
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Verify client funding before proceeding to admin approval.</p>
            <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
              <Card>
                <CardContent className="pt-5 pb-4 px-4">
                  <p className="text-xs text-muted-foreground mb-1">Required Funding</p>
                  <p className="text-xl font-semibold tabular-nums">{fmtCurrency(run.total_employer_cost_cents)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 px-4">
                  <p className="text-xs text-muted-foreground mb-1">Account Balance</p>
                  <p className="text-xl font-semibold tabular-nums text-success">{fmtCurrency(run.total_employer_cost_cents + 1500000)}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Final review before submission. This action is irreversible.</p>
            <SummaryCards run={run} />
            <PayrollBreakdown run={run} />
          </div>
        );
      case 6:
        return (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Submit payroll to the external provider for processing.</p>
            <Card className="max-w-lg">
              <CardHeader><CardTitle className="text-base">Submission Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {[
                    ['Company', run.companies?.name ?? '—'],
                    ['Pay Period', `${run.pay_period_start} — ${run.pay_period_end}`],
                    ['Pay Date', run.pay_date],
                    ['Employees', String(run.employee_count)],
                    ['Net Pay', fmtCurrency(run.net_pay_cents)],
                    ['Provider', 'Everee'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                {['submitted', 'processing', 'completed'].includes(run.status) && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm font-medium">Submitted Successfully</p>
                        <p className="text-xs text-muted-foreground">
                          {run.submitted_at && `Submitted ${new Date(run.submitted_at).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );
      default: return null;
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 animate-in-up">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{run.companies?.name ?? 'Payroll Run'}</h1>
            <StatusBadge status={run.status} />
            <Badge variant="outline" className="capitalize text-xs">{run.run_type.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {run.pay_period_start} — {run.pay_period_end} · Pay date: {run.pay_date} · {run.employee_count} employees
          </p>
        </div>
        {!isTerminal && (
          <DeadlineCountdown deadline={run.submission_deadline || payrollDeadline} label="Payroll Cutoff" warningHours={48} criticalHours={6} />
        )}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gross Pay</p>
            <p className="font-semibold tabular-nums">{centsToUSD(run.gross_pay_cents)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Net Pay</p>
            <p className="font-semibold tabular-nums">{centsToUSD(run.net_pay_cents)}</p>
          </div>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="animate-in-up stagger-1">
        <div className="flex gap-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const isCompleted = i < currentStepIdx;
            const isCurrent = i === displayStep;
            const StepIcon = step.icon;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(i)}
                className={`flex-1 group relative rounded-lg px-3 py-3 text-left transition-all ${
                  isCurrent ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isCompleted ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
                      <Check className="h-3 w-3 text-success-foreground" />
                    </div>
                  ) : (
                    <StepIcon className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                  <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
                <div className={`h-1 rounded-full mt-1 ${isCompleted ? 'bg-success' : isCurrent ? 'bg-primary' : 'bg-border'}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in-up stagger-2">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">{WORKFLOW_STEPS[displayStep]?.label ?? run.status}</h2>
            <span className="text-sm text-muted-foreground">— {WORKFLOW_STEPS[displayStep]?.description}</span>
          </div>
          {renderStepContent()}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Action buttons */}
          {!isTerminal && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {advance && (
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={updateStatus.isPending}
                    onClick={handleAdvance}
                  >
                    <advance.icon className="h-4 w-4" />
                    {updateStatus.isPending ? 'Updating…' : advance.label}
                  </Button>
                )}
                {rollbackTo && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={updateStatus.isPending}
                    onClick={handleRollback}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to {rollbackTo.replace(/_/g, ' ')}
                  </Button>
                )}
                <RoleGate allowedRoles={['super_admin']}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-destructive hover:text-destructive"
                    disabled={updateStatus.isPending}
                    onClick={handleVoid}
                  >
                    <Ban className="h-3.5 w-3.5" />Void Run
                  </Button>
                </RoleGate>
              </CardContent>
            </Card>
          )}

          {/* Terminal state badge */}
          {isTerminal && (
            <Card>
              <CardContent className="pt-5">
                <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                  run.status === 'completed' ? 'border border-success/30 bg-success/5' :
                  'border border-destructive/30 bg-destructive/5'
                }`}>
                  {run.status === 'completed'
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

          {/* Audit trail */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
            <CardContent>
              {auditEntries.length > 0 ? (
                <AuditTimeline entries={auditEntries} maxItems={8} />
              ) : (
                <p className="text-xs text-muted-foreground">No audit entries yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Internal notes (Super Admin) */}
          <RoleGate allowedRoles={['super_admin']}>
            <InternalNotes
              notes={notes}
              onAddNote={(content, jiraRef) => {
                setNotes(prev => [...prev, {
                  id: `pn-${Date.now()}`,
                  author: 'You',
                  authorRole: 'Super Admin',
                  content,
                  jiraRef,
                  createdAt: new Date().toISOString(),
                }]);
              }}
            />
          </RoleGate>
        </div>
      </div>

      {/* Step navigation */}
      <div className="flex items-center justify-between pt-2 animate-in-up stagger-3">
        <Button variant="outline" size="sm" disabled={displayStep === 0} onClick={() => setActiveStep(Math.max(displayStep - 1, 0))}>
          <ArrowLeft className="h-4 w-4 mr-1" />Previous Step
        </Button>
        {displayStep < WORKFLOW_STEPS.length - 1 && (
          <Button variant="outline" size="sm" onClick={() => setActiveStep(Math.min(displayStep + 1, WORKFLOW_STEPS.length - 1))}>
            Next Step<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
