import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DeadlineCountdownProps {
  deadline: string; // ISO date string
  label?: string;
  warningHours?: number; // Hours before deadline to show warning (default 24)
  criticalHours?: number; // Hours before deadline to show critical (default 4)
  className?: string;
}

function getTimeRemaining(deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, totalHours: 0 };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const totalHours = diff / (1000 * 60 * 60);

  return { expired: false, days, hours, minutes, totalHours };
}

export function DeadlineCountdown({
  deadline,
  label = 'Deadline',
  warningHours = 24,
  criticalHours = 4,
  className,
}: DeadlineCountdownProps) {
  const [remaining, setRemaining] = useState(() => getTimeRemaining(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(deadline));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [deadline]);

  const severity = remaining.expired
    ? 'expired'
    : remaining.totalHours <= criticalHours
    ? 'critical'
    : remaining.totalHours <= warningHours
    ? 'warning'
    : 'normal';

  const styles = {
    expired: 'bg-destructive/10 border-destructive/30 text-destructive',
    critical: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    normal: 'bg-muted border-border text-muted-foreground',
  };

  const IconComp = remaining.expired
    ? AlertTriangle
    : severity === 'critical'
    ? AlertTriangle
    : severity === 'warning'
    ? Clock
    : CheckCircle2;

  const formatTime = () => {
    if (remaining.expired) return 'Overdue';
    const parts: string[] = [];
    if (remaining.days > 0) parts.push(`${remaining.days}d`);
    if (remaining.hours > 0) parts.push(`${remaining.hours}h`);
    if (remaining.days === 0) parts.push(`${remaining.minutes}m`);
    return parts.join(' ');
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium', styles[severity], className)}>
      <IconComp className={cn('h-3.5 w-3.5', severity === 'critical' && 'animate-pulse')} />
      <span>{label}:</span>
      <span className="tabular-nums font-semibold">{formatTime()}</span>
    </div>
  );
}
