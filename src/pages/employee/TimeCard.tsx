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
