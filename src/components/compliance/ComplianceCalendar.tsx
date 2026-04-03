import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, List, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ComplianceItem } from '@/hooks/useCompliance';
import type { ComplianceLicense } from '@/hooks/useCompliance';

interface Props {
  items: ComplianceItem[];
  licenses: ComplianceLicense[];
}

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'item' | 'license';
  status: string;
  entityType: string;
};

export function ComplianceCalendar({ items, licenses }: Props) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entityFilter, setEntityFilter] = useState('all');

  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];
    items.forEach(item => {
      if (item.due_date) {
        evts.push({ id: item.id, title: item.title, date: new Date(item.due_date), type: 'item', status: item.status, entityType: item.entity_type });
      }
    });
    licenses.forEach(lic => {
      if (lic.expiration_date) {
        evts.push({ id: lic.id, title: `${lic.license_type.replace(/_/g, ' ')} — ${lic.state_code || 'N/A'}`, date: new Date(lic.expiration_date), type: 'license', status: lic.status, entityType: lic.entity_type });
      }
    });
    return evts.filter(e => entityFilter === 'all' || e.entityType === entityFilter).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [items, licenses, entityFilter]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const upcomingEvents = events.filter(e => e.date >= new Date()).slice(0, 20);

  const statusIcon = (status: string) => {
    if (status === 'compliant' || status === 'active') return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
    if (status === 'at_risk' || status === 'expiring') return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    if (status === 'non_compliant' || status === 'expired') return <AlertTriangle className="h-3 w-3 text-red-500" />;
    return <Clock className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className={cn(viewMode === 'list' && 'bg-muted')} onClick={() => setViewMode('list')}>
            <List className="h-3.5 w-3.5 mr-1" /> List
          </Button>
          <Button variant="outline" size="sm" className={cn(viewMode === 'calendar' && 'bg-muted')} onClick={() => setViewMode('calendar')}>
            <Calendar className="h-3.5 w-3.5 mr-1" /> Calendar
          </Button>
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="enterprise">AtlasOne</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="employee">Employees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === 'calendar' ? (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-px">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="p-2" />)}
            {monthDays.map(day => {
              const dayEvents = events.filter(e => isSameDay(e.date, day));
              return (
                <div key={day.toISOString()} className={cn(
                  'p-1.5 min-h-[60px] border rounded text-xs',
                  isToday(day) && 'bg-primary/5 border-primary/30',
                  !isSameMonth(day, currentMonth) && 'opacity-50'
                )}>
                  <span className={cn('font-medium', isToday(day) && 'text-primary')}>{format(day, 'd')}</span>
                  {dayEvents.slice(0, 2).map(evt => (
                    <div key={evt.id} className="mt-0.5 truncate text-[10px] text-muted-foreground flex items-center gap-0.5">
                      {statusIcon(evt.status)}
                      <span className="truncate">{evt.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && <p className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</p>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No upcoming deadlines</div>
          ) : upcomingEvents.map(evt => (
            <div key={evt.id} className="flex items-center gap-3 rounded-lg border p-3 bg-card">
              {statusIcon(evt.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{evt.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{evt.entityType} · {evt.type}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{format(evt.date, 'MMM d, yyyy')}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
