import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, MessageSquare, Shield, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ApprovalAction {
  id: string;
  label: string;
  variant: 'approve' | 'reject' | 'escalate' | 'request_changes';
  icon?: typeof Check;
  requiresComment?: boolean;
}

interface ApprovalPanelProps {
  title?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'changes_requested';
  approver?: string;
  approvedAt?: string;
  actions?: ApprovalAction[];
  onAction?: (actionId: string, comment: string) => void;
  deadline?: string;
  canAct?: boolean;
  className?: string;
}

const defaultActions: ApprovalAction[] = [
  { id: 'approve', label: 'Approve', variant: 'approve', icon: Check },
  { id: 'request_changes', label: 'Request Changes', variant: 'request_changes', icon: MessageSquare, requiresComment: true },
  { id: 'reject', label: 'Reject', variant: 'reject', icon: X, requiresComment: true },
];

const statusStyles: Record<string, { bg: string; text: string; icon: typeof Check; label: string }> = {
  pending: { bg: 'bg-warning/10', text: 'text-warning', icon: Clock, label: 'Pending Approval' },
  approved: { bg: 'bg-success/10', text: 'text-success', icon: Check, label: 'Approved' },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive', icon: X, label: 'Rejected' },
  escalated: { bg: 'bg-info/10', text: 'text-info', icon: Shield, label: 'Escalated' },
  changes_requested: { bg: 'bg-warning/10', text: 'text-warning', icon: AlertTriangle, label: 'Changes Requested' },
};

const actionButtonStyles: Record<string, string> = {
  approve: 'bg-success text-success-foreground hover:bg-success/90',
  reject: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  escalate: 'bg-info text-info-foreground hover:bg-info/90',
  request_changes: 'bg-warning text-warning-foreground hover:bg-warning/90',
};

export function ApprovalPanel({
  title = 'Approval Required',
  description,
  status,
  approver,
  approvedAt,
  actions = defaultActions,
  onAction,
  deadline,
  canAct = true,
  className,
}: ApprovalPanelProps) {
  const [comment, setComment] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const statusStyle = statusStyles[status] || statusStyles.pending;
  const StatusIcon = statusStyle.icon;

  const handleAction = (action: ApprovalAction) => {
    if (action.requiresComment && !activeAction) {
      setActiveAction(action.id);
      return;
    }
    onAction?.(action.id, comment);
    setComment('');
    setActiveAction(null);
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Status header */}
      <div className={cn('px-4 py-2.5 flex items-center justify-between', statusStyle.bg)}>
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('h-4 w-4', statusStyle.text)} />
          <span className={cn('text-sm font-medium', statusStyle.text)}>{statusStyle.label}</span>
        </div>
        {deadline && status === 'pending' && (
          <span className="text-[11px] text-muted-foreground">Due {deadline}</span>
        )}
      </div>

      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Resolved info */}
        {status !== 'pending' && approver && (
          <div className="text-sm text-muted-foreground">
            {statusStyle.label} by <span className="font-medium text-foreground">{approver}</span>
            {approvedAt && <span className="ml-1">on {new Date(approvedAt).toLocaleDateString()}</span>}
          </div>
        )}

        {/* Comment area for actions requiring it */}
        {activeAction && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment explaining your decision..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              className="text-sm"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className={cn('h-8 text-xs', actionButtonStyles[actions.find(a => a.id === activeAction)?.variant || 'approve'])}
                onClick={() => {
                  const action = actions.find(a => a.id === activeAction);
                  if (action) {
                    onAction?.(action.id, comment);
                    setComment('');
                    setActiveAction(null);
                  }
                }}
                disabled={!comment.trim()}
              >
                Confirm
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setActiveAction(null); setComment(''); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {status === 'pending' && canAct && !activeAction && (
          <div className="flex items-center gap-2 pt-1">
            {actions.map(action => {
              const Icon = action.icon || Check;
              return (
                <Button
                  key={action.id}
                  size="sm"
                  className={cn('h-8 text-xs gap-1.5', actionButtonStyles[action.variant])}
                  onClick={() => handleAction(action)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
