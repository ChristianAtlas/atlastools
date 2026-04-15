import { useState, useMemo } from 'react';
import { Loader2, Plus, Check, X, CalendarDays, Pencil, Trash2, PartyPopper } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { usePTORequests, useUpdatePTORequest, hoursToDays, type PTORequest } from '@/hooks/usePTO';
import { useCompanyHolidays, useCreateCompanyHoliday, useUpdateCompanyHoliday, useDeleteCompanyHoliday, type CompanyHoliday } from '@/hooks/useCompanyHolidays';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isSameDay, startOfYear, isAfter, isBefore, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, string> = {
  pending: 'pending_approval',
  approved: 'approved',
  denied: 'failed',
  taken: 'completed',
  cancelled: 'terminated',
};

export default function PTO() {
  const [filter, setFilter] = useState<string>('');
  const { profile, user, role } = useAuth();
  const companyId = profile?.company_id ?? undefined;

  const { data: requests = [], isLoading } = usePTORequests(
    filter ? { status: filter as any, companyId } : { companyId }
  );
  const { data: holidays = [], isLoading: holidaysLoading } = useCompanyHolidays(companyId);
  const updateRequest = useUpdatePTORequest();
  const { toast } = useToast();

  const handleAction = async (id: string, status: 'approved' | 'denied') => {
    try {
      await updateRequest.mutateAsync({
        id,
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      });
      toast({ title: `Request ${status}` });
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    }
  };

  // YTD balances aggregated by employee
  const ytdBalances = useMemo(() => {
    const yearStart = startOfYear(new Date());
    const ytdRequests = requests.filter(
      r => (r.status === 'approved' || r.status === 'taken') && isAfter(parseISO(r.start_date), yearStart)
    );
    const grouped: Record<string, {
      name: string;
      vacation: number;
      sick: number;
      personal: number;
      other: number;
      total: number;
    }> = {};

    ytdRequests.forEach(r => {
      const empId = r.employee_id;
      const empName = r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : 'Unknown';
      if (!grouped[empId]) {
        grouped[empId] = { name: empName, vacation: 0, sick: 0, personal: 0, other: 0, total: 0 };
      }
      const ptoType = r.pto_policies?.pto_type ?? 'other';
      const hours = Number(r.hours);
      if (ptoType === 'vacation') grouped[empId].vacation += hours;
      else if (ptoType === 'sick') grouped[empId].sick += hours;
      else if (ptoType === 'personal') grouped[empId].personal += hours;
      else grouped[empId].other += hours;
      grouped[empId].total += hours;
    });

    return Object.entries(grouped)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requests]);

  // Calendar dates for time-off
  const approvedDates = useMemo(() => {
    return requests
      .filter(r => r.status === 'approved' || r.status === 'taken')
      .map(r => ({
        start: parseISO(r.start_date),
        end: parseISO(r.end_date),
        name: r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : 'Unknown',
        type: r.pto_policies?.name ?? 'PTO',
      }));
  }, [requests]);

  const holidayDates = useMemo(() => {
    return holidays.map(h => parseISO(h.date));
  }, [holidays]);

  // Calendar modifiers
  const calendarModifiers = useMemo(() => {
    const timeOffDays: Date[] = [];
    approvedDates.forEach(r => {
      let d = new Date(r.start);
      while (d <= r.end) {
        timeOffDays.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    });
    return {
      timeoff: timeOffDays,
      holiday: holidayDates,
    };
  }, [approvedDates, holidayDates]);

  const calendarModifiersStyles = {
    timeoff: { backgroundColor: 'hsl(var(--primary) / 0.15)', borderRadius: '4px', color: 'hsl(var(--primary))' },
    holiday: { backgroundColor: 'hsl(var(--warning) / 0.2)', borderRadius: '4px', color: 'hsl(var(--warning))' },
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="PTO Management"
        description="Time-off requests, balances, calendar, and company holidays"
      />

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="ytd">YTD Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="holidays">Company Holidays</TabsTrigger>
        </TabsList>

        {/* ─── Requests Tab ──────────────────────── */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center gap-3 animate-in-up stagger-1">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="h-9 rounded-md border bg-card px-3 text-sm outline-none ring-ring focus:ring-2 transition-shadow"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="taken">Taken</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <p className="text-sm text-muted-foreground ml-auto">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm">No PTO requests found.</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Dates</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Days</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.map(req => {
                    const empName = req.employees
                      ? `${req.employees.first_name} ${req.employees.last_name}`
                      : '—';
                    const policyName = req.pto_policies?.name ?? '—';
                    const badgeStatus = STATUS_MAP[req.status] || req.status;
                    return (
                      <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{empName}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{policyName}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                          {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {req.start_date !== req.end_date && ` – ${new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{hoursToDays(req.hours)}</td>
                        <td className="px-4 py-3"><StatusBadge status={badgeStatus as any} /></td>
                        <td className="px-4 py-3">
                          {req.status === 'pending' && (
                            <div className="flex gap-1.5">
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={updateRequest.isPending} onClick={() => handleAction(req.id, 'approved')}>
                                <Check className="h-3 w-3" /> Approve
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" disabled={updateRequest.isPending} onClick={() => handleAction(req.id, 'denied')}>
                                <X className="h-3 w-3" /> Deny
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── YTD Balances Tab ──────────────────── */}
        <TabsContent value="ytd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {new Date().getFullYear()} Year-to-Date Time Off Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ytdBalances.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No approved or taken PTO this year.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Vacation</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Sick</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Personal</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Other</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ytdBalances.map(emp => (
                        <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{emp.name}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{hoursToDays(emp.vacation)}d</td>
                          <td className="px-4 py-3 text-right tabular-nums">{hoursToDays(emp.sick)}d</td>
                          <td className="px-4 py-3 text-right tabular-nums">{hoursToDays(emp.personal)}d</td>
                          <td className="px-4 py-3 text-right tabular-nums">{hoursToDays(emp.other)}d</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold">{hoursToDays(emp.total)}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Calendar Tab ──────────────────────── */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Company-Wide Time Off Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  className="p-3 pointer-events-auto w-full"
                  modifiers={calendarModifiers}
                  modifiersStyles={calendarModifiersStyles}
                  numberOfMonths={2}
                />
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--primary) / 0.15)' }} />
                    <span>Time Off</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: 'hsl(var(--warning) / 0.2)' }} />
                    <span>Company Holiday</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Time Off</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvedDates
                  .filter(r => isAfter(r.end, new Date()))
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .slice(0, 10)
                  .map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.type}</p>
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {format(r.start, 'MMM d')}
                        {!isSameDay(r.start, r.end) && ` – ${format(r.end, 'MMM d')}`}
                      </p>
                    </div>
                  ))}
                {approvedDates.filter(r => isAfter(r.end, new Date())).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No upcoming time off</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Holidays Tab ──────────────────────── */}
        <TabsContent value="holidays">
          <HolidaysManager companyId={companyId} holidays={holidays} isLoading={holidaysLoading} isAdmin={role === 'client_admin' || role === 'super_admin'} userId={user?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Federal Holidays Helper ───────────────────────────────
interface FederalHolidayDef {
  name: string;
  getDate: (year: number) => string;
}

function nthDayOfMonth(year: number, month: number, dayOfWeek: number, n: number): string {
  const d = new Date(year, month - 1, 1);
  let count = 0;
  while (d.getMonth() === month - 1) {
    if (d.getDay() === dayOfWeek) {
      count++;
      if (count === n) return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    d.setDate(d.getDate() + 1);
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function lastMondayOfMay(year: number): string {
  const d = new Date(year, 4, 31);
  while (d.getDay() !== 1) d.setDate(d.getDate() - 1);
  return `${year}-05-${String(d.getDate()).padStart(2, '0')}`;
}

const FEDERAL_HOLIDAYS: FederalHolidayDef[] = [
  { name: "New Year's Day", getDate: (y) => `${y}-01-01` },
  { name: 'Birthday of Martin Luther King, Jr.', getDate: (y) => nthDayOfMonth(y, 1, 1, 3) },
  { name: "Washington's Birthday", getDate: (y) => nthDayOfMonth(y, 2, 1, 3) },
  { name: 'Memorial Day', getDate: (y) => lastMondayOfMay(y) },
  { name: 'Juneteenth', getDate: (y) => `${y}-06-19` },
  { name: 'Independence Day', getDate: (y) => `${y}-07-04` },
  { name: 'Labor Day', getDate: (y) => nthDayOfMonth(y, 9, 1, 1) },
  { name: 'Columbus Day', getDate: (y) => nthDayOfMonth(y, 10, 1, 2) },
  { name: 'Veterans Day', getDate: (y) => `${y}-11-11` },
  { name: 'Thanksgiving Day', getDate: (y) => nthDayOfMonth(y, 11, 4, 4) },
  { name: 'Christmas Day', getDate: (y) => `${y}-12-25` },
];

// ─── Holidays Manager Sub-Component ────────────────────────
function HolidaysManager({
  companyId,
  holidays,
  isLoading,
  isAdmin,
  userId,
}: {
  companyId: string | undefined;
  holidays: CompanyHoliday[];
  isLoading: boolean;
  isAdmin: boolean;
  userId: string | undefined;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyHoliday | null>(null);
  const [form, setForm] = useState({ name: '', date: '', is_paid: true, notes: '' });
  const [togglingFederal, setTogglingFederal] = useState<string | null>(null);
  const createHoliday = useCreateCompanyHoliday();
  const updateHoliday = useUpdateCompanyHoliday();
  const deleteHoliday = useDeleteCompanyHoliday();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const thisYearHolidays = holidays.filter(h => parseISO(h.date).getFullYear() === currentYear);
  const futureHolidays = thisYearHolidays.filter(h => isAfter(parseISO(h.date), new Date()));

  const federalHolidaysWithStatus = useMemo(() => {
    return FEDERAL_HOLIDAYS.map(fh => {
      const date = fh.getDate(currentYear);
      const existing = thisYearHolidays.find(h => h.name === fh.name && h.date === date);
      return { ...fh, date, observed: !!existing, holidayId: existing?.id };
    });
  }, [currentYear, thisYearHolidays]);

  const handleToggleFederal = async (fh: typeof federalHolidaysWithStatus[0]) => {
    if (!companyId || !isAdmin) return;
    setTogglingFederal(fh.name);
    try {
      if (fh.observed && fh.holidayId) {
        await deleteHoliday.mutateAsync(fh.holidayId);
        toast({ title: `${fh.name} removed` });
      } else {
        await createHoliday.mutateAsync({
          company_id: companyId, name: fh.name, date: fh.date,
          is_paid: true, notes: 'Federal holiday', created_by: userId ?? null,
        });
        toast({ title: `${fh.name} added` });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTogglingFederal(null);
    }
  };

  const handleSelectAll = async () => {
    if (!companyId || !isAdmin) return;
    const unobserved = federalHolidaysWithStatus.filter(fh => !fh.observed);
    if (unobserved.length === 0) return;
    setTogglingFederal('all');
    try {
      for (const fh of unobserved) {
        await createHoliday.mutateAsync({
          company_id: companyId, name: fh.name, date: fh.date,
          is_paid: true, notes: 'Federal holiday', created_by: userId ?? null,
        });
      }
      toast({ title: `${unobserved.length} federal holidays added` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTogglingFederal(null);
    }
  };

  const handleDeselectAll = async () => {
    if (!companyId || !isAdmin) return;
    const observed = federalHolidaysWithStatus.filter(fh => fh.observed && fh.holidayId);
    if (observed.length === 0) return;
    setTogglingFederal('all');
    try {
      for (const fh of observed) {
        await deleteHoliday.mutateAsync(fh.holidayId!);
      }
      toast({ title: `${observed.length} federal holidays removed` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTogglingFederal(null);
    }
  };

  const observedCount = federalHolidaysWithStatus.filter(f => f.observed).length;

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', date: '', is_paid: true, notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (h: CompanyHoliday) => {
    setEditing(h);
    setForm({ name: h.name, date: h.date, is_paid: h.is_paid, notes: h.notes ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date || !companyId) return;
    try {
      if (editing) {
        await updateHoliday.mutateAsync({ id: editing.id, name: form.name, date: form.date, is_paid: form.is_paid, notes: form.notes || null });
        toast({ title: 'Holiday updated' });
      } else {
        await createHoliday.mutateAsync({ company_id: companyId, name: form.name, date: form.date, is_paid: form.is_paid, notes: form.notes || null, created_by: userId ?? null });
        toast({ title: 'Holiday added' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHoliday.mutateAsync(id);
      toast({ title: 'Holiday removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };
  return (
    <div className="space-y-6">
      {/* ── Federal Holidays Selector ── */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm flex items-center gap-2">
              🇺🇸 Federal Holidays
              <Badge variant="outline" className="ml-1">{observedCount} of {FEDERAL_HOLIDAYS.length} observed</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs" disabled={togglingFederal !== null || observedCount === FEDERAL_HOLIDAYS.length} onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" disabled={togglingFederal !== null || observedCount === 0} onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">
              Toggle the federal holidays your company observes. Selected holidays will be added as paid company holidays for {currentYear}.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {federalHolidaysWithStatus.map(fh => {
                const d = parseISO(fh.date);
                const isPast = isBefore(d, new Date());
                return (
                  <div
                    key={fh.name}
                    className={cn(
                      'flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors',
                      fh.observed ? 'bg-primary/5 border-primary/20' : 'bg-card',
                      isPast && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Switch
                        checked={fh.observed}
                        disabled={togglingFederal !== null}
                        onCheckedChange={() => handleToggleFederal(fh)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{fh.name}</p>
                        <p className="text-xs text-muted-foreground">{format(d, 'EEEE, MMMM d, yyyy')}</p>
                      </div>
                    </div>
                    {togglingFederal === fh.name && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Company Holidays Table ── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-warning" />
            {currentYear} Company Observed Holidays
            <Badge variant="outline" className="ml-2">{thisYearHolidays.length} total</Badge>
            {futureHolidays.length > 0 && (
              <Badge variant="secondary" className="text-xs">{futureHolidays.length} upcoming</Badge>
            )}
          </CardTitle>
          {isAdmin && (
            <Button size="sm" className="gap-1" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Custom Holiday
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : thisYearHolidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No holidays configured for {currentYear}.{isAdmin ? ' Select federal holidays above or add a custom holiday.' : ''}
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Holiday</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Day</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Paid</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Notes</th>
                    {isAdmin && <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {thisYearHolidays.map(h => {
                    const d = parseISO(h.date);
                    const isPast = isBefore(d, new Date());
                    return (
                      <tr key={h.id} className={cn('hover:bg-muted/30 transition-colors', isPast && 'opacity-60')}>
                        <td className="px-4 py-3 font-medium">{h.name}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">{format(d, 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(d, 'EEEE')}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={h.is_paid ? 'default' : 'outline'} className="text-[10px]">
                            {h.is_paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{h.notes ?? '—'}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(h)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(h.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Holiday' : 'Add Custom Holiday'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Holiday Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Company Anniversary" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Paid Holiday</Label>
              <Switch checked={form.is_paid} onCheckedChange={v => setForm(f => ({ ...f, is_paid: v }))} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="e.g., Office closed all day" />
            </div>
            <Button
              onClick={handleSave}
              className="w-full"
              disabled={!form.name || !form.date || createHoliday.isPending || updateHoliday.isPending}
            >
              {createHoliday.isPending || updateHoliday.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? 'Save Changes' : 'Add Holiday'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
