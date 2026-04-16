import { useNavigate, useParams, Link } from 'react-router-dom';
import { useComplianceTicket, useUpdateTicket, useToggleChecklistStep, type TicketMetadata, type ChecklistStep } from '@/hooks/useComplianceTickets';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'non_compliant', label: 'Non-Compliant' },
  { value: 'compliant', label: 'Resolved / Compliant' },
  { value: 'waived', label: 'Waived' },
];

export default function ComplianceTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ticket, isLoading } = useComplianceTicket(id);
  const update = useUpdateTicket();
  const toggleStep = useToggleChecklistStep(id || '');
  const [notes, setNotes] = useState('');

  useEffect(() => { if (ticket?.notes) setNotes(ticket.notes); }, [ticket?.id]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!ticket) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/compliance?tab=tickets')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
        <p className="text-muted-foreground">Ticket not found.</p>
      </div>
    );
  }

  const md = (ticket.metadata || {}) as TicketMetadata;
  const checklist: ChecklistStep[] = md.checklist ?? [];
  const link = md.link;
  const completedSteps = checklist.filter(s => s.done).length;

  const handleResolve = () => {
    update.mutate({ id: ticket.id, status: 'compliant', completed_at: new Date().toISOString() });
  };
  const handleSaveNotes = () => {
    update.mutate({ id: ticket.id, notes });
  };
  const handleStatusChange = (status: string) => {
    update.mutate({ id: ticket.id, status });
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/compliance?tab=tickets')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to tickets
      </Button>

      <PageHeader
        title={ticket.title}
        description={ticket.description ?? undefined}
        actions={
          ticket.status !== 'compliant' && (
            <Button size="sm" onClick={handleResolve} disabled={update.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark resolved
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Checklist {checklist.length > 0 && <span className="text-muted-foreground font-normal">({completedSteps}/{checklist.length})</span>}</CardTitle></CardHeader>
            <CardContent>
              {checklist.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sub-steps defined for this ticket.</p>
              ) : (
                <ul className="space-y-2">
                  {checklist.map(step => (
                    <li key={step.id} className="flex items-start gap-2.5">
                      <Checkbox
                        checked={step.done}
                        onCheckedChange={(v) => toggleStep.mutate({ stepId: step.id, done: !!v })}
                        className="mt-0.5"
                      />
                      <span className={`text-sm ${step.done ? 'line-through text-muted-foreground' : ''}`}>{step.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add resolution notes, blockers, follow-ups…" rows={5} />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={update.isPending || notes === (ticket.notes ?? '')}>Save notes</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Field label="Status">
                <Select value={ticket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Priority"><Badge variant="outline" className="capitalize">{ticket.priority}</Badge></Field>
              <Field label="Category">{ticket.category}{ticket.subcategory ? ` › ${ticket.subcategory}` : ''}</Field>
              <Field label="Entity"><span className="capitalize">{ticket.entity_type}</span></Field>
              {ticket.state_code && <Field label="State">{ticket.state_code}</Field>}
              {ticket.due_date && <Field label="Due date">{format(new Date(ticket.due_date), 'MMM d, yyyy')}</Field>}
              {ticket.blocker && <Field label=""><Badge variant="destructive" className="text-[10px]">Blocks downstream operations</Badge></Field>}
              <Field label="Created">{format(new Date(ticket.created_at), 'MMM d, yyyy')}</Field>
            </CardContent>
          </Card>

          {link && (
            <Card>
              <CardContent className="p-4">
                <Link to={link}>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-1.5" />Open source record
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>}
      <div>{children}</div>
    </div>
  );
}
