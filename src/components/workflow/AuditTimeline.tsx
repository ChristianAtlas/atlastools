import { cn } from '@/lib/utils';
import { Check, Edit, Trash2, Upload, Eye, UserPlus, DollarSign, ShieldCheck, FileText, type LucideIcon } from 'lucide-react';

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  actorRole?: string;
  entity: string;
  entityId?: string;
  details?: string;
  timestamp: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  maxItems?: number;
  className?: string;
}

const actionIcons: Record<string, { icon: LucideIcon; color: string }> = {
  created: { icon: UserPlus, color: 'text-success bg-success/10 border-success/30' },
  updated: { icon: Edit, color: 'text-info bg-info/10 border-info/30' },
  deleted: { icon: Trash2, color: 'text-destructive bg-destructive/10 border-destructive/30' },
  approved: { icon: Check, color: 'text-success bg-success/10 border-success/30' },
  rejected: { icon: ShieldCheck, color: 'text-destructive bg-destructive/10 border-destructive/30' },
  uploaded: { icon: Upload, color: 'text-info bg-info/10 border-info/30' },
  viewed: { icon: Eye, color: 'text-muted-foreground bg-muted border-muted-foreground/20' },
  submitted: { icon: FileText, color: 'text-primary bg-primary/10 border-primary/30' },
  payment: { icon: DollarSign, color: 'text-success bg-success/10 border-success/30' },
};

function getActionMeta(action: string) {
  const key = action.toLowerCase();
  return actionIcons[key] || { icon: Edit, color: 'text-muted-foreground bg-muted border-muted-foreground/20' };
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AuditTimeline({ entries, maxItems, className }: AuditTimelineProps) {
  const visible = maxItems ? entries.slice(0, maxItems) : entries;

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-[13px] top-3 bottom-3 w-px bg-border" />

      <div className="space-y-0">
        {visible.map((entry, i) => {
          const meta = getActionMeta(entry.action);
          const Icon = meta.icon;

          return (
            <div key={entry.id} className={cn('relative flex items-start gap-3 py-2.5 pl-0', i === 0 && 'pt-0')}>
              {/* Dot */}
              <div className={cn('relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border', meta.color)}>
                <Icon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm leading-snug">
                  <span className="font-medium">{entry.actor}</span>
                  {entry.actorRole && (
                    <span className="text-[10px] ml-1 text-muted-foreground font-medium uppercase tracking-wider">{entry.actorRole}</span>
                  )}
                  <span className="text-muted-foreground"> {entry.action.toLowerCase()} </span>
                  <span className="font-medium">{entry.entity}</span>
                </p>
                {entry.details && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.details}</p>
                )}
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 tabular-nums">{formatTimestamp(entry.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {maxItems && entries.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          + {entries.length - maxItems} more entries
        </p>
      )}
    </div>
  );
}
