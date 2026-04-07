import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  className?: string;
  delay?: number;
  href?: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon: Icon, className, delay = 0, href }: StatCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md animate-in-up',
        href && 'cursor-pointer',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={href ? () => navigate(href) : undefined}
      role={href ? 'link' : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {change && (
            <p className={cn(
              'text-xs font-medium',
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground',
            )}>
              {change}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
