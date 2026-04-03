import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { useComplianceAlerts, useAcknowledgeAlert, type ComplianceAlert } from '@/hooks/useCompliance';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const severityConfig: Record<string, { icon: React.ElementType; className: string }> = {
  critical: { icon: XCircle, className: 'text-red-500' },
  high: { icon: AlertTriangle, className: 'text-amber-500' },
  medium: { icon: Clock, className: 'text-blue-500' },
  low: { icon: Bell, className: 'text-muted-foreground' },
};

export function AlertsFeed() {
  const { data: alerts = [], isLoading } = useComplianceAlerts();
  const ack = useAcknowledgeAlert();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading alerts…</div>;

  const unread = alerts.filter(a => !a.is_read);
  const read = alerts.filter(a => a.is_read);

  return (
    <div className="space-y-4">
      {unread.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Unread ({unread.length})</h3>
          <div className="space-y-2">
            {unread.map(alert => <AlertCard key={alert.id} alert={alert} onAck={() => ack.mutate(alert.id)} />)}
          </div>
        </div>
      )}
      {read.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Previous</h3>
          <div className="space-y-2">
            {read.slice(0, 10).map(alert => <AlertCard key={alert.id} alert={alert} />)}
          </div>
        </div>
      )}
      {alerts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm">No compliance alerts</p>
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onAck }: { alert: ComplianceAlert; onAck?: () => void }) {
  const sev = severityConfig[alert.severity] || severityConfig.medium;
  const Icon = sev.icon;

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border p-3 transition-colors',
      !alert.is_read && 'bg-muted/50 border-primary/20'
    )}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', sev.className)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{alert.title}</p>
          <Badge variant="outline" className="text-[10px]">{alert.alert_type.replace(/_/g, ' ')}</Badge>
        </div>
        {alert.message && <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
        </p>
      </div>
      {onAck && (
        <Button variant="ghost" size="sm" className="h-7 shrink-0" onClick={onAck}>
          <Eye className="h-3.5 w-3.5 mr-1" /> Ack
        </Button>
      )}
    </div>
  );
}
