import { useMemo, useState } from 'react';
import { useCurrentVendor, useMyVendorPayments } from '@/hooks/useCurrentVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { Download, FileText, AlertCircle } from 'lucide-react';
import { VENDOR_1099_CATEGORIES, type Vendor1099Category } from '@/hooks/useVendors';
import { rowsToCsv, downloadCsv } from '@/lib/csv';

const REPORTING_THRESHOLD_CENTS = 60000; // $600 IRS reporting threshold

function fmt(c: number) {
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function categoryForm(cat: string): 'NEC' | 'MISC' | null {
  return VENDOR_1099_CATEGORIES.find((c) => c.value === cat)?.form ?? null;
}
function categoryLabel(cat: string): string {
  return VENDOR_1099_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export default function Contractor1099s() {
  const { data: vendor } = useCurrentVendor();
  const { data: payments, isLoading } = useMyVendorPayments(vendor?.id);

  const years = useMemo(() => {
    const set = new Set<number>();
    (payments ?? []).forEach((p: any) => set.add(p.reporting_year));
    const arr = Array.from(set).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [payments]);

  const [year, setYear] = useState<string>(() => String(new Date().getFullYear()));

  const yearPayments = useMemo(
    () => (payments ?? []).filter((p: any) => String(p.reporting_year) === year && p.status !== 'voided'),
    [payments, year]
  );

  const breakdown = useMemo(() => {
    const byCat: Record<string, { gross: number; withholding: number; count: number }> = {};
    let nec = 0;
    let misc = 0;
    let withholding = 0;
    yearPayments.forEach((p: any) => {
      const cat: Vendor1099Category = p.category;
      byCat[cat] ??= { gross: 0, withholding: 0, count: 0 };
      byCat[cat].gross += p.gross_amount_cents ?? 0;
      byCat[cat].withholding += p.backup_withholding_cents ?? 0;
      byCat[cat].count += 1;
      withholding += p.backup_withholding_cents ?? 0;
      if (categoryForm(cat) === 'NEC') nec += p.gross_amount_cents ?? 0;
      else if (categoryForm(cat) === 'MISC') misc += p.gross_amount_cents ?? 0;
    });
    return { byCat, nec, misc, withholding };
  }, [yearPayments]);

  const necReportable = breakdown.nec >= REPORTING_THRESHOLD_CENTS || breakdown.withholding > 0;
  const miscReportable = breakdown.misc >= REPORTING_THRESHOLD_CENTS || breakdown.withholding > 0;

  function downloadStatement(form: 'NEC' | 'MISC') {
    if (!vendor) return;
    const rows = yearPayments.filter((p: any) => categoryForm(p.category) === form);
    const headers = [
      'Pay date',
      'VPID',
      'Reporting year',
      'Category',
      'Gross ($)',
      'Backup withholding ($)',
      'Net ($)',
      'Payment method',
      'Status',
    ];
    const body = rows.map((p: any) => [
      p.vendor_payment_runs?.pay_date ?? p.paid_at ?? p.created_at?.slice(0, 10) ?? '',
      p.vpid,
      p.reporting_year,
      categoryLabel(p.category),
      ((p.gross_amount_cents ?? 0) / 100).toFixed(2),
      ((p.backup_withholding_cents ?? 0) / 100).toFixed(2),
      ((p.net_amount_cents ?? 0) / 100).toFixed(2),
      p.payment_method,
      p.status,
    ]);
    // Footer total row
    const totalGross = rows.reduce((s: number, p: any) => s + (p.gross_amount_cents ?? 0), 0);
    const totalBW = rows.reduce((s: number, p: any) => s + (p.backup_withholding_cents ?? 0), 0);
    const totalNet = rows.reduce((s: number, p: any) => s + (p.net_amount_cents ?? 0), 0);
    body.push([
      'TOTAL',
      '',
      year,
      `1099-${form}`,
      (totalGross / 100).toFixed(2),
      (totalBW / 100).toFixed(2),
      (totalNet / 100).toFixed(2),
      '',
      '',
    ]);
    const csv = rowsToCsv(headers, body);
    const safeName = (vendor.business_name || vendor.legal_name || 'contractor').replace(/[^a-z0-9]+/gi, '_');
    downloadCsv(`1099-${form}_${year}_${vendor.vid}_${safeName}.csv`, csv);
  }

  if (!vendor) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="1099 Download Center"
        description="Download your year-end NEC and MISC payment statements"
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Tax year</span>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 1099-NEC */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Form 1099-NEC</CardTitle>
              {breakdown.nec > 0 ? (
                necReportable ? (
                  <Badge>Reportable</Badge>
                ) : (
                  <Badge variant="secondary">Below $600 threshold</Badge>
                )
              ) : (
                <Badge variant="outline">No activity</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{fmt(breakdown.nec)}</p>
              <p className="text-xs text-muted-foreground mt-1">Nonemployee compensation for services</p>
            </div>
            <Button
              onClick={() => downloadStatement('NEC')}
              disabled={breakdown.nec === 0}
              className="w-full"
              variant={necReportable ? 'default' : 'outline'}
            >
              <Download className="h-4 w-4 mr-2" /> Download NEC statement (CSV)
            </Button>
          </CardContent>
        </Card>

        {/* 1099-MISC */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Form 1099-MISC</CardTitle>
              {breakdown.misc > 0 ? (
                miscReportable ? (
                  <Badge>Reportable</Badge>
                ) : (
                  <Badge variant="secondary">Below $600 threshold</Badge>
                )
              ) : (
                <Badge variant="outline">No activity</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{fmt(breakdown.misc)}</p>
              <p className="text-xs text-muted-foreground mt-1">Rents, royalties, prizes, legal fees, and other</p>
            </div>
            <Button
              onClick={() => downloadStatement('MISC')}
              disabled={breakdown.misc === 0}
              className="w-full"
              variant={miscReportable ? 'default' : 'outline'}
            >
              <Download className="h-4 w-4 mr-2" /> Download MISC statement (CSV)
            </Button>
          </CardContent>
        </Card>
      </div>

      {breakdown.withholding > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Backup withholding applied</p>
              <p className="text-xs text-muted-foreground">
                {fmt(breakdown.withholding)} was withheld and reported in Box 4 of your 1099 for {year}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Category breakdown ({year})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Form</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Withholding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : Object.keys(breakdown.byCat).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No reportable payments for {year}.
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(breakdown.byCat).map(([cat, totals]) => (
                  <TableRow key={cat}>
                    <TableCell>{categoryLabel(cat)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{categoryForm(cat) ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{totals.count}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(totals.gross)}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {totals.withholding ? fmt(totals.withholding) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            CSV statements summarize the payments AtlasOne processed for you in the selected tax year and reconcile
            to the totals reported on your IRS Form 1099-NEC and 1099-MISC. Official IRS-issued PDFs are mailed by
            January 31 and posted here once finalized. Contact your client administrator if amounts appear incorrect.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
