import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogIn, LogOut, Coffee, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import {
  useTodayPunches, useCreatePunch, deriveClockState, sumTodayHours,
  type ClockState, type TKSettings,
} from '@/hooks/useTimekeeping';

const STATE_META: Record<ClockState, { label: string; tone: string }> = {
  clocked_out: { label: 'Clocked Out', tone: 'bg-muted text-muted-foreground' },
  clocked_in:  { label: 'On the Clock', tone: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  on_meal:     { label: 'On Meal Break', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  on_break:    { label: 'On Rest Break', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
};

interface Props {
  companyId: string;
  employeeId: string;
  settings?: TKSettings | null;
}

export function ClockCard({ companyId, employeeId, settings }: Props) {
  const { data: punches = [], isLoading } = useTodayPunches(employeeId);
  const createPunch = useCreatePunch();
  const [now, setNow] = useState(Date.now());

  // Tick every second so the live counter updates while clocked in
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const state = deriveClockState(punches);
  const meta = STATE_META[state];
  // recompute hours; reading `now` keeps the value live
  void now;
  const hoursToday = sumTodayHours(punches);

  const handlePunch = async (type: Parameters<typeof createPunch.mutate>[0]['punch_type']) => {
    let geo: { lat?: number; lng?: number } = {};
    if (settings?.require_geolocation && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        toast.error('Location is required to punch. Please enable location access.');
        return;
      }
    }
    createPunch.mutate(
      { company_id: companyId, employee_id: employeeId, punch_type: type, geo_lat: geo.lat ?? null, geo_lng: geo.lng ?? null },
      {
        onSuccess: () => toast.success(actionLabel(type)),
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  const canClockIn = state === 'clocked_out';
  const canClockOut = state === 'clocked_in';
  const canStartMeal = state === 'clocked_in';
  const canEndMeal = state === 'on_meal';
  const canStartBreak = state === 'clocked_in' && settings?.rest_breaks_enabled;
  const canEndBreak = state === 'on_break';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={meta.tone + ' border-transparent'}>{meta.label}</Badge>
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-3xl font-semibold tabular-nums">
              {hoursToday.toFixed(2)} <span className="text-base font-normal text-muted-foreground">hrs today</span>
            </p>
          </div>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            size="lg"
            disabled={!canClockIn || createPunch.isPending}
            onClick={() => handlePunch('clock_in')}
            className="gap-1.5"
          >
            <LogIn className="h-4 w-4" /> Clock In
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!canClockOut || createPunch.isPending}
            onClick={() => handlePunch('clock_out')}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" /> Clock Out
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!(canStartMeal || canEndMeal) || createPunch.isPending}
            onClick={() => handlePunch(canEndMeal ? 'meal_end' : 'meal_start')}
            className="gap-1.5"
          >
            {canEndMeal ? <Play className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
            {canEndMeal ? 'End Meal' : 'Start Meal'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!(canStartBreak || canEndBreak) || createPunch.isPending}
            onClick={() => handlePunch(canEndBreak ? 'break_end' : 'break_start')}
            className="gap-1.5"
          >
            <Pause className="h-4 w-4" />
            {canEndBreak ? 'End Break' : 'Start Break'}
          </Button>
        </div>

        {punches.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Today's punches</p>
            <div className="flex flex-wrap gap-1.5">
              {punches.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                  <span className="text-muted-foreground capitalize">{p.punch_type.replace('_', ' ')}</span>
                  <span className="font-medium">{new Date(p.punched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function actionLabel(t: string) {
  const map: Record<string, string> = {
    clock_in: 'Clocked in',
    clock_out: 'Clocked out',
    meal_start: 'Meal break started',
    meal_end: 'Meal break ended',
    break_start: 'Rest break started',
    break_end: 'Rest break ended',
  };
  return map[t] ?? 'Punch recorded';
}