import { useState, useMemo } from 'react';
import { CalendarDays, Plus, Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { usePTOBalances, usePTORequests, usePTOPolicies, hoursToDays, type PTOBalance, type PTORequest } from '@/hooks/usePTO';
import { useCompanyHolidays } from '@/hooks/useCompanyHolidays';
import { format, eachDayOfInterval, isWeekend, parseISO, isAfter, isBefore } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  denied: 'bg-destructive/10 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground',
  taken: 'bg-primary/10 text-primary border-primary/30',
};

function countDays(start: string, end: string) {
  if (!start || !end) return { weekdays: 0, weekendDays: 0 };
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    if (e < s) return { weekdays: 0, weekendDays: 0 };
    const days = eachDayOfInterval({ start: s, end: e });
    const weekendDays = days.filter(d => isWeekend(d)).length;
    return { weekdays: days.length - weekendDays, weekendDays };
  } catch {
    return { weekdays: 0, weekendDays: 0 };
  }
}

export default function TimeOff() {
  const { data: employee, isLoading } = useCurrentEmployee();
  const { data: balances = [] } = usePTOBalances(employee?.id, employee?.company_id);
  const { data: requests = [] } = usePTORequests({ employeeId: employee?.id });
  const { data: policies = [] } = usePTOPolicies(employee?.company_id);
  const { data: holidays = [] } = useCompanyHolidays(employee?.company_id);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const [form, setForm] = useState({ policyId: '', startDate: '', endDate: '', reason: '' });
  const [includeWeekends, setIncludeWeekends] = useState(false);

  const { weekdays, weekendDays } = useMemo(
    () => countDays(form.startDate, form.endDate),
    [form.startDate, form.endDate]
  );

  const hasWeekendDays = weekendDays > 0;
  const totalHours = (weekdays + (includeWeekends ? weekendDays : 0)) * 8;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!employee || !form.policyId || !form.startDate || !form.endDate || totalHours === 0) return;
    const { error } = await supabase.from('pto_requests').insert({
      employee_id: employee.id,
      company_id: employee.company_id,
      policy_id: form.policyId,
      start_date: form.startDate,
      end_date: form.endDate,
      hours: totalHours,
      reason: form.reason || null,
      status: 'pending',
    } as any);
    if (error) {
      toast.error('Failed to submit request');
      return;
    }
    toast.success('PTO request submitted');
    qc.invalidateQueries({ queryKey: ['pto_requests'] });
    qc.invalidateQueries({ queryKey: ['pto_balances'] });
    setOpen(false);
    setForm({ policyId: '', startDate: '', endDate: '', reason: '' });
    setIncludeWeekends(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Time Off" description="View balances and manage PTO requests" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Request Time Off</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New PTO Request</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>PTO Type</Label>
                <Select value={form.policyId} onValueChange={v => setForm(f => ({ ...f, policyId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {policies.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>

              {/* Auto-calculated hours */}
              <div>
                <Label>Hours</Label>
                <Input type="number" value={totalHours} readOnly className="bg-muted" />
                {form.startDate && form.endDate && totalHours > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {weekdays} weekday{weekdays !== 1 ? 's' : ''} × 8 hrs
                    {includeWeekends && weekendDays > 0 && ` + ${weekendDays} weekend day${weekendDays !== 1 ? 's' : ''} × 8 hrs`}
                  </p>
                )}
              </div>

              {/* Weekend checkbox — only shown when range includes weekends */}
              {hasWeekendDays && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-weekends"
                    checked={includeWeekends}
                    onCheckedChange={(checked) => setIncludeWeekends(checked === true)}
                  />
                  <Label htmlFor="include-weekends" className="text-sm font-normal cursor-pointer">
                    Include weekend days ({weekendDays} day{weekendDays !== 1 ? 's' : ''}, {weekendDays * 8} hrs)
                  </Label>
                </div>
              )}

              <div>
                <Label>Reason (optional)</Label>
                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2} />
              </div>
              <Button onClick={handleSubmit} className="w-full">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balances.map((b: PTOBalance) => (
          <Card key={b.policy.id} className="animate-in-up">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{b.policy.name}</p>
                  <p className="text-lg font-semibold">{hoursToDays(b.available)} days</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Accrued: {hoursToDays(b.accrued)}d</span>
                <span>Used: {hoursToDays(b.used)}d</span>
                <span>Pending: {hoursToDays(b.pending)}d</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {balances.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No PTO policies configured for your company
            </CardContent>
          </Card>
        )}
      </div>

      {/* Requests List */}
      <Card className="animate-in-up stagger-2">
        <CardHeader>
          <CardTitle className="text-sm">Your Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No PTO requests found</p>
          ) : (
            <div className="divide-y">
              {requests.map((r: PTORequest) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{r.pto_policies?.name ?? 'PTO'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')} · {r.hours} hrs
                    </p>
                    {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
                  </div>
                  <Badge variant="outline" className={statusColors[r.status] ?? ''}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
