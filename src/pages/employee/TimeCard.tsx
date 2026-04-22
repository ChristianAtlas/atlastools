import { useMemo } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useTKSettings, useCurrentTKPeriod, useEmployeeCurrentTimecard,
  useUpsertTimecard, useSubmitTimecard, useTodayPunches, sumTodayHours,
} from '@/hooks/useTimekeeping';
import { ClockCard } from '@/components/timekeeping/ClockCard';
import { TimekeepingDisabledNotice } from '@/components/timekeeping/TimekeepingDisabledNotice';

interface DayEntry {
  day: string;
  date: Date;
  start: string;
  end: string;
  hours: string;
  notes: string;
}

interface OvertimeBreakdown {
  regular: number;
  ot15x: number;
  ot2x: number;
}

const CA_STATES = ['CA', 'California'];

function buildWeek(): DayEntry[] {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const isWeekend = i >= 5;
    return {
      day: format(d, 'EEE'),
      date: d,
      start: isWeekend ? '' : '09:00',
      end: isWeekend ? '' : '17:00',
      hours: isWeekend ? '' : '8',
      notes: '',
    };
  });
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseHours(val: string): number {
  const h = parseFloat(val);
  return isNaN(h) ? 0 : Math.max(0, h);
}

/** Standard (federal) OT: everything over 40/week is 1.5x */
function calcStandardOT(entries: DayEntry[]): OvertimeBreakdown {
  const total = entries.reduce((s, e) => s + parseHours(e.hours), 0);
  const regular = Math.min(total, 40);
  const ot15x = Math.max(0, total - 40);
  return { regular, ot15x, ot2x: 0 };
}

/** California OT: daily thresholds + 7th consecutive day rule + weekly 40hr rule */
function calcCaliforniaOT(entries: DayEntry[]): OvertimeBreakdown {
  let regular = 0;
  let ot15x = 0;
  let ot2x = 0;
  let consecutiveDays = 0;

  for (let i = 0; i < entries.length; i++) {
    const h = parseHours(entries[i].hours);
    if (h > 0) {
      consecutiveDays++;
    } else {
      consecutiveDays = 0;
      continue;
    }

    const isSeventhDay = consecutiveDays >= 7;

    if (isSeventhDay) {
      // 7th consecutive day: first 8 hrs at 1.5x, over 8 at 2x
      const first8 = Math.min(h, 8);
      const over8 = Math.max(0, h - 8);
      ot15x += first8;
      ot2x += over8;
    } else {
      // Normal day: first 8 regular, 8-12 at 1.5x, over 12 at 2x
      const reg = Math.min(h, 8);
      const overtime15 = Math.min(Math.max(0, h - 8), 4); // hours 8–12
      const overtime2 = Math.max(0, h - 12); // hours 12+
      regular += reg;
      ot15x += overtime15;
      ot2x += overtime2;
    }
  }

  // Weekly 40-hour rule: if weekly regular hours exceed 40,
  // the excess becomes 1.5x (but don't double-count daily OT already captured)
  if (regular > 40) {
    ot15x += regular - 40;
    regular = 40;
  }

  return { regular, ot15x, ot2x };
}

export default function TimeCard() {
  const { data: employee, isLoading: empLoading } = useCurrentEmployee();
  const companyId = (employee as any)?.company_id as string | undefined;
  const employeeId = (employee as any)?.id as string | undefined;

  const { data: settings, isLoading: setLoading } = useTKSettings(companyId);
  const { data: period } = useCurrentTKPeriod(companyId);
  const { data: timecard } = useEmployeeCurrentTimecard(employeeId, period?.id);
  const { data: punches = [] } = useTodayPunches(employeeId);
  const upsert = useUpsertTimecard();
  const submit = useSubmitTimecard();

  const hoursToday = useMemo(() => sumTodayHours(punches), [punches]);

  if (empLoading || setLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings?.is_enabled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Time Card" description="Track your time and submit for approval" />
        <TimekeepingDisabledNotice context="employee" />
      </div>
    );
  }

  const handleSubmitTC = async () => {
    if (!companyId || !employeeId || !period) return;
    try {
      let tcId = timecard?.id;
      if (!tcId) {
        const created = await upsert.mutateAsync({
          company_id: companyId, employee_id: employeeId, payroll_period_id: period.id,
          regular_hours: hoursToday, total_hours: hoursToday,
        } as any);
        tcId = (created as any).id;
      } else {
        await upsert.mutateAsync({
          id: tcId, company_id: companyId, employee_id: employeeId, payroll_period_id: period.id,
          regular_hours: hoursToday, total_hours: hoursToday,
        } as any);
      }
      await submit.mutateAsync(tcId!);
      toast.success('Timecard submitted for approval');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Time Card" description="Clock in/out, track breaks, and submit your pay-period timecard" />

      {companyId && employeeId && (
        <ClockCard companyId={companyId} employeeId={employeeId} settings={settings} />
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Current Pay Period</CardTitle>
          {period && (
            <Badge variant="outline">
              {format(new Date(period.period_start), 'MMM d')} – {format(new Date(period.period_end), 'MMM d, yyyy')}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!period ? (
            <p className="text-sm text-muted-foreground">No active pay period found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Hours today" value={hoursToday.toFixed(2)} />
                <Stat label="Period hours" value={(timecard?.total_hours ?? 0).toFixed(2)} />
                <Stat label="Pay date" value={format(new Date(period.pay_date), 'MMM d')} />
                <Stat label="Status" value={timecard?.status ?? 'open'} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={handleSubmitTC}
                  disabled={submit.isPending || upsert.isPending || timecard?.status === 'submitted' || timecard?.status === 'approved' || timecard?.status === 'locked'}
                  className="gap-1.5"
                >
                  {(submit.isPending || upsert.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {timecard?.status === 'submitted' ? 'Submitted' : timecard?.status === 'approved' ? 'Approved' : 'Submit Timecard'}
                </Button>
              </div>
              {timecard?.rejection_reason && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Returned by manager</p>
                  <p className="text-muted-foreground mt-1">{timecard.rejection_reason}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums capitalize">{value}</p>
    </div>
  );
}
