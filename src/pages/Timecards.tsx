import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, Search, Mail, AlertTriangle, Users,
  FileText, Edit2, ChevronRight, Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyTimecards, useUpdateTimecard, useApproveTimecards, type TimecardRow } from '@/hooks/useTimecards';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { useEmployees } from '@/hooks/useEmployees';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return format(new Date(d), 'MMM d, yyyy');
}

// ─── Edit Timecard Dialog ───
function EditTimecardDialog({ timecard, open, onClose }: { timecard: TimecardRow | null; open: boolean; onClose: () => void }) {
  const updateTimecard = useUpdateTimecard();
  const [regular, setRegular] = useState('');
  const [overtime, setOvertime] = useState('');
  const [pto, setPto] = useState('');
  const [holiday, setHoliday] = useState('');
  const [notes, setNotes] = useState('');

  // Sync local state when dialog opens
  useState(() => {
    if (timecard) {
      setRegular(String(timecard.regular_hours));
      setOvertime(String(timecard.overtime_hours));
      setPto(String(timecard.pto_hours));
      setHoliday(String(timecard.holiday_hours));
      setNotes(timecard.notes || '');
    }
  });

  if (!timecard) return null;

  const empName = timecard.employees
    ? `${timecard.employees.first_name} ${timecard.employees.last_name}`
    : 'Unknown';

  const handleSave = () => {
    const reg = parseFloat(regular) || 0;
    const ot = parseFloat(overtime) || 0;
    const p = parseFloat(pto) || 0;
    const h = parseFloat(holiday) || 0;

    updateTimecard.mutate({
      id: timecard.id,
      regular_hours: reg,
      overtime_hours: ot,
      pto_hours: p,
      holiday_hours: h,
      total_hours: reg + ot + p + h,
      notes,
    } as any, {
      onSuccess: () => { toast.success('Timecard updated'); onClose(); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Timecard — {empName}</DialogTitle>
          <DialogDescription>
            {timecard.payroll_runs
              ? `Pay Period: ${fmtDate(timecard.payroll_runs.pay_period_start)} – ${fmtDate(timecard.payroll_runs.pay_period_end)}`
              : 'Adjust hours and save'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Regular Hours</label>
            <Input type="number" min={0} step={0.5} value={regular} onChange={e => setRegular(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Overtime Hours</label>
            <Input type="number" min={0} step={0.5} value={overtime} onChange={e => setOvertime(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">PTO Hours</label>
            <Input type="number" min={0} step={0.5} value={pto} onChange={e => setPto(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Holiday Hours</label>
            <Input type="number" min={0} step={0.5} value={holiday} onChange={e => setHoliday(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={updateTimecard.isPending}>
            {updateTimecard.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Missing Timecards Reminder Dialog ───
function MissingTimecardDialog({
  missingEmployees,
  open,
  onClose,
}: {
  missingEmployees: { name: string; email: string }[];
  open: boolean;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);

  const handleSendReminders = async () => {
    setSending(true);
    // In production this would call an edge function to send emails.
    // For now we simulate success.
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    toast.success(`Reminder sent to ${missingEmployees.length} employee(s)`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Timecard Reminders
          </DialogTitle>
          <DialogDescription>
            The following employees have not submitted their timecards. Send them a reminder email?
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-48 overflow-y-auto space-y-1.5">
          {missingEmployees.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
              <span className="font-medium">{e.name}</span>
              <span className="text-xs text-muted-foreground">{e.email}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSendReminders} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
            Send {missingEmployees.length} Reminder(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───
export default function Timecards() {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id || undefined;

  const [statusFilter, setStatusFilter] = useState('all');
  const [payrollRunFilter, setPayrollRunFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<TimecardRow | null>(null);
  const [showMissing, setShowMissing] = useState(false);

  const navigate = useNavigate();
  const { data: timecards = [], isLoading } = useCompanyTimecards(companyId, {
    payrollRunId: payrollRunFilter !== 'all' ? payrollRunFilter : undefined,
    status: statusFilter,
  });
  const { data: payrollRuns = [] } = usePayrollRuns(companyId);
  const { data: allEmployees = [] } = useEmployees(companyId);
  const approveTimecards = useApproveTimecards();

  // Compute stats
  const submitted = timecards.filter(t => t.approval_status === 'submitted');
  const approved = timecards.filter(t => t.approval_status === 'approved');
  const pending = timecards.filter(t => t.approval_status === 'pending');

  // Identify open payroll runs (employees may need to submit timecards)
  const openRuns = payrollRuns.filter(r =>
    ['open_for_timecards', 'awaiting_timecard_approval', 'open', 'draft'].includes(r.status)
  );

  // Employees missing timecards for open runs
  const missingEmployees = useMemo(() => {
    if (openRuns.length === 0) return [];
    const submittedEmpIds = new Set(timecards.filter(t =>
      openRuns.some(r => r.id === t.payroll_run_id)
    ).map(t => t.employee_id));
    return allEmployees
      .filter(e => e.status === 'active' && !submittedEmpIds.has(e.id))
      .map(e => ({ name: `${e.first_name} ${e.last_name}`, email: e.email }));
  }, [openRuns, timecards, allEmployees]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchTerm) return timecards;
    const term = searchTerm.toLowerCase();
    return timecards.filter(t => {
      const name = t.employees ? `${t.employees.first_name} ${t.employees.last_name}`.toLowerCase() : '';
      return name.includes(term);
    });
  }, [timecards, searchTerm]);

  // Toggle row selection
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    const submittedIds = filtered.filter(t => t.approval_status === 'submitted').map(t => t.id);
    if (submittedIds.every(id => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(submittedIds));
    }
  };

  // Approve selected
  const handleApprove = () => {
    if (selected.size === 0) return;
    approveTimecards.mutate(
      { ids: Array.from(selected), approvedBy: user?.id || '' },
      {
        onSuccess: () => {
          toast.success(`${selected.size} timecard(s) approved`);
          setSelected(new Set());
          // If all submitted timecards are now approved, prompt to go to payroll
          const remainingSubmitted = timecards.filter(t => t.approval_status === 'submitted' && !selected.has(t.id));
          if (remainingSubmitted.length === 0 && openRuns.length > 0) {
            toast.info('All timecards approved! Redirecting to payroll...', { duration: 2000 });
            setTimeout(() => navigate(`/payroll/${openRuns[0].id}`), 2000);
          }
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  // Unique payroll runs for filter
  const runOptions = payrollRuns.map(r => ({
    id: r.id,
    label: `${fmtDate(r.pay_period_start)} – ${fmtDate(r.pay_period_end)}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timecards"
        description="Review, edit, and approve employee timecards"
        actions={
          <div className="flex items-center gap-2">
            {missingEmployees.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowMissing(true)}>
                <Mail className="h-4 w-4 mr-1.5" />
                Remind ({missingEmployees.length})
              </Button>
            )}
            {selected.size > 0 && (
              <Button size="sm" onClick={handleApprove} disabled={approveTimecards.isPending}>
                {approveTimecards.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  : <CheckCircle className="h-4 w-4 mr-1.5" />}
                Approve ({selected.size})
              </Button>
            )}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="text-xl font-semibold tabular-nums">{submitted.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-xl font-semibold tabular-nums">{approved.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-semibold tabular-nums">{pending.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Missing</p>
              <p className="text-xl font-semibold tabular-nums">{missingEmployees.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing timecards alert */}
      {missingEmployees.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {missingEmployees.length} employee{missingEmployees.length > 1 ? 's have' : ' has'} not submitted timecards
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Send a reminder email to prompt submission before the deadline.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => setShowMissing(true)}>
            <Mail className="h-4 w-4 mr-1.5" /> Send Reminders
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by employee name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payrollRunFilter} onValueChange={setPayrollRunFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue placeholder="Pay Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pay Periods</SelectItem>
            {runOptions.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timecards table */}
      <Card className="shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left w-10">
                  <Checkbox
                    checked={filtered.filter(t => t.approval_status === 'submitted').length > 0 &&
                      filtered.filter(t => t.approval_status === 'submitted').every(t => selected.has(t.id))}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Pay Period</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">OT</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">PTO</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Holiday</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Submitted</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading timecards...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                  No timecards found for the selected filters.
                </td></tr>
              ) : filtered.map(tc => {
                const empName = tc.employees
                  ? `${tc.employees.first_name} ${tc.employees.last_name}`
                  : 'Unknown';
                const period = tc.payroll_runs
                  ? `${fmtDate(tc.payroll_runs.pay_period_start)} – ${fmtDate(tc.payroll_runs.pay_period_end)}`
                  : '—';
                const isSubmitted = tc.approval_status === 'submitted';

                return (
                  <tr key={tc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {isSubmitted && (
                        <Checkbox
                          checked={selected.has(tc.id)}
                          onCheckedChange={() => toggleSelect(tc.id)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{empName}</p>
                        {tc.employees?.title && (
                          <p className="text-xs text-muted-foreground">{tc.employees.title}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{period}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tc.regular_hours}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {tc.overtime_hours > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{tc.overtime_hours}</span>
                      ) : '0'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{tc.pto_hours}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tc.holiday_hours}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{tc.total_hours}</td>
                    <td className="px-4 py-3"><StatusBadge status={tc.approval_status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(tc.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingCard(tc)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {isSubmitted && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            approveTimecards.mutate(
                              { ids: [tc.id], approvedBy: user?.id || '' },
                              {
                                onSuccess: () => toast.success(`Timecard for ${empName} approved`),
                                onError: (e) => toast.error(e.message),
                              }
                            );
                          }}>
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approve & Go to Payroll CTA */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-4">
          <p className="text-sm font-medium">
            {selected.size} timecard{selected.size > 1 ? 's' : ''} selected for approval
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear Selection</Button>
            <Button size="sm" onClick={handleApprove} disabled={approveTimecards.isPending}>
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Approve & Continue to Payroll
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EditTimecardDialog timecard={editingCard} open={!!editingCard} onClose={() => setEditingCard(null)} />
      <MissingTimecardDialog missingEmployees={missingEmployees} open={showMissing} onClose={() => setShowMissing(false)} />
    </div>
  );
}
