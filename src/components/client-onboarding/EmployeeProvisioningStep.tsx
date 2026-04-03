import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, RefreshCw, CheckCircle2, Clock, AlertCircle, Users, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeInvitations, useSendInvitation, useSendAllInvitations } from '@/hooks/useEmployeeProvisioning';

interface Props {
  companyId: string;
  onDone: () => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-muted text-muted-foreground' },
  invited: { label: 'Invited', icon: Mail, className: 'bg-info/10 text-info' },
  activated: { label: 'Activated', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'bg-destructive/10 text-destructive' },
};

export function EmployeeProvisioningStep({ companyId, onDone }: Props) {
  const { toast } = useToast();
  const { data: invitations = [], isLoading } = useEmployeeInvitations(companyId);
  const sendInvitation = useSendInvitation();
  const sendAll = useSendAllInvitations();
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  const pendingCount = invitations.filter(i => i.status === 'pending').length;
  const invitedCount = invitations.filter(i => i.status === 'invited').length;
  const activatedCount = invitations.filter(i => i.status === 'activated').length;
  const failedCount = invitations.filter(i => i.status === 'failed').length;

  const handleSendOne = async (invitationId: string) => {
    setSendingIds(prev => new Set(prev).add(invitationId));
    try {
      await sendInvitation.mutateAsync({ invitationId });
      toast({ title: 'Invitation sent' });
    } catch (err: any) {
      toast({ title: 'Failed to send', description: err.message, variant: 'destructive' });
    } finally {
      setSendingIds(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleSendAll = async () => {
    try {
      await sendAll.mutateAsync({ companyId });
      toast({ title: 'All invitations sent', description: `Sent to ${pendingCount + failedCount} employees.` });
    } catch (err: any) {
      toast({ title: 'Failed to send invitations', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading invitations...</div>;
  }

  if (invitations.length === 0) {
    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No employees to provision</p>
            <p className="text-xs text-muted-foreground mt-1">This client was launched with 0 employees.</p>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{invitations.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-info">{invitedCount}</p>
            <p className="text-xs text-muted-foreground">Invited</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-success">{activatedCount}</p>
            <p className="text-xs text-muted-foreground">Activated</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />Employee Account Provisioning
            </CardTitle>
            {(pendingCount > 0 || failedCount > 0) && (
              <Button
                size="sm"
                onClick={handleSendAll}
                disabled={sendAll.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {sendAll.isPending ? 'Sending...' : `Send All Invitations (${pendingCount + failedCount})`}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create user accounts and send email invitations to employees. They'll be prompted to set up their profile, direct deposit, and tax forms.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Invited</TableHead>
                  <TableHead className="text-xs w-28">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const config = statusConfig[inv.status] || statusConfig.pending;
                  const Icon = config.icon;
                  const isSending = sendingIds.has(inv.id);

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm font-medium">{inv.full_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
                          <Icon className="h-2.5 w-2.5" />
                          {config.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.invited_at
                          ? new Date(inv.invited_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {(inv.status === 'pending' || inv.status === 'failed') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={isSending}
                            onClick={() => handleSendOne(inv.id)}
                          >
                            {isSending ? (
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            {inv.status === 'failed' ? 'Retry' : 'Send'}
                          </Button>
                        )}
                        {inv.status === 'invited' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={isSending}
                            onClick={() => handleSendOne(inv.id)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />Resend
                          </Button>
                        )}
                        {inv.status === 'activated' && (
                          <span className="text-xs text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />Active
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {failedCount > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-destructive font-medium">{failedCount} invitation(s) failed</p>
              {invitations.filter(i => i.status === 'failed' && i.error_message).map(i => (
                <p key={i.id} className="text-xs text-destructive/70 mt-1">• {i.full_name}: {i.error_message}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onDone}>
          {activatedCount === invitations.length ? 'All Done!' : 'Continue to Dashboard'}
        </Button>
      </div>
    </div>
  );
}
