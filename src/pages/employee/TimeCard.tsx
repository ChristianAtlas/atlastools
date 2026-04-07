import { useState } from 'react';
import { Clock, Save, Send, Loader2 } from 'lucide-react';
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

function calcHoursFromTimes(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = (timeToMinutes(end) - timeToMinutes(start)) / 60;
  return Math.max(0, Math.round(diff * 100) / 100);
}

export default function TimeCard() {
  const { data: employee, isLoading } = useCurrentEmployee();
  const [entries, setEntries] = useState<DayEntry[]>(buildWeek);

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
          // User typed total hours → auto-fill start/end from 9 AM
          const hrs = parseFloat(val);
          if (!isNaN(hrs) && hrs > 0) {
            const startMin = updated.start ? timeToMinutes(updated.start) : 9 * 60;
            updated.start = updated.start || '09:00';
            updated.end = minutesToTime(startMin + Math.round(hrs * 60));
          }
        } else if (field === 'start' || field === 'end') {
          // User changed a time → recalc hours
          const h = calcHoursFromTimes(
            field === 'start' ? val : updated.start,
            field === 'end' ? val : updated.end
          );
          updated.hours = h > 0 ? String(h) : '';
        }

        return updated;
      })
    );
  };

  const totalHours = entries.reduce((s, e) => {
    const h = parseFloat(e.hours);
    return s + (isNaN(h) ? 0 : h);
  }, 0);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(0, totalHours - 40);

  const handleSave = () => toast.success('Timecard saved as draft');
  const handleSubmit = () => toast.success('Timecard submitted for approval');

  return (
    <div className="space-y-6">
      <PageHeader title="Time Card" description="Log your hours for the current pay period" />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
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
            <p className="text-lg font-semibold">{regularHours.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-2">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Overtime</p>
            <p className="text-lg font-semibold">{overtimeHours.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
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
                  <th className="text-left py-2 pl-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
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
                    <td className="py-2 pl-3">
                      <Input value={e.notes} onChange={ev => update(i, 'notes', ev.target.value)} placeholder="—" className="h-8 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Week Total: </span>
              <span className="font-semibold">{totalHours.toFixed(1)} hrs</span>
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
