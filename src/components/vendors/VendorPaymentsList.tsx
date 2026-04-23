import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useVendorPayments,
  useDeleteVendorPayment,
  VENDOR_1099_CATEGORIES,
} from '@/hooks/useVendors';
import { useToast } from '@/hooks/use-toast';

const fmt = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function VendorPaymentsList({ runId, allowDelete = true }: { runId: string; allowDelete?: boolean }) {
  const { data, isLoading } = useVendorPayments(runId);
  const del = useDeleteVendorPayment();
  const { toast } = useToast();

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No vendor payments yet. Add one to get started.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>VPID</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">BW</TableHead>
            <TableHead className="text-right">Net</TableHead>
            {allowDelete && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => {
            const cat = VENDOR_1099_CATEGORIES.find((c) => c.value === p.category);
            const v = p.vendors;
            const display = v?.business_name || v?.legal_name || `${v?.first_name ?? ''} ${v?.last_name ?? ''}`.trim();
            return (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.vpid}</TableCell>
                <TableCell>
                  <div className="font-medium">{display}</div>
                  <div className="text-xs text-muted-foreground font-mono">{v?.vid}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{cat?.form ?? '—'}</Badge>
                </TableCell>
                <TableCell className="text-xs uppercase">{p.payment_method}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(p.gross_amount_cents)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(p.backup_withholding_cents)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{fmt(p.net_amount_cents)}</TableCell>
                {allowDelete && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        try {
                          await del.mutateAsync({ id: p.id, runId });
                          toast({ title: 'Payment removed' });
                        } catch (err: unknown) {
                          toast({ title: 'Could not remove', description: err instanceof Error ? err.message : '', variant: 'destructive' });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}