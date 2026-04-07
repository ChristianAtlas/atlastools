import { useState, useMemo } from 'react';
import { Clock, Save, Send, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { format, startOfWeek, addDays } from 'date-fns';
import { toast } from 'sonner';

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
  const { data: employee, isLoading } = useCurrentEmployee();
  const [entries, setEntries] = useState<DayEntry[]>(buildWeek);

  // Determine if California OT rules apply
  const isCalifornia = useMemo(() => {
    if (!employee) return false;
    const state = employee.state?.trim() ?? '';
    return CA_STATES.some(s => s.toLowerCase() === state.toLowerCase());
  }, [employee]);

  const breakdown = useMemo(() => {
    return isCalifornia ? calcCaliforniaOT(entries) : calcStandardOT(entries);
  }, [entries, isCalifornia]);

  const totalHours = breakdown.regular + breakdown.ot15x + breakdown.ot2x;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = (i: number, field: keyof DayEntry, val: string) => {
    setEntries(prev =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const updated = { ...e, [field]: val };

        if (field === 'hours') {
          const hrs = parseFloat(val);
          if (!isNaN(hrs) && hrs > 0) {
            const startMin = updated.start ? timeToMinutes(updated.start) : 9 * 60;
            updated.start = updated.start || '09:00';
            updated.end = minutesToTime(startMin + Math.round(hrs * 60));
          }
        } else if (field === 'start' || field === 'end') {
          if (updated.start && updated.end) {
            const diff = (timeToMinutes(updated.end) - timeToMinutes(updated.start)) / 60;
            updated.hours = diff > 0 ? String(Math.round(diff * 100) / 100) : '';
          }
        }

        return updated;
      })
    );
  };

  const handleSave = () => toast.success('Timecard saved as draft');
  const handleSubmit = () => toast.success('Timecard submitted for approval');

  return (
    <div className="space-y-6">
      <PageHeader title="Time Card" description="Log your hours for the current pay period" />

      {/* California notice */}
      {isCalifornia && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>California daily overtime rules applied (8 hr / 12 hr thresholds &amp; 7th-day rule)</span>
        </div>
      )}

      {/* Summary */}
      <div className={`grid gap-4 ${isCalifornia ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <Card className="animate-in-up">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-lg font-semibold">{totalHours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-1">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Regular</p>
            <p className="text-lg font-semibold">{breakdown.regular.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-2">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Overtime (1.5×)</p>
            <p className="text-lg font-semibold">{breakdown.ot15x.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        {isCalifornia && (
          <Card className="animate-in-up stagger-3">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Double Time (2×)</p>
              <p className="text-lg font-semibold">{breakdown.ot2x.toFixed(1)} hrs</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timesheet Grid */}
      <Card className="animate-in-up stagger-3">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Weekly Timesheet</CardTitle>
          <Badge variant="outline">
            {format(entries[0].date, 'MMM d')} – {format(entries[6].date, 'MMM d, yyyy')}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium">Day</th>
                  <th className="text-left py-2 px-2 font-medium">Start</th>
                  <th className="text-left py-2 px-2 font-medium">End</th>
                  <th className="text-left py-2 px-2 font-medium">Total Hours</th>
                  {isCalifornia && <th className="text-left py-2 px-2 font-medium">OT Breakdown</th>}
                  <th className="text-left py-2 pl-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const h = parseHours(e.hours);
                  // per-day CA breakdown for display
                  let dayLabel = '';
                  if (isCalifornia && h > 8) {
                    const parts: string[] = [];
                    if (h > 8) parts.push(`${Math.min(h - 8, 4).toFixed(1)}h @1.5×`);
                    if (h > 12) parts.push(`${(h - 12).toFixed(1)}h @2×`);
                    dayLabel = parts.join(', ');
                  }

                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{e.day}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">{format(e.date, 'M/d')}</span>
                      </td>
                      <td className="py-2 px-2">
                        <Input type="time" value={e.start} onChange={ev => update(i, 'start', ev.target.value)} className="h-8 w-[110px] text-xs" />
                      </td>
                      <td className="py-2 px-2">
                        <Input type="time" value={e.end} onChange={ev => update(i, 'end', ev.target.value)} className="h-8 w-[110px] text-xs" />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={e.hours}
                          onChange={ev => update(i, 'hours', ev.target.value)}
                          className="h-8 w-[80px] text-xs"
                        />
                      </td>
                      {isCalifornia && (
                        <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {dayLabel || '—'}
                        </td>
                      )}
                      <td className="py-2 pl-3">
                        <Input value={e.notes} onChange={ev => update(i, 'notes', ev.target.value)} placeholder="—" className="h-8 text-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Week Total: </span>
              <span className="font-semibold">{totalHours.toFixed(1)} hrs</span>
              {(breakdown.ot15x > 0 || breakdown.ot2x > 0) && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({breakdown.regular.toFixed(1)} reg
                  {breakdown.ot15x > 0 && ` + ${breakdown.ot15x.toFixed(1)} @1.5×`}
                  {breakdown.ot2x > 0 && ` + ${breakdown.ot2x.toFixed(1)} @2×`})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave} className="gap-1">
                <Save className="h-3.5 w-3.5" /> Save Draft
              </Button>
              <Button size="sm" onClick={handleSubmit} className="gap-1">
                <Send className="h-3.5 w-3.5" /> Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
