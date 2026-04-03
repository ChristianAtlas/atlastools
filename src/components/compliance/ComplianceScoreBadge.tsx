import { cn } from '@/lib/utils';

interface ComplianceScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ComplianceScoreBadge({ score, size = 'md', showLabel = true, className }: ComplianceScoreBadgeProps) {
  const color = score >= 90 ? 'text-emerald-600 dark:text-emerald-400' 
    : score >= 70 ? 'text-amber-600 dark:text-amber-400' 
    : 'text-red-600 dark:text-red-400';
  
  const bgColor = score >= 90 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
    : score >= 70 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';

  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Needs Attention' : 'At Risk';

  return (
    <div className={cn('inline-flex flex-col items-center gap-1 rounded-xl border px-4 py-3', bgColor, className)}>
      <span className={cn('font-bold tabular-nums', sizes[size], color)}>{score}%</span>
      {showLabel && <span className={cn('text-xs font-medium', color)}>{label}</span>}
    </div>
  );
}
