import { useNavigate } from 'react-router-dom';
import { useComplianceTickets, useSyncForm8973Tickets, useSyncLicenseTickets, type TicketSource, type ComplianceTicket } from '@/hooks/useComplianceTickets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, RefreshCw, Ticket as TicketIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  /** Filter to a single ticket source. Omit to show all. */
  source?: TicketSource;
  /** Optional company filter */
  companyId?: string;
  /** Compact inline display (used inside tabs) */
  variant?: 'inline' | 'full';
  /** Header title */
  title?: string;
  /** Show the "Generate Tickets" sync button (only relevant for inline source views) */
  showSync?: boolean;
}

const priorityClass: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  medium: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200',
  low: 'bg-muted text-muted-foreground',
};

const statusClass: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  at_risk: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300',
  non_compliant: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  compliant: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  waived: 'bg-muted text-muted-foreground',
};

export function TicketsList({ source, companyId, variant = 'inline', title, showSync }: Props) {
  const navigate = useNavigate();
  const { data: tickets = [], isLoading } = useComplianceTickets({ source, companyId });
  const sync8973 = useSyncForm8973Tickets();
  const syncLicenses = useSyncLicenseTickets();

  const open = tickets.filter(t => t.status !== 'compliant' && t.status !== 'waived');

  const handleSync = () => {
    if (source === 'form_8973_missing' || source === 'form_8973_unsigned') sync8973.mutate();
    else if (source === 'license_expiring' || source === 'license_expired') syncLicenses.mutate();
    else { sync8973.mutate(); syncLicenses.mutate(); }
  };

  return (
    <Card className={variant === 'inline' ? 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 dark:border-amber-900/40' : ''}>
      <CardContent className={cn('p-4 space-y-3', variant === 'inline' && 'p-3')}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">
              {title ?? 'Open tickets'} {open.length > 0 && <span className="text-muted-foreground font-normal">({open.length})</span>}
            </h4>
          </div>
          {showSync && (
            <Button size="sm" variant="outline" className="h-7" onClick={handleSync} disabled={sync8973.isPending || syncLicenses.isPending}>
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', (sync8973.isPending || syncLicenses.isPending) && 'animate-spin')} />
              Scan for gaps
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : open.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No open tickets. {showSync && 'Click "Scan for gaps" to generate tickets for missing items.'}</p>
        ) : (
          <ul className="divide-y divide-border/60 -mx-1">
            {open.slice(0, variant === 'inline' ? 5 : open.length).map(t => (
              <TicketRow key={t.id} ticket={t} onOpen={() => navigate(`/compliance/tickets/${t.id}`)} />
            ))}
            {variant === 'inline' && open.length > 5 && (
              <li className="pt-2 px-1">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate('/compliance?tab=tickets')}>
                  View all {open.length} tickets <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TicketRow({ ticket, onOpen }: { ticket: ComplianceTicket; onOpen: () => void }) {
  const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date();
  return (
    <li>
      <button
        onClick={onOpen}
        className="w-full flex items-start gap-3 px-1 py-2 text-left hover:bg-muted/50 rounded-md transition-colors group"
      >
        {ticket.priority === 'critical' || isOverdue ? (
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        ) : (
          <TicketIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{ticket.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', priorityClass[ticket.priority])}>
              {ticket.priority}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', statusClass[ticket.status] ?? statusClass.pending)}>
              {ticket.status.replace('_', ' ')}
            </Badge>
            {ticket.due_date && (
              <span className={cn('text-[11px]', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                Due {format(new Date(ticket.due_date), 'MMM d')}
              </span>
            )}
            {ticket.blocker && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Blocker</Badge>}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
      </button>
    </li>
  );
}
