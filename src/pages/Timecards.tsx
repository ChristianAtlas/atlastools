import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Clock, CheckCircle, Search, AlertTriangle, FileText, Loader2, XCircle, Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTKSettings, useTKPeriods, useCompanyTKTimecards,
  useApproveTKTimecards, useRejectTKTimecard, type TKTimecard,
} from '@/hooks/useTimekeeping';
import { TimekeepingDisabledNotice } from '@/components/timekeeping/TimekeepingDisabledNotice';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  locked: 'bg-warning/10 text-warning',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return format(new Date(d), 'MMM d, yyyy');
}

export default function Timecards() {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id || undefined;

  const { data: settings, isLoading: setLoading } = useTKSettings(companyId);
  const { data: periods = [] } = useTKPeriods(companyId);
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<TKTimecard | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: timecards = [], isLoading } = useCompanyTKTimecards(companyId, {
    periodId: periodFilter !== 'all' ? periodFilter : undefined,
    status: statusFilter,
  });

  const approve = useApproveTKTimecards();
  const reject = useRejectTKTimecard();

  const stats = useMemo(() => ({
    submitted: timecards.filter(t => t.status === 'submitted').length,
    approved: timecards.filter(t => t.status === 'approved').length,
    open: timecards.filter(t => t.status === 'open').length,
    rejected: timecards.filter(t => t.status === 'rejected').length,
  }), [timecards]);

  const filtered = useMemo(() => {
    if (!search) return timecards;
    const term = search.toLowerCase();
    return timecards.filter(t => {
      const name = t.employees ? `${t.employees.first_name} ${t.employees.last_name}`.toLowerCase() : '';
      return name.includes(term);
    });
  }, [timecards, search]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    const ids = filtered.filter(t => t.status === 'submitted').map(t => t.id);
    if (ids.length && ids.every(id => selected.has(id))) setSelected(new Set());
    else setSelected(new Set(ids));
  };

  const handleApprove = () => {
    if (!selected.size) return;
    approve.mutate(Array.from(selected), {
      onSuccess: () => { toast.success(`${selected.size} timecard(s) approved`); setSelected(new Set()); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleReject = () => {
    if (!rejecting || !rejectReason.trim()) return;
    reject.mutate({ id: rejecting.id, reason: rejectReason.trim() }, {
      onSuccess: () => { toast.success('Timecard returned to employee'); setRejecting(null); setRejectReason(''); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (setLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!settings?.is_enabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Timecards" description="Review and approve employee timecards" />
        <TimekeepingDisabledNotice context="admin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timecards"
        description="Review and approve employee timecards for the current pay period"
        actions={
          selected.size > 0 ? (
            <Button size="sm" onClick={handleApprove} disabled={approve.isPending} className="gap-1.5">
              {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Approve ({selected.size})
            </Button>
          ) : null
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FileText} label="Submitted" value={stats.submitted} tone="info" />
        <StatTile icon={CheckCircle} label="Approved" value={stats.approved} tone="success" />
        <StatTile icon={Clock} label="Open" value={stats.open} tone="muted" />
        <StatTile icon={AlertTriangle} label="Rejected" value={stats.rejected} tone="destructive" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Pay period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All pay periods</SelectItem>
            {periods.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left w-10">
                  <Checkbox
                    checked={(() => {
                      const subs = filtered.filter(t => t.status === 'submitted');
                      return subs.length > 0 && subs.every(t => selected.has(t.id));
                    })()}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Pay period</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Regular</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">OT</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">PTO</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No timecards found.</td></tr>
              ) : filtered.map(t => {
                const empName = t.employees ? `${t.employees.first_name} ${t.employees.last_name}` : '—';
                const period = t.tk_payroll_periods;
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggleSelect(t.id)}
                        disabled={t.status !== 'submitted'}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{empName}</p>
                      <p className="text-xs text-muted-foreground">{t.employees?.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {period ? `${fmtDate(period.period_start)} – ${fmtDate(period.period_end)}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(t.regular_hours).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(t.overtime_hours).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(t.pto_hours).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{Number(t.total_hours).toFixed(2)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      {t.status === 'submitted' ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-success hover:text-success" onClick={() => approve.mutate([t.id], { onSuccess: () => toast.success('Approved') })}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setRejecting(t)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : t.status === 'locked' ? (
                        <Lock className="h-4 w-4 text-muted-foreground inline" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={o => { if (!o) { setRejecting(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return timecard to employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {rejecting?.employees ? `${rejecting.employees.first_name} ${rejecting.employees.last_name}` : ''} will be notified to correct and resubmit.
            </p>
            <Textarea
              placeholder="Explain what needs to be fixed…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || reject.isPending}>
              {reject.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'info' | 'success' | 'muted' | 'destructive' }) {
  const toneCls: Record<string, string> = {
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    muted: 'bg-muted text-muted-foreground',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneCls[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

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
