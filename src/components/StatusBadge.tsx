import { cn } from '@/lib/utils';

type BadgeStatus = 'active' | 'onboarding' | 'suspended' | 'terminated' | 'on_leave'
  | 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed'
  | 'pending' | 'in_progress' | 'overdue'
  | 'sent' | 'paid'
  | 'time_review' | 'editing' | 'preview'
  | 'pending_client_approval' | 'client_approved'
  | 'funding' | 'pending_admin_approval' | 'admin_approved'
  | 'submitting' | 'submitted' | 'voided' | 'reversed';

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
  time_review: { label: 'Time Review', className: 'bg-info/10 text-info' },
  editing: { label: 'Editing', className: 'bg-info/10 text-info' },
  preview: { label: 'Preview', className: 'bg-info/10 text-info' },
  pending_client_approval: { label: 'Pending Client', className: 'bg-warning/10 text-warning' },
  client_approved: { label: 'Client Approved', className: 'bg-success/10 text-success' },
  funding: { label: 'Funding', className: 'bg-info/10 text-info' },
  pending_admin_approval: { label: 'Pending Admin', className: 'bg-warning/10 text-warning' },
  admin_approved: { label: 'Admin Approved', className: 'bg-success/10 text-success' },
  submitting: { label: 'Submitting', className: 'bg-info/10 text-info' },
  submitted: { label: 'Submitted', className: 'bg-success/10 text-success' },
  voided: { label: 'Voided', className: 'bg-destructive/10 text-destructive' },
  reversed: { label: 'Reversed', className: 'bg-destructive/10 text-destructive' },
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
