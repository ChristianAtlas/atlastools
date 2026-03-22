import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Check, AlertTriangle, ChevronRight,
  FileText, DollarSign, Users, Send, ShieldCheck, CreditCard,
  ClipboardList, Edit3, Eye, UserCheck, Landmark, CheckCircle2
} from 'lucide-react';
import { payrollRuns, employees } from '@/lib/mock-data';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ApprovalPanel } from '@/components/workflow/ApprovalPanel';
import { DeadlineCountdown } from '@/components/workflow/DeadlineCountdown';
import { InternalNotes, type InternalNote } from '@/components/workflow/InternalNotes';
import { AuditTimeline, type AuditEntry } from '@/components/workflow/AuditTimeline';
import { RoleGate } from '@/components/RoleGate';
import type { PayrollStatus } from '@/lib/types';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const WORKFLOW_STEPS = [
  { key: 'time_review', label: 'Time Review', icon: ClipboardList, description: 'Review and approve timesheets' },
  { key: 'editing', label: 'Payroll Edit', icon: Edit3, description: 'Edit compensation, bonuses, deductions' },
  { key: 'preview', label: 'Preview', icon: Eye, description: 'Review final payroll calculations' },
  { key: 'client_approval', label: 'Client Approval', icon: UserCheck, description: 'Client admin reviews and approves' },
  { key: 'funding', label: 'Funding', icon: Landmark, description: 'Verify funding and process payment' },
  { key: 'admin_approval', label: 'Admin Approval', icon: ShieldCheck, description: 'Super admin final approval' },
  { key: 'submission', label: 'Submit', icon: Send, description: 'Submit to payroll provider' },
] as const;

function statusToStep(status: PayrollStatus): number {
  const map: Record<string, number> = {
    draft: 0, in_review: 1, pending_approval: 3, approved: 5, processing: 6, completed: 7, failed: -1,
  };
  return map[status] ?? 0;
}

/** Compute next Tuesday 6 PM EST from now */
function getNextPayrollDeadline(): string {
  const now = new Date();
  // Convert to EST (UTC-5)
  const estOffset = -5 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc + estOffset * 60000);

  const dayOfWeek = est.getDay(); // 0=Sun
  let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  if (daysUntilTuesday === 0) {
    // It's Tuesday — check if past 6 PM
    if (est.getHours() >= 18) daysUntilTuesday = 7;
  }

  const deadline = new Date(est);
  deadline.setDate(deadline.getDate() + daysUntilTuesday);
  deadline.setHours(18, 0, 0, 0);

  // Convert back to UTC for ISO string
  const deadlineUtc = new Date(deadline.getTime() - estOffset * 60000);
  return deadlineUtc.toISOString();
}

// --- Step content components ---

function TimeReviewStep({ companyEmployees }: { companyEmployees: typeof employees }) {
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setReviewed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{reviewed.size} of {companyEmployees.length} timesheets reviewed</p>
        <Button variant="outline" size="sm" onClick={() => setReviewed(new Set(companyEmployees.map(e => e.id)))}>
          Mark All Reviewed
        </Button>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 w-10" />
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Hours / Period</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companyEmployees.map(emp => (
              <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Checkbox checked={reviewed.has(emp.id)} onCheckedChange={() => toggle(emp.id)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {emp.avatarInitials}
                    </div>
                    <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{emp.payType}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {emp.payType === 'hourly' ? '80.0 hrs' : 'Salaried'}
                </td>
                <td className="px-4 py-3">
                  {reviewed.has(emp.id)
                    ? <Badge variant="secondary" className="text-xs bg-success/10 text-success">Reviewed</Badge>
                    : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayrollEditStep({ companyEmployees }: { companyEmployees: typeof employees }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Adjust compensation, add bonuses, or override deductions for this pay period.</p>
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Regular Pay</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Bonus</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Deductions</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Gross</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {companyEmployees.map(emp => {
              const gross = emp.payType === 'hourly' ? emp.salary * 80 : emp.salary / 26;
              const bonus = emp.id === 'e1' ? 1500 : 0;
              const deductions = Math.round(gross * 0.08);
              return (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {bonus > 0
                      ? <span className="text-success">{formatCurrency(bonus)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(deductions)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(gross + bonus - deductions)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PreviewStep({ run }: { run: typeof payrollRuns[0] }) {
  const taxes = Math.round(run.grossPay * 0.22);
  const benefits = Math.round(run.grossPay * 0.03);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Review the final payroll summary before submitting for approval.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Gross Pay', value: formatCurrency(run.grossPay), icon: DollarSign },
          { label: 'Taxes & Withholding', value: formatCurrency(taxes), icon: FileText },
          { label: 'Benefits', value: formatCurrency(benefits), icon: ShieldCheck },
          { label: 'Net Pay', value: formatCurrency(run.netPay), icon: CreditCard },
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payroll Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5 text-sm">
            {[
              ['Total Regular Wages', formatCurrency(run.grossPay * 0.92)],
              ['Total Overtime', formatCurrency(run.grossPay * 0.05)],
              ['Total Bonuses', formatCurrency(run.grossPay * 0.03)],
              ['Employer FICA', formatCurrency(run.grossPay * 0.0765)],
              ['Employer FUTA', formatCurrency(run.grossPay * 0.006)],
              ['Employer SUI', formatCurrency(run.grossPay * 0.027)],
              ['Workers Comp', formatCurrency(run.grossPay * 0.012)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{val}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total Employer Cost</span>
              <span className="tabular-nums">{formatCurrency(run.grossPay * 1.12)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FundingStep({ run }: { run: typeof payrollRuns[0] }) {
  const [verified, setVerified] = useState(false);
  const total = run.grossPay * 1.12;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Verify client funding before proceeding to admin approval.</p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">Required Funding</p>
            <p className="text-xl font-semibold tabular-nums">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <p className="text-xs text-muted-foreground mb-1">Account Balance</p>
            <p className="text-xl font-semibold tabular-nums text-success">{formatCurrency(total + 15000)}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="max-w-lg">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">ACH from</span>
            <span className="font-medium">Chase Business •••4821</span>
          </div>
          {verified ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Funding verified</span>
            </div>
          ) : (
            <Button size="sm" onClick={() => setVerified(true)}>
              <Check className="h-4 w-4 mr-1" />Verify Funding
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SubmissionStep({ run }: { run: typeof payrollRuns[0] }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Submit payroll to the external provider for processing.</p>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Submission Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            {[
              ['Company', run.companyName],
              ['Pay Period', `${run.payPeriodStart} — ${run.payPeriodEnd}`],
              ['Pay Date', run.payDate],
              ['Employees', String(run.employeeCount)],
              ['Net Pay', formatCurrency(run.netPay)],
              ['Provider', 'Everee'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-muted-foreground">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
          <Separator />
          {submitted ? (
            <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">Submitted Successfully</p>
                <p className="text-xs text-muted-foreground">Provider confirmation ID: EVR-{run.id.toUpperCase()}-2025</p>
              </div>
            </div>
          ) : (
            <Button onClick={() => setSubmitted(true)} size="sm" className="w-full">
              <Send className="h-4 w-4 mr-1.5" />Submit to Payroll Provider
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main detail page ---

export default function PayrollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const run = payrollRuns.find(r => r.id === id);

  const initialStep = run ? statusToStep(run.status) : 0;
  const [activeStep, setActiveStep] = useState(initialStep);

  // Approval states
  const [clientApprovalStatus, setClientApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'escalated' | 'changes_requested'>('pending');
  const [adminApprovalStatus, setAdminApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'escalated' | 'changes_requested'>('pending');

  // Internal notes (Super Admin only)
  const [notes, setNotes] = useState<InternalNote[]>([
    { id: 'pn1', author: 'Sarah Chen', authorRole: 'Super Admin', content: 'Client confirmed all overtime hours are accurate. Proceeding with standard processing.', jiraRef: 'ATLAS-2041', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ]);

  // Audit trail
  const auditEntries: AuditEntry[] = useMemo(() => {
    if (!run) return [];
    return [
      { id: 'pa1', action: 'created', actor: run.createdBy, actorRole: 'Super Admin', entity: `Payroll Run`, details: `Created for ${run.companyName}, period ${run.payPeriodStart} – ${run.payPeriodEnd}`, timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'pa2', action: 'updated', actor: run.createdBy, actorRole: 'Super Admin', entity: 'Payroll Run', details: 'Timesheets reviewed and marked complete', timestamp: new Date(Date.now() - 72000000).toISOString() },
      { id: 'pa3', action: 'submitted', actor: run.createdBy, actorRole: 'Super Admin', entity: 'Payroll Run', details: 'Submitted for client approval', timestamp: new Date(Date.now() - 43200000).toISOString() },
      ...(clientApprovalStatus === 'approved' ? [{ id: 'pa4', action: 'approved', actor: 'James Wilson', actorRole: 'Client Admin', entity: 'Payroll Run', details: 'Client approval granted', timestamp: new Date(Date.now() - 3600000).toISOString() }] : []),
      ...(adminApprovalStatus === 'approved' ? [{ id: 'pa5', action: 'approved', actor: 'Sarah Chen', actorRole: 'Super Admin', entity: 'Payroll Run', details: 'Admin final approval granted', timestamp: new Date(Date.now() - 1800000).toISOString() }] : []),
    ];
  }, [run, clientApprovalStatus, adminApprovalStatus]);

  const payrollDeadline = useMemo(() => getNextPayrollDeadline(), []);

  const companyEmployees = useMemo(
    () => (run ? employees.filter(e => e.companyId === run.companyId && e.status !== 'terminated') : []),
    [run]
  );

  if (!run) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <p className="text-muted-foreground">Payroll run not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Payroll
        </Button>
      </div>
    );
  }

  const completedStep = statusToStep(run.status);

  function renderStepContent() {
    switch (activeStep) {
      case 0: return <TimeReviewStep companyEmployees={companyEmployees} />;
      case 1: return <PayrollEditStep companyEmployees={companyEmployees} />;
      case 2: return <PreviewStep run={run!} />;
      case 3:
        return (
          <ApprovalPanel
            title="Client Payroll Approval"
            description={`${run!.companyName} — Gross pay: ${formatCurrency(run!.grossPay)} · ${run!.employeeCount} employees · Pay date: ${run!.payDate}`}
            status={clientApprovalStatus}
            approver={clientApprovalStatus !== 'pending' ? 'James Wilson' : undefined}
            approvedAt={clientApprovalStatus !== 'pending' ? new Date().toISOString() : undefined}
            deadline={`Tuesday 6:00 PM EST`}
            onAction={(actionId) => {
              if (actionId === 'approve') setClientApprovalStatus('approved');
              else if (actionId === 'reject') setClientApprovalStatus('rejected');
              else if (actionId === 'request_changes') setClientApprovalStatus('changes_requested');
            }}
          />
        );
      case 4: return <FundingStep run={run!} />;
      case 5:
        return (
          <ApprovalPanel
            title="Super Admin Final Approval"
            description="Final review before submission to payroll provider. This action is irreversible."
            status={adminApprovalStatus}
            approver={adminApprovalStatus !== 'pending' ? 'Sarah Chen' : undefined}
            approvedAt={adminApprovalStatus !== 'pending' ? new Date().toISOString() : undefined}
            actions={[
              { id: 'approve', label: 'Approve & Submit', variant: 'approve', icon: Check },
              { id: 'escalate', label: 'Escalate', variant: 'escalate', icon: ShieldCheck },
              { id: 'reject', label: 'Reject', variant: 'reject', icon: AlertTriangle, requiresComment: true },
            ]}
            onAction={(actionId) => {
              if (actionId === 'approve') setAdminApprovalStatus('approved');
              else if (actionId === 'reject') setAdminApprovalStatus('rejected');
              else if (actionId === 'escalate') setAdminApprovalStatus('escalated');
            }}
          />
        );
      case 6: return <SubmissionStep run={run!} />;
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
            <h1 className="text-xl font-semibold">{run.companyName}</h1>
            <StatusBadge status={run.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {run.payPeriodStart} — {run.payPeriodEnd} · Pay date: {run.payDate} · {run.employeeCount} employees
          </p>
        </div>
        <DeadlineCountdown
          deadline={payrollDeadline}
          label="Payroll Cutoff"
          warningHours={48}
          criticalHours={6}
        />
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Gross Pay</p>
            <p className="font-semibold tabular-nums">{formatCurrency(run.grossPay)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Net Pay</p>
            <p className="font-semibold tabular-nums">{formatCurrency(run.netPay)}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="animate-in-up stagger-1">
        <div className="flex gap-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const isCompleted = i < completedStep;
            const isCurrent = i === activeStep;
            const StepIcon = step.icon;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(i)}
                className={`
                  flex-1 group relative rounded-lg px-3 py-3 text-left transition-all
                  ${isCurrent
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'hover:bg-muted/60'}
                `}
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
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">{WORKFLOW_STEPS[activeStep].label}</h2>
            <span className="text-sm text-muted-foreground">— {WORKFLOW_STEPS[activeStep].description}</span>
          </div>
          {renderStepContent()}
        </div>

        {/* Right sidebar: Audit + Internal Notes */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditTimeline entries={auditEntries} maxItems={5} />
            </CardContent>
          </Card>

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

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 animate-in-up stagger-3">
        <Button
          variant="outline"
          size="sm"
          disabled={activeStep === 0}
          onClick={() => setActiveStep(s => s - 1)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />Previous Step
        </Button>
        {activeStep < WORKFLOW_STEPS.length - 1 && (
          <Button size="sm" onClick={() => setActiveStep(s => s + 1)}>
            Next Step<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
