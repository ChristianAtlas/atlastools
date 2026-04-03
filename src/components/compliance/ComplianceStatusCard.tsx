import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface ComplianceStatusCardProps {
  title: string;
  count: number;
  total?: number;
  variant: 'compliant' | 'at_risk' | 'non_compliant' | 'pending' | 'expired';
  subtitle?: string;
  onClick?: () => void;
}

const config = {
  compliant: { icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', iconColor: 'text-emerald-500' },
  at_risk: { icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', iconColor: 'text-amber-500' },
  non_compliant: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', iconColor: 'text-red-500' },
  pending: { icon: Clock, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', iconColor: 'text-blue-500' },
  expired: { icon: XCircle, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', iconColor: 'text-red-500' },
};

export function ComplianceStatusCard({ title, count, total, variant, subtitle, onClick }: ComplianceStatusCardProps) {
  const c = config[variant];
  const Icon = c.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all hover:shadow-md',
        c.bg, c.border,
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex w-full items-center justify-between">
        <Icon className={cn('h-5 w-5', c.iconColor)} />
        {total !== undefined && (
          <span className="text-xs text-muted-foreground">{count}/{total}</span>
        )}
      </div>
      <div>
        <p className={cn('text-2xl font-bold', c.text)}>{count}</p>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </button>
  );
}
