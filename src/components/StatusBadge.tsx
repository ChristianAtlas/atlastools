import { cn } from '@/lib/utils';

type BadgeStatus = 'active' | 'onboarding' | 'suspended' | 'terminated' | 'on_leave'
  | 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed'
  | 'pending' | 'in_progress' | 'overdue'
  | 'sent' | 'paid';

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  onboarding: { label: 'Onboarding', className: 'bg-info/10 text-info' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
  terminated: { label: 'Terminated', className: 'bg-muted text-muted-foreground' },
  on_leave: { label: 'On Leave', className: 'bg-warning/10 text-warning' },
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  in_review: { label: 'In Review', className: 'bg-info/10 text-info' },
  pending_approval: { label: 'Pending Approval', className: 'bg-warning/10 text-warning' },
  approved: { label: 'Approved', className: 'bg-success/10 text-success' },
  processing: { label: 'Processing', className: 'bg-info/10 text-info' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning' },
  in_progress: { label: 'In Progress', className: 'bg-info/10 text-info' },
  overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive' },
  sent: { label: 'Sent', className: 'bg-info/10 text-info' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success' },
};

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}
