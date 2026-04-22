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
  const { profile } = useAuth();
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
      if (next.has(id)) next.delete(id); else next.add(id);
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={FileText} label="Submitted" value={stats.submitted} tone="info" />
        <StatTile icon={CheckCircle} label="Approved" value={stats.approved} tone="success" />
        <StatTile icon={Clock} label="Open" value={stats.open} tone="muted" />
        <StatTile icon={AlertTriangle} label="Rejected" value={stats.rejected} tone="destructive" />
      </div>

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
