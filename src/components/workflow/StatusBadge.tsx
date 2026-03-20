import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Extended status type covering all workflow states
export type WorkflowStatus =
  | 'active' | 'onboarding' | 'suspended' | 'terminated' | 'on_leave'
  | 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed'
  | 'pending' | 'in_progress' | 'overdue'
  | 'sent' | 'paid'
  | 'not_started' | 'cancelled' | 'escalated' | 'changes_requested' | 'rejected'
  | 'blocked' | 'skipped' | 'expired' | 'resolved' | 'voided' | 'reversed';

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
  not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
  escalated: { label: 'Escalated', className: 'bg-warning/10 text-warning' },
  changes_requested: { label: 'Changes Requested', className: 'bg-warning/10 text-warning' },
  rejected: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
  blocked: { label: 'Blocked', className: 'bg-destructive/10 text-destructive' },
  skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground' },
  expired: { label: 'Expired', className: 'bg-destructive/10 text-destructive' },
  resolved: { label: 'Resolved', className: 'bg-success/10 text-success' },
  voided: { label: 'Voided', className: 'bg-muted text-muted-foreground' },
  reversed: { label: 'Reversed', className: 'bg-warning/10 text-warning' },
};

interface StatusBadgeProps {
  status: WorkflowStatus | string;
  icon?: LucideIcon;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, icon: Icon, pulse, size = 'md', className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), className: 'bg-muted text-muted-foreground' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        config.className,
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', config.className.includes('text-success') ? 'bg-success' : config.className.includes('text-destructive') ? 'bg-destructive' : config.className.includes('text-warning') ? 'bg-warning' : config.className.includes('text-info') ? 'bg-info' : 'bg-muted-foreground')} />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', config.className.includes('text-success') ? 'bg-success' : config.className.includes('text-destructive') ? 'bg-destructive' : config.className.includes('text-warning') ? 'bg-warning' : config.className.includes('text-info') ? 'bg-info' : 'bg-muted-foreground')} />
        </span>
      )}
      {Icon && <Icon className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />}
      {config.label}
    </span>
  );
}
