import { useState } from 'react';
import { Loader2, Plus, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { usePTORequests, useUpdatePTORequest, hoursToDays } from '@/hooks/usePTO';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const STATUS_MAP: Record<string, string> = {
  pending: 'pending_approval',
  approved: 'approved',
  denied: 'failed',
  taken: 'completed',
  cancelled: 'terminated',
};

export default function PTO() {
  const [filter, setFilter] = useState<string>('');
  const { data: requests = [], isLoading } = usePTORequests(
    filter ? { status: filter as any } : {}
  );
  const updateRequest = useUpdatePTORequest();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleAction = async (id: string, status: 'approved' | 'denied') => {
    try {
      await updateRequest.mutateAsync({
        id,
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      });
      toast({ title: `Request ${status}` });
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="PTO Management"
        description="Time-off requests and balances"
      />

      <div className="flex items-center gap-3 animate-in-up stagger-1">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm outline-none ring-ring focus:ring-2 transition-shadow"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="taken">Taken</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <p className="text-sm text-muted-foreground ml-auto">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No PTO requests found.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Dates</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Days</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map(req => {
                const empName = req.employees
                  ? `${req.employees.first_name} ${req.employees.last_name}`
                  : '—';
                const companyName = req.employees?.companies?.name ?? '—';
                const policyName = req.pto_policies?.name ?? '—';
                const badgeStatus = STATUS_MAP[req.status] || req.status;

                return (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{empName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{policyName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                      {new Date(req.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {req.start_date !== req.end_date && ` – ${new Date(req.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{hoursToDays(req.hours)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={badgeStatus as any} />
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={updateRequest.isPending}
                            onClick={() => handleAction(req.id, 'approved')}
                          >
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive gap-1"
                            disabled={updateRequest.isPending}
                            onClick={() => handleAction(req.id, 'denied')}
                          >
                            <X className="h-3 w-3" /> Deny
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
