import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, Check, AlertTriangle, Calendar,
  FileText, DollarSign, Send, ShieldCheck, CreditCard,
  ClipboardList, UserCheck, Landmark, CheckCircle2,
  Loader2, Ban, Zap, FileWarning, Download, Edit3,
  UserX, ShieldAlert, RotateCcw, Receipt, Play, Eye
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RideAlongVendorsTab } from '@/components/vendors/RideAlongVendorsTab';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DeadlineCountdown } from '@/components/workflow/DeadlineCountdown';
import { InternalNotes } from '@/components/workflow/InternalNotes';
import { useInternalNotes, useAddInternalNote } from '@/hooks/useInternalNotes';
import { AuditTimeline, type AuditEntry } from '@/components/workflow/AuditTimeline';
import { RoleGate } from '@/components/RoleGate';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  usePayrollRun, usePayrollRunEmployees, useUpdatePayrollRunStatus, useCreatePayrollRun,
  centsToUSD, type PayrollRunRow, type PayrollRunEmployeeRow, type PayrollRunStatus,
} from '@/hooks/usePayrollRuns';
import { useTimecards, useUpdateTimecard, useApproveTimecards, type TimecardRow } from '@/hooks/useTimecards';
import { useFundingEvents, useCreateFundingEvent, useConfirmFunding } from '@/hooks/useFundingEvents';
import { useAuditLogs, formatAuditChanges } from '@/hooks/useAuditLogs';
import { usePayrollEligibility, getEligibilityBadgeProps, type EligibilityStatus } from '@/hooks/usePayrollEligibility';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);

// ── Edit Dialog ────────────────────────────────────────────
function EditEmployeeDialog({
  open, onOpenChange, line, onSave
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  line: PayrollRunEmployeeRow | null;
  onSave: (updates: { regular_hours?: number; regular_pay_cents?: number; bonus_cents?: number; reimbursement_cents?: number; notes?: string }) => void;
}) {
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [bonus, setBonus] = useState('');
  const [reimbursement, setReimbursement] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    if (line) {
      setHours(String(line.regular_hours));
      setRate(String(line.regular_pay_cents / 100));
      setBonus(String(line.bonus_cents / 100));
      setReimbursement(String(line.reimbursement_cents / 100));
      setNotes(line.notes ?? '');
    }
  };

  if (open && line && hours === '') reset();

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setHours(''); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Employee Pay — {line?.employees ? `${line.employees.first_name} ${line.employees.last_name}` : ''}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Regular Hours</label>
              <div className="mt-0.5">
                <span className="text-[10px] text-muted-foreground">Original: {line?.regular_hours ?? 0}</span>
                <Input type="number" value={hours} onChange={e => setHours(e.target.value)} className="h-8 mt-0.5" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pay Rate ($)</label>
              <div className="mt-0.5">
                <span className="text-[10px] text-muted-foreground">Original: {fmtCurrency(line?.regular_pay_cents ?? 0)}</span>
                <Input type="number" value={rate} onChange={e => setRate(e.target.value)} className="h-8 mt-0.5" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bonus ($)</label>
              <Input type="number" value={bonus} onChange={e => setBonus(e.target.value)} className="h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reimbursement ($)</label>
              <Input type="number" value={reimbursement} onChange={e => setReimbursement(e.target.value)} className="h-8" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Adjustment Note</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-0.5" rows={2} placeholder="Reason for adjustment..." />
          </div>
          {line && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-medium">Impact Preview</p>
              <div className="flex justify-between"><span className="text-muted-foreground">New Gross (est.)</span><span className="font-medium">{fmtCurrency(Math.round(Number(rate || 0) * 100) + Math.round(Number(bonus || 0) * 100) + Math.round(Number(reimbursement || 0) * 100))}</span></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={() => {
            onSave({
              regular_hours: Number(hours),
              regular_pay_cents: Math.round(Number(rate) * 100),
              bonus_cents: Math.round(Number(bonus) * 100),
              reimbursement_cents: Math.round(Number(reimbursement) * 100),
              notes: notes || undefined,
            });
            onOpenChange(false);
            setHours('');
          }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Timecard Section ────────────────────────────────────────
function TimecardSection({ timecards, userId }: { timecards: TimecardRow[]; userId?: string }) {
  const updateTimecard = useUpdateTimecard();
  const approveTimecards = useApproveTimecards();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const approved = timecards.filter(t => t.approval_status === 'approved');
  const missing = timecards.filter(t => t.regular_hours === 0 && t.overtime_hours === 0);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">{approved.length}/{timecards.length} Approved</Badge>
          {missing.length > 0 && <Badge className="text-xs bg-destructive/10 text-destructive border-0">{missing.length} Missing Hours</Badge>}
        </div>
        {selectedIds.size > 0 && (
          <Button size="sm" onClick={() => { approveTimecards.mutate({ ids: Array.from(selectedIds), approvedBy: userId! }); setSelectedIds(new Set()); }} disabled={approveTimecards.isPending}>
            <Check className="h-3.5 w-3.5 mr-1" />Approve Selected ({selectedIds.size})
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-3 py-2.5 w-10" /><th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">OT</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">PTO</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
          </tr></thead>
          <tbody className="divide-y">
            {timecards.map(tc => {
              const name = tc.employees ? `${tc.employees.first_name} ${tc.employees.last_name}` : 'Unknown';
              const isPending = tc.approval_status === 'pending';
              return (
                <tr key={tc.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5">{isPending && <Checkbox checked={selectedIds.has(tc.id)} onCheckedChange={() => toggleSelect(tc.id)} />}</td>
                  <td className="px-3 py-2.5 font-medium">{name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {isPending ? <Input type="number" className="w-16 h-7 text-right text-xs inline-block" defaultValue={tc.regular_hours} onBlur={e => updateTimecard.mutate({ id: tc.id, regular_hours: Number(e.target.value) } as any)} /> : tc.regular_hours}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {isPending ? <Input type="number" className="w-16 h-7 text-right text-xs inline-block" defaultValue={tc.overtime_hours} onBlur={e => updateTimecard.mutate({ id: tc.id, overtime_hours: Number(e.target.value) } as any)} /> : tc.overtime_hours}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tc.pto_hours}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{tc.total_hours}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={tc.approval_status === 'approved' ? 'approved' : 'pending'} /></td>
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <Card><CardContent className="pt-5 pb-4 px-4">
          <p className="text-xs text-muted-foreground mb-1">Required Funding</p>
          <p className="text-xl font-semibold tabular-nums">{fmtCurrency(run.total_employer_cost_cents || run.gross_pay_cents)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4 px-4">
          <p className="text-xs text-muted-foreground mb-1">Funding Status</p>
          <StatusBadge status={run.funding_status === 'confirmed' ? 'funded' : 'pending'} />
        </CardContent></Card>
      </div>
      {run.is_expedited && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <Zap className="h-4 w-4 text-warning" />
          <div>
            <p className="font-medium text-xs">Expedited Wire Required</p>
            <p className="text-xs text-muted-foreground">Wire by {run.expedited_deadline ? format(parseISO(run.expedited_deadline), 'EEEE h:mm a') : 'Thursday 1:00 PM'} EST</p>
          </div>
        </div>
      )}
      <RoleGate allowedRoles={['super_admin']}>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => createFunding.mutate({ company_id: run.company_id, payroll_run_id: run.id, method: 'ach', amount_cents: run.total_employer_cost_cents || run.gross_pay_cents, status: 'pending' })}>
            <Landmark className="h-3.5 w-3.5 mr-1" />ACH
          </Button>
          <Button size="sm" variant="outline" onClick={() => createFunding.mutate({ company_id: run.company_id, payroll_run_id: run.id, method: 'wire', amount_cents: run.total_employer_cost_cents || run.gross_pay_cents, status: 'pending' })}>
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
                      {ev.method === 'wire' && <Input placeholder="Wire ref" className="h-7 w-24 text-xs" value={wireRef} onChange={e => setWireRef(e.target.value)} />}
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => confirmFunding.mutate({ id: ev.id, confirmedBy: userId!, wireReference: wireRef })}>Confirm</Button>
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

// ── Employee Roster with Eligibility + Edit ─────────────────
function EmployeeRoster({
  lines, run, eligibility, onEdit, onExclude, onRevalidate
}: {
  lines: PayrollRunEmployeeRow[];
  run: PayrollRunRow;
  eligibility: Map<string, { status: EligibilityStatus; reasons: string[] }>;
  onEdit: (line: PayrollRunEmployeeRow) => void;
  onExclude: (line: PayrollRunEmployeeRow) => void;
  onRevalidate: () => void;
}) {
  const isTerminal = ['completed', 'paid', 'voided', 'reversed', 'failed'].includes(run.status);
  const eligible = lines.filter(l => (eligibility.get(l.employee_id)?.status ?? 'eligible') === 'eligible');
  const blocked = lines.filter(l => {
    const s = eligibility.get(l.employee_id)?.status;
    return s && s !== 'eligible' && s !== 'processed';
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{eligible.length} Eligible</Badge>
          {blocked.length > 0 && <Badge className="text-xs bg-destructive/10 text-destructive border-0">{blocked.length} Blocked</Badge>}
          <span className="text-xs text-muted-foreground">of {lines.length} total</span>
        </div>
        <Button size="sm" variant="outline" onClick={onRevalidate}><ShieldCheck className="h-3.5 w-3.5 mr-1" />Revalidate All</Button>
      </div>

      {/* Exceptions panel */}
      {blocked.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
          <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" />Exceptions ({blocked.length})</h4>
          {blocked.map(line => {
            const elig = eligibility.get(line.employee_id);
            const badge = getEligibilityBadgeProps(elig?.status ?? 'eligible');
            const name = line.employees ? `${line.employees.first_name} ${line.employees.last_name}` : line.employee_id.substring(0, 8);
            return (
              <div key={line.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border">
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{(elig?.reasons ?? []).join(' · ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] border-0 ${badge.className}`}>{badge.label}</Badge>
                  {!isTerminal && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onExclude(line)}>
                      <UserX className="h-3 w-3 mr-1" />Exclude → Off-Cycle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full roster table */}
      <div className="rounded-lg border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Hours</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Bonus</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Gross</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Deductions</th>
            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Net</th>
            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Eligibility</th>
            <th className="px-3 py-2.5 w-20" />
          </tr></thead>
          <tbody className="divide-y">
            {lines.map(line => {
              const name = line.employees ? `${line.employees.first_name} ${line.employees.last_name}` : line.employee_id.substring(0, 8);
              const elig = eligibility.get(line.employee_id);
              const badge = getEligibilityBadgeProps(elig?.status ?? 'eligible');
              const isBlocked = elig && elig.status !== 'eligible' && elig.status !== 'processed';
              return (
                <tr key={line.id} className={`hover:bg-muted/30 ${isBlocked ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2.5 font-medium">{name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground capitalize">{line.employees?.pay_type ?? 'salary'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{line.regular_hours + line.overtime_hours}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtCurrency(line.regular_pay_cents)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtCurrency(line.bonus_cents)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmtCurrency(line.gross_pay_cents)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{fmtCurrency(line.total_deductions_cents)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtCurrency(line.net_pay_cents)}</td>
                  <td className="px-3 py-2.5"><Badge className={`text-[10px] border-0 ${badge.className}`}>{badge.label}</Badge></td>
                  <td className="px-3 py-2.5">
                    {!isTerminal && (
                      <div className="flex items-center gap-1">
                        <RoleGate allowedRoles={['super_admin']}>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(line)} title="Edit">
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          {!isBlocked ? null : (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => onExclude(line)} title="Exclude">
                              <UserX className="h-3 w-3" />
                            </Button>
                          )}
                        </RoleGate>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t bg-muted/30 font-semibold">
            <td className="px-3 py-2.5" colSpan={5}>Totals</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{fmtCurrency(lines.reduce((s, l) => s + l.gross_pay_cents, 0))}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{fmtCurrency(lines.reduce((s, l) => s + l.total_deductions_cents, 0))}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{fmtCurrency(lines.reduce((s, l) => s + l.net_pay_cents, 0))}</td>
            <td colSpan={2} />
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Summary Cards ───────────────────────────────────────────
function SummaryCards({ run, eligibleCount, blockedCount }: { run: PayrollRunRow; eligibleCount: number; blockedCount: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {[
        { label: 'Gross Pay', value: fmtCurrency(run.gross_pay_cents), icon: DollarSign },
        { label: 'Employer Taxes', value: fmtCurrency(run.employer_taxes_cents), icon: FileText },
        { label: 'Net Pay', value: fmtCurrency(run.net_pay_cents), icon: CreditCard },
        { label: 'Eligible', value: String(eligibleCount), icon: CheckCircle2, color: 'text-success' },
        { label: 'Blocked', value: String(blockedCount), icon: ShieldAlert, color: blockedCount > 0 ? 'text-destructive' : 'text-success' },
      ].map(s => (
        <Card key={s.label} className="min-w-0"><CardContent className="pt-4 pb-3 px-4">
          <div className={`flex items-center gap-1.5 mb-1 ${(s as any).color ?? 'text-muted-foreground'}`}>
            <s.icon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">{s.label}</span>
          </div>
          <p className="text-xl xl:text-2xl font-bold tabular-nums whitespace-nowrap leading-none">{s.value}</p>
        </CardContent></Card>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────
export default function PayrollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const { data: run, isLoading, error, refetch: refetchRun } = usePayrollRun(id);
  const { data: lines = [], refetch: refetchLines } = usePayrollRunEmployees(id);
  const { data: timecards = [] } = useTimecards(id);
  const { data: auditLogs = [] } = useAuditLogs({ tableName: 'payroll_runs', recordId: id, limit: 30 });
  const updateStatus = useUpdatePayrollRunStatus();
  const { data: internalNotes = [] } = useInternalNotes('payroll_run', id);
  const addNoteMutation = useAddInternalNote();

  const employeeIds = useMemo(() => lines.map(l => l.employee_id), [lines]);
  const { data: eligibilityData = [], refetch: refetchElig } = usePayrollEligibility(run?.company_id, employeeIds);

  const eligibilityMap = useMemo(() => {
    const m = new Map<string, { status: EligibilityStatus; reasons: string[] }>();
    for (const e of eligibilityData) m.set(e.employee_id, { status: e.status, reasons: e.reasons });
    return m;
  }, [eligibilityData]);

  const [activeTab, setActiveTab] = useState('overview');
  const [editLine, setEditLine] = useState<PayrollRunEmployeeRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!run || error) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-3">
      <p className="text-muted-foreground">Payroll run not found</p>
      <Button variant="outline" size="sm" onClick={() => navigate('/payroll')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
    </div>
  );

  const isTerminal = ['completed', 'paid', 'voided', 'reversed', 'failed'].includes(run.status);
  const isBiweekly = run.pay_frequency === 'biweekly';
  const isSemimonthly = run.pay_frequency === 'semimonthly';
  const freqLabel = isSemimonthly ? 'Semi-Monthly' : isBiweekly ? 'Bi-Weekly' : run.pay_frequency;

  const eligibleCount = lines.filter(l => (eligibilityMap.get(l.employee_id)?.status ?? 'eligible') === 'eligible').length;
  const blockedCount = lines.filter(l => { const s = eligibilityMap.get(l.employee_id)?.status; return s && s !== 'eligible' && s !== 'processed'; }).length;

  // Actions
  const getActions = (): Array<{ label: string; status: PayrollRunStatus; icon: any; variant?: string }> => {
    const a: Array<{ label: string; status: PayrollRunStatus; icon: any; variant?: string }> = [];
    const s = run.status;
    if (s === 'upcoming') a.push({ label: isBiweekly ? 'Open for Timecards' : 'Open Payroll', status: isBiweekly ? 'open_for_timecards' : 'open', icon: ClipboardList });
    if (s === 'open') a.push({ label: 'Send for Approval', status: 'awaiting_approval', icon: UserCheck });
    if (s === 'open_for_timecards') a.push({ label: 'Submit for Timecard Approval', status: 'awaiting_timecard_approval', icon: ClipboardList });
    if (s === 'awaiting_timecard_approval') a.push({ label: 'Approve Timecards', status: 'timecards_approved', icon: Check });
    if (s === 'timecards_approved') a.push({ label: 'Send for Payroll Approval', status: 'awaiting_approval', icon: UserCheck });
    if (s === 'awaiting_approval') {
      a.push({ label: 'Approve Payroll', status: 'pending_client_approval', icon: Check });
      if (run.auto_approved) a.push({ label: 'Auto-Approve', status: 'auto_approved', icon: Zap });
    }
    if (s === 'pending_client_approval') a.push({ label: 'Client Approve', status: 'client_approved', icon: Check });
    if (s === 'client_approved') a.push({ label: 'Proceed to Funding', status: 'funding', icon: Landmark });
    if (s === 'auto_approved') a.push({ label: 'Process Payroll', status: 'processing', icon: Send });
    if (s === 'funding') a.push({ label: 'Admin Approval', status: 'pending_admin_approval', icon: ShieldCheck });
    if (s === 'pending_admin_approval') a.push({ label: 'Admin Approve', status: 'admin_approved', icon: Check });
    if (s === 'admin_approved') a.push({ label: 'Submit to Provider', status: 'submitting', icon: Send });
    if (s === 'submitting') a.push({ label: 'Mark Submitted', status: 'submitted', icon: CheckCircle2 });
    if (s === 'submitted') a.push({ label: 'Mark Processing', status: 'processing', icon: Loader2 });
    if (s === 'processing') a.push({ label: 'Mark Completed', status: 'completed', icon: CheckCircle2 });
    if (s === 'funded') a.push({ label: 'Mark Paid', status: 'paid', icon: CheckCircle2 });
    if (s === 'late_submission') {
      a.push({ label: 'Request Expedited', status: 'expedited_funding_required', icon: Zap });
      a.push({ label: 'Manual Checks', status: 'manual_check_required', icon: FileWarning, variant: 'destructive' });
    }
    if (s === 'expedited_funding_required') a.push({ label: 'Confirm Expedited', status: 'expedited_processing', icon: Zap });
    if (s === 'expedited_processing') a.push({ label: 'Process', status: 'processing', icon: Send });
    if (s === 'manual_check_required') a.push({ label: 'Mark Completed', status: 'completed', icon: CheckCircle2 });
    return a;
  };

  const handleStatusChange = async (newStatus: PayrollRunStatus) => {
    try {
      const extras: Record<string, unknown> = {};
      if (newStatus === 'client_approved') { extras.client_approved_by = user?.id; extras.client_approved_at = new Date().toISOString(); }
      if (newStatus === 'admin_approved') { extras.admin_approved_by = user?.id; extras.admin_approved_at = new Date().toISOString(); }
      if (newStatus === 'submitted') extras.submitted_at = new Date().toISOString();
      if (['expedited_funding_required', 'expedited_processing'].includes(newStatus)) extras.is_expedited = true;
      if (newStatus === 'manual_check_required') extras.is_manual_check = true;
      if (newStatus === 'auto_approved') extras.auto_approved = true;
      await updateStatus.mutateAsync({ id: run.id, status: newStatus, ...extras });
      toast({ title: `Status updated to ${newStatus.replace(/_/g, ' ')}` });
    } catch (err: any) {
      toast({ title: 'Transition failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleProcessPayroll = async () => {
    try {
      // Process with compliance gating
      if (blockedCount > 0) {
        toast({ title: `${blockedCount} employee(s) will be excluded`, description: 'Blocked employees will be routed to off-cycle.' });
      }
      await handleStatusChange('processing' as PayrollRunStatus);

      // Generate invoice
      await supabase.functions.invoke('generate-invoice', { body: { payroll_run_id: run.id } });
      await supabase.from('payroll_runs').update({ invoice_status: 'generated' } as any).eq('id', run.id);
      toast({ title: 'Payroll processed and invoice generated' });
    } catch (err: any) {
      toast({ title: 'Processing failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditSave = async (updates: any) => {
    if (!editLine) return;
    try {
      const grossEst = (updates.regular_pay_cents ?? editLine.regular_pay_cents) + (updates.bonus_cents ?? editLine.bonus_cents) + (updates.reimbursement_cents ?? editLine.reimbursement_cents);
      await supabase
        .from('payroll_run_employees')
        .update({ ...updates, gross_pay_cents: grossEst } as any)
        .eq('id', editLine.id);
      toast({ title: 'Employee pay updated' });
      refetchLines();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleExclude = async (line: PayrollRunEmployeeRow) => {
    try {
      // Remove from this run
      await supabase.from('payroll_run_employees').update({ status: 'excluded' } as any).eq('id', line.id);

      const { count: includedCount, error: countError } = await supabase
        .from('payroll_run_employees')
        .select('id', { count: 'exact', head: true })
        .eq('payroll_run_id', run.id)
        .neq('status', 'excluded');

      if (countError) throw countError;

      await supabase
        .from('payroll_runs')
        .update({ employee_count: includedCount ?? 0 } as any)
        .eq('id', run.id);

      // Create off-cycle payroll run for this employee
      const { data: offCycle } = await supabase.from('payroll_runs').insert({
        company_id: run.company_id,
        run_type: 'off_cycle',
        pay_frequency: run.pay_frequency,
        pay_period_start: run.pay_period_start,
        pay_period_end: run.pay_period_end,
        pay_date: run.pay_date,
        status: 'draft',
        created_by: user?.id ?? '00000000-0000-0000-0000-000000000000',
        parent_run_id: run.id,
        employee_count: 1,
        notes: `Off-cycle for excluded employee. Reason: ${(eligibilityMap.get(line.employee_id)?.reasons ?? []).join(', ')}`,
      } as any).select().single();

      if (offCycle) {
        await supabase.from('payroll_run_employees').insert({
          payroll_run_id: (offCycle as any).id,
          employee_id: line.employee_id,
          company_id: run.company_id,
          status: 'pending',
          regular_hours: line.regular_hours,
          regular_pay_cents: line.regular_pay_cents,
          gross_pay_cents: line.gross_pay_cents,
        } as any);
      }

      // Update exception count
      await supabase.from('payroll_runs').update({ exception_count: Math.max(0, (run.exception_count ?? 0) + 1) } as any).eq('id', run.id);

      toast({ title: 'Employee excluded and off-cycle created' });
      refetchRun();
      refetchLines();
    } catch (err: any) {
      toast({ title: 'Exclusion failed', description: err.message, variant: 'destructive' });
    }
  };

  const auditEntries: AuditEntry[] = auditLogs.map(log => ({
    id: log.id, action: log.action, actor: log.user_email || 'System',
    actorRole: log.user_role || undefined, entity: 'Payroll Run',
    details: formatAuditChanges(log), timestamp: log.created_at,
  }));

  const actions = getActions();
  const activeDeadline = run.timecard_deadline && ['open_for_timecards', 'awaiting_timecard_approval'].includes(run.status)
    ? { deadline: run.timecard_deadline, label: 'Timecard Deadline' }
    : run.approval_deadline && !isTerminal
    ? { deadline: run.approval_deadline, label: 'Approval Deadline' }
    : run.expedited_deadline && ['expedited_funding_required'].includes(run.status)
    ? { deadline: run.expedited_deadline, label: 'Wire Deadline' }
    : run.submission_deadline ? { deadline: run.submission_deadline, label: 'Submission Deadline' }
    : null;

  const canProcess = ['client_approved', 'admin_approved', 'auto_approved'].includes(run.status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/payroll')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold">{run.companies?.name ?? 'Payroll Run'}</h1>
            <StatusBadge status={run.status as any} />
            <Badge variant="outline" className="capitalize text-xs">{freqLabel}</Badge>
            <Badge variant="outline" className="capitalize text-xs">{run.run_type.replace(/_/g, ' ')}</Badge>
            {run.auto_approved && <Badge variant="secondary" className="text-xs">Auto-Approve</Badge>}
            {run.is_expedited && <Badge className="text-xs bg-warning/10 text-warning border-warning/30">Expedited</Badge>}
            {run.is_manual_check && <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/30">Manual Check</Badge>}
            <Badge variant="outline" className="text-xs capitalize">Invoice: {run.invoice_status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {run.pay_period_start} — {run.pay_period_end} · Check: {run.pay_date} · {run.employee_count} employees · ID: {run.company_id.substring(0, 8)}
          </p>
        </div>
        {activeDeadline && !isTerminal && <DeadlineCountdown deadline={activeDeadline.deadline} label={activeDeadline.label} warningHours={48} criticalHours={6} />}
        <div className="flex items-center gap-4 text-sm shrink-0">
          <div className="text-right"><p className="text-xs text-muted-foreground">Gross</p><p className="font-semibold tabular-nums">{centsToUSD(run.gross_pay_cents)}</p></div>
          <div className="text-right"><p className="text-xs text-muted-foreground">Net</p><p className="font-semibold tabular-nums">{centsToUSD(run.net_pay_cents)}</p></div>
        </div>
      </div>

      {/* Status banners */}
      {run.status === 'late_submission' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <div><p className="font-medium text-xs text-destructive">Late Submission</p><p className="text-xs text-muted-foreground">Choose expedited processing (wire required) or manual checks.</p></div>
        </div>
      )}
      {run.status === 'manual_check_required' && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <FileWarning className="h-4 w-4 text-destructive shrink-0" />
          <div><p className="font-medium text-xs text-destructive">Manual Check Required</p><p className="text-xs text-muted-foreground">Manual checks must be issued for all employees.</p></div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {isBiweekly && <TabsTrigger value="timecards">Timecards ({timecards.length})</TabsTrigger>}
              <TabsTrigger value="employees">
                Employees ({lines.length})
                {blockedCount > 0 && <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-destructive/10 text-destructive border-0">{blockedCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="funding">Funding</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5 mt-4">
              <SummaryCards run={run} eligibleCount={eligibleCount} blockedCount={blockedCount} />

              <Card><CardHeader className="pb-3"><CardTitle className="text-base">Payroll Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Gross Pay</span><span className="font-medium tabular-nums">{fmtCurrency(run.gross_pay_cents)}</span></div>
                    <Separator />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employer Taxes</p>
                    {[
                      ['ER FICA (SS + Medicare)', lines.reduce((s, l) => s + l.employer_fica_cents, 0)],
                      ['FUTA', lines.reduce((s, l) => s + l.employer_futa_cents, 0)],
                      ['State Unemployment (SUI)', lines.reduce((s, l) => s + l.employer_sui_cents, 0)],
                    ].map(([label, cents]) => (
                      <div key={label as string} className="flex justify-between pl-3"><span className="text-muted-foreground">{label as string}</span><span className="font-medium tabular-nums">{fmtCurrency(cents as number)}</span></div>
                    ))}
                    <div className="flex justify-between pl-3 font-medium"><span className="text-muted-foreground">Total Employer Taxes</span><span className="tabular-nums">{fmtCurrency(run.employer_taxes_cents)}</span></div>
                    <Separator />
                    {[
                      ['Employer Benefits', run.employer_benefits_cents],
                      ["Workers' Comp", run.workers_comp_cents],
                    ].map(([label, cents]) => (
                      <div key={label as string} className="flex justify-between"><span className="text-muted-foreground">{label as string}</span><span className="font-medium tabular-nums">{fmtCurrency(cents as number)}</span></div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold"><span>Total Employer Cost</span><span className="tabular-nums">{fmtCurrency(run.total_employer_cost_cents)}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card><CardHeader className="pb-3"><CardTitle className="text-base">Deadlines</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {isBiweekly && (<>
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Timecard</span><span className="font-medium">{run.timecard_deadline ? format(parseISO(run.timecard_deadline), 'EEE MMM d, h:mm a') : 'Mon 10:00 AM'} EST</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Wire</span><span className="font-medium">{run.expedited_deadline ? format(parseISO(run.expedited_deadline), 'EEE MMM d, h:mm a') : 'Thu 1:00 PM'} EST</span></div>
                  </>)}
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />Approval</span><span className="font-medium">{run.approval_deadline ? format(parseISO(run.approval_deadline), 'EEE MMM d, h:mm a') : isSemimonthly ? '4 days before pay date' : 'Tue 5:00 PM'} EST</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Pay Date</span><span className="font-medium">{run.pay_date}</span></div>
                </CardContent>
              </Card>

              {run.readiness_score > 0 && (
                <Card><CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Payroll Readiness</span>
                    <span className={`text-lg font-bold ${run.readiness_score >= 80 ? 'text-success' : run.readiness_score >= 50 ? 'text-warning' : 'text-destructive'}`}>{run.readiness_score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${run.readiness_score >= 80 ? 'bg-success' : run.readiness_score >= 50 ? 'bg-warning' : 'bg-destructive'}`} style={{ width: `${run.readiness_score}%` }} />
                  </div>
                </CardContent></Card>
              )}
            </TabsContent>

            <TabsContent value="timecards" className="mt-4"><TimecardSection timecards={timecards} userId={user?.id} /></TabsContent>

            <TabsContent value="employees" className="mt-4">
              <EmployeeRoster
                lines={lines}
                run={run}
                eligibility={eligibilityMap}
                onEdit={line => { setEditLine(line); setEditOpen(true); }}
                onExclude={handleExclude}
                onRevalidate={() => refetchElig()}
              />
            </TabsContent>

            <TabsContent value="funding" className="mt-4"><FundingSection run={run} userId={user?.id} /></TabsContent>

            <TabsContent value="vendors" className="mt-4">
              <RideAlongVendorsTab
                payrollRunId={run.id}
                companyId={run.company_id}
                payDate={run.pay_date}
                editable={['draft', 'open', 'open_for_timecards', 'editing', 'preview', 'time_review'].includes(run.status)}
              />
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              {auditEntries.length > 0 ? <AuditTimeline entries={auditEntries} maxItems={50} /> : <p className="text-sm text-muted-foreground text-center py-8">No audit entries yet.</p>}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Process payroll button */}
          {canProcess && (
            <Card><CardContent className="pt-5 pb-4 space-y-3">
              <Button className="w-full gap-1.5" onClick={handleProcessPayroll} disabled={updateStatus.isPending}>
                <Play className="h-4 w-4" />Process Payroll
              </Button>
              {blockedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {blockedCount} employee(s) blocked — they will be excluded and routed to off-cycle payroll.
                </p>
              )}
            </CardContent></Card>
          )}

          {/* Status actions */}
          {!isTerminal && actions.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {actions.map(action => (
                  <Button key={action.status} size="sm" variant={action.variant === 'destructive' ? 'destructive' : 'default'} className="w-full gap-1.5" disabled={updateStatus.isPending} onClick={() => handleStatusChange(action.status)}>
                    <action.icon className="h-4 w-4" />{updateStatus.isPending ? 'Updating…' : action.label}
                  </Button>
                ))}
                <RoleGate allowedRoles={['super_admin']}>
                  <Separator className="my-2" />
                  <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={async () => {
                    await supabase.functions.invoke('generate-invoice', { body: { payroll_run_id: run.id } });
                    await supabase.from('payroll_runs').update({ invoice_status: 'generated' } as any).eq('id', run.id);
                    toast({ title: 'Invoice generated' });
                  }}>
                    <Receipt className="h-3.5 w-3.5" />Generate Invoice
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-destructive hover:text-destructive" disabled={updateStatus.isPending} onClick={async () => {
                    try {
                      await updateStatus.mutateAsync({ id: run.id, status: 'voided' as PayrollRunStatus, voided_by: user?.id, voided_at: new Date().toISOString(), void_reason: 'Voided by admin' });
                      toast({ title: 'Payroll run voided' });
                    } catch (err: any) { toast({ title: 'Void failed', description: err.message, variant: 'destructive' }); }
                  }}>
                    <Ban className="h-3.5 w-3.5" />Void Run
                  </Button>
                </RoleGate>
              </CardContent>
            </Card>
          )}

          {isTerminal && (
            <Card><CardContent className="pt-5">
              <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${['completed', 'paid'].includes(run.status) ? 'border border-success/30 bg-success/5' : 'border border-destructive/30 bg-destructive/5'}`}>
                {['completed', 'paid'].includes(run.status) ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                <div><p className="text-sm font-medium capitalize">{run.status.replace(/_/g, ' ')}</p>{run.void_reason && <p className="text-xs text-muted-foreground">{run.void_reason}</p>}</div>
              </div>
            </CardContent></Card>
          )}

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Run Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[['Frequency', freqLabel], ['Run Type', run.run_type.replace(/_/g, ' ')], ['Employees', String(run.employee_count)], ['Eligible', String(eligibleCount)], ['Blocked', String(blockedCount)], ['Funding', run.funding_status], ['Invoice', run.invoice_status], ['Exceptions', String(run.exception_count)], ['Created', format(parseISO(run.created_at), 'MMM d, yyyy h:mm a')]].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium capitalize">{v}</span></div>
              ))}
            </CardContent>
          </Card>

          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
            <CardContent>{auditEntries.length > 0 ? <AuditTimeline entries={auditEntries} maxItems={5} /> : <p className="text-xs text-muted-foreground">No activity yet.</p>}</CardContent>
          </Card>

          <RoleGate allowedRoles={['super_admin']}>
            <InternalNotes
              notes={internalNotes.map(n => ({ id: n.id, author: n.author_name, authorRole: n.author_role, content: n.content, jiraRef: n.jira_ref ?? undefined, createdAt: n.created_at }))}
              onAddNote={(content, jiraRef) => {
                if (!user) return;
                addNoteMutation.mutate({ record_type: 'payroll_run', record_id: id!, author_id: user.id, author_name: profile?.full_name || user.email || 'Unknown', author_role: role || 'super_admin', content, jira_ref: jiraRef });
              }}
            />
          </RoleGate>
        </div>
      </div>

      <EditEmployeeDialog open={editOpen} onOpenChange={setEditOpen} line={editLine} onSave={handleEditSave} />
    </div>
  );
}
