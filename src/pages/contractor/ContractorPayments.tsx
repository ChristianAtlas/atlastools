import { useMemo, useState } from 'react';
import { useCurrentVendor, useMyVendorPayments } from '@/hooks/useCurrentVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { VENDOR_1099_CATEGORIES } from '@/hooks/useVendors';

function fmt(c: number) {
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function ContractorPayments() {
  const { data: vendor } = useCurrentVendor();
  const { data: payments, isLoading } = useMyVendorPayments(vendor?.id);

  const years = useMemo(() => {
    const set = new Set<number>();
    (payments ?? []).forEach((p: any) => set.add(p.reporting_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [payments]);

  const [year, setYear] = useState<string>('all');
  const filtered = useMemo(() => {
    if (!payments) return [];
    return year === 'all'
      ? payments
      : payments.filter((p: any) => String(p.reporting_year) === year);
  }, [payments, year]);

  const totals = useMemo(() => {
    const necCats = VENDOR_1099_CATEGORIES.filter((c) => c.form === 'NEC').map((c) => c.value);
    let nec = 0, misc = 0, withholding = 0, gross = 0;
    filtered.forEach((p: any) => {
      if (p.status === 'voided') return;
      gross += p.gross_amount_cents;
      withholding += p.backup_withholding_cents;
      if (necCats.includes(p.category)) nec += p.gross_amount_cents;
      else misc += p.gross_amount_cents;
    });
    return { nec, misc, withholding, gross };
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Payment history" description="All payments processed through Atlas" />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Reporting year</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Gross</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold tabular-nums">{fmt(totals.gross)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">1099-NEC</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold tabular-nums">{fmt(totals.nec)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">1099-MISC</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold tabular-nums">{fmt(totals.misc)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Backup withholding</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold tabular-nums">{fmt(totals.withholding)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay date</TableHead>
                <TableHead>VPID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Withholding</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments yet.</TableCell></TableRow>
              ) : (
                filtered.map((p: any) => {
                  const payDate = p.vendor_payment_runs?.pay_date ?? p.paid_at ?? p.created_at;
                  const cat = VENDOR_1099_CATEGORIES.find((c) => c.value === p.category);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{payDate ? new Date(payDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.vpid}</TableCell>
                      <TableCell>{cat?.label ?? p.category}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(p.gross_amount_cents)}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{p.backup_withholding_cents ? fmt(p.backup_withholding_cents) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(p.net_amount_cents)}</TableCell>
                      <TableCell className="capitalize">{p.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'paid' ? 'default' : p.status === 'voided' ? 'destructive' : 'secondary'}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}