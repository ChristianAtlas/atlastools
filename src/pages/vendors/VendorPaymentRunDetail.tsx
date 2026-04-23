import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useVendorPaymentRun,
  useVendorPayments,
  useUpdateVendorPaymentRunStatus,
  type VendorPaymentRunStatus,
} from '@/hooks/useVendors';
import { AddVendorPaymentDialog } from '@/components/vendors/AddVendorPaymentDialog';
import { VendorPaymentsList } from '@/components/vendors/VendorPaymentsList';

const fmt = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}

const NEXT_STATUS: Record<VendorPaymentRunStatus, { next: VendorPaymentRunStatus; label: string } | null> = {
  draft: { next: 'pending_approval', label: 'Submit for approval' },
  pending_approval: { next: 'approved', label: 'Approve' },
  approved: { next: 'processing', label: 'Mark processing' },
  processing: { next: 'paid', label: 'Mark paid' },
  paid: null,
  voided: null,
};

export default function VendorPaymentRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: run, isLoading } = useVendorPaymentRun(id);
  const { data: payments } = useVendorPayments(id);
  const updateStatus = useUpdateVendorPaymentRunStatus();

  if (isLoading || !run) return <Skeleton className="h-64 w-full" />;

  const next = NEXT_STATUS[run.status];
  const editable = run.status === 'draft';
  const addedIds = (payments ?? []).map((p) => p.vendor_id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/payments')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to runs
      </Button>

      <PageHeader
        title={`Vendor run · ${run.pay_date}`}
        description={
          run.run_kind === 'ride_along'
            ? 'Ride-along run attached to a payroll cycle.'
            : 'Standalone vendor payment run.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{run.status}</Badge>
            {next && (
              <Button
                size="sm"
                onClick={async () => {
                  await updateStatus.mutateAsync({ id: run.id, status: next.next });
                  toast({ title: `Run ${next.next}` });
                }}
              >
                {next.next === 'paid' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                {next.label}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Vendors" value={String(run.vendor_count)} />
        <StatTile label="Gross total" value={fmt(run.total_amount_cents)} />
        <StatTile label="Backup withholding" value={fmt(run.total_backup_withholding_cents)} />
        <StatTile label="Net total" value={fmt(run.total_amount_cents - run.total_backup_withholding_cents)} />
      </div>

      {payments && payments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Mix:</span>
          <span className="px-2 py-0.5 rounded border border-success text-success">
            IC · {payments.filter((p) => p.vendors?.worker_type === '1099_ic').length}
          </span>
          <span className="px-2 py-0.5 rounded border border-primary text-primary">
            C2C · {payments.filter((p) => p.vendors?.worker_type === 'c2c_vendor').length}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Payments</h2>
        {editable && (
          <AddVendorPaymentDialog runId={run.id} companyId={run.company_id} alreadyAddedVendorIds={addedIds} />
        )}
      </div>

      <VendorPaymentsList runId={run.id} allowDelete={editable} />
    </div>
  );
}