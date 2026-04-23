import { Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  useVendorPaymentRuns,
  useCreateVendorPaymentRun,
  useVendorPayments,
} from '@/hooks/useVendors';
import { AddVendorPaymentDialog } from './AddVendorPaymentDialog';
import { VendorPaymentsList } from './VendorPaymentsList';

/**
 * Ride-along vendor block embedded inside the existing PayrollDetail editor.
 * Lazily creates a vendor_payment_run linked to the payroll_run_id on first use.
 */
export function RideAlongVendorsTab({
  payrollRunId,
  companyId,
  payDate,
  editable,
}: {
  payrollRunId: string;
  companyId: string;
  payDate: string;
  editable: boolean;
}) {
  const { data: runs, isLoading } = useVendorPaymentRuns({ payrollRunId });
  const create = useCreateVendorPaymentRun();
  const { toast } = useToast();

  const run = runs?.[0];
  const { data: payments } = useVendorPayments(run?.id);
  const addedIds = (payments ?? []).map((p) => p.vendor_id);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (!run) {
    return (
      <Card className="p-8 text-center space-y-3">
        <Link2 className="h-8 w-8 mx-auto text-muted-foreground" />
        <div className="text-sm text-muted-foreground">No vendor block on this payroll run yet.</div>
        {editable && (
          <Button
            size="sm"
            onClick={async () => {
              await create.mutateAsync({
                company_id: companyId,
                pay_date: payDate,
                payroll_run_id: payrollRunId,
                run_kind: 'ride_along',
              });
              toast({ title: 'Vendor block attached' });
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Attach vendor block
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {run.vendor_count} vendor{run.vendor_count === 1 ? '' : 's'} · status {run.status}
        </div>
        {editable && run.status === 'draft' && (
          <AddVendorPaymentDialog runId={run.id} companyId={companyId} alreadyAddedVendorIds={addedIds} />
        )}
      </div>
      <VendorPaymentsList runId={run.id} allowDelete={editable && run.status === 'draft'} />
    </div>
  );
}