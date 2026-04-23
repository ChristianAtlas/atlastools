import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, AlertTriangle, FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  use1099Summary,
  VENDOR_1099_CATEGORIES,
  type Vendor1099SummaryRow,
  type Vendor1099Category,
} from '@/hooks/useVendors';
import { rowsToCsv, downloadCsv } from '@/lib/csv';

const fmt = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const MISC_KEYS: Vendor1099Category[] = [
  'misc_rent',
  'misc_royalties',
  'misc_other_income',
  'misc_legal',
  'misc_prizes',
  'misc_medical',
  'misc_other',
];

function buildCsv(rows: Vendor1099SummaryRow[], year: number) {
  const headers = [
    'Reporting Year',
    'CID',
    'Company',
    'VID',
    'Recipient Name',
    'Worker Type',
    'C2C',
    'TIN Type',
    'TIN Last 4',
    'Email',
    'Address Line 1',
    'Address Line 2',
    'City',
    'State',
    'ZIP',
    'W-9 Status',
    'Form',
    'Box 1 NEC (Nonemployee Comp)',
    ...MISC_KEYS.map((k) => {
      const meta = VENDOR_1099_CATEGORIES.find((c) => c.value === k)!;
      return `MISC – ${meta.label}`;
    }),
    'Total MISC',
    'Backup Withholding',
    'Prior YTD Imported',
    'AtlasOne Paid',
    'Total Reportable',
    'Exceptions',
  ];

  const body = rows.map((r) => [
    year,
    r.company_cid ?? '',
    r.company_name ?? '',
    r.vid,
    r.legal_name,
    r.worker_type === '1099_ic' ? '1099 IC' : 'C2C Vendor',
    r.is_c2c ? 'Y' : 'N',
    r.tax_id_type ? r.tax_id_type.toUpperCase() : '',
    r.tax_id_last4 ?? '',
    r.email ?? '',
    r.address_line1 ?? '',
    r.address_line2 ?? '',
    r.city ?? '',
    r.state ?? '',
    r.zip ?? '',
    r.w9_status,
    r.reportable_form,
    (r.nec_cents / 100).toFixed(2),
    ...MISC_KEYS.map((k) => ((r.misc_breakdown[k] ?? 0) / 100).toFixed(2)),
    (r.misc_cents / 100).toFixed(2),
    (r.backup_withholding_cents / 100).toFixed(2),
    (r.prior_ytd_cents / 100).toFixed(2),
    (r.atlas_paid_cents / 100).toFixed(2),
    (r.total_reportable_cents / 100).toFixed(2),
    r.exceptions.join('; '),
  ]);

  return rowsToCsv(headers, body);
}

export default function Vendor1099Summary() {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<'all' | 'NEC' | 'MISC' | 'BOTH' | 'NONE'>('all');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);

  const companyScope = isSuperAdmin ? undefined : profile?.company_id ?? undefined;
  const { data, isLoading } = use1099Summary({ reportingYear: year, companyId: companyScope });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (form !== 'all') rows = rows.filter((r) => r.reportable_form === form);
    if (exceptionsOnly) rows = rows.filter((r) => r.exceptions.length > 0);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.vid, r.legal_name, r.company_cid, r.company_name].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, form, exceptionsOnly, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        nec: acc.nec + r.nec_cents,
        misc: acc.misc + r.misc_cents,
        bw: acc.bw + r.backup_withholding_cents,
        prior: acc.prior + r.prior_ytd_cents,
        atlas: acc.atlas + r.atlas_paid_cents,
        total: acc.total + r.total_reportable_cents,
        recipients: acc.recipients + (r.total_reportable_cents > 0 ? 1 : 0),
      }),
      { nec: 0, misc: 0, bw: 0, prior: 0, atlas: 0, total: 0, recipients: 0 },
    );
  }, [filtered]);

  const handleDownload = () => {
    const csv = buildCsv(filtered, year);
    const scope = companyScope ? 'company' : 'all';
    downloadCsv(`1099_summary_${year}_${scope}.csv`, csv);
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to vendors
      </Button>

      <PageHeader
        title="Year-end 1099 summary"
        description="Combined NEC and MISC totals per recipient with backup withholding. Exportable CSV for self-filing or AtlasOne filing review."
        actions={
          <Button onClick={handleDownload} disabled={!filtered.length}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatTile label="Recipients" value={String(totals.recipients)} />
        <StatTile label="NEC total" value={fmt(totals.nec)} />
        <StatTile label="MISC total" value={fmt(totals.misc)} />
        <StatTile label="Backup withholding" value={fmt(totals.bw)} />
        <StatTile label="Prior YTD imported" value={fmt(totals.prior)} />
        <StatTile label="Total reportable" value={fmt(totals.total)} highlight />
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search VID, name, CID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={form} onValueChange={(v) => setForm(v as typeof form)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All forms</SelectItem>
            <SelectItem value="NEC">NEC only</SelectItem>
            <SelectItem value="MISC">MISC only</SelectItem>
            <SelectItem value="BOTH">Both NEC + MISC</SelectItem>
            <SelectItem value="NONE">No reportable totals</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={exceptionsOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setExceptionsOnly((v) => !v)}
        >
          <AlertTriangle className="mr-2 h-4 w-4" /> Exceptions only
        </Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No 1099 activity for {year} matches the current filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VID</TableHead>
                <TableHead>Recipient</TableHead>
                {!companyScope && <TableHead>Client</TableHead>}
                <TableHead>Form</TableHead>
                <TableHead className="text-right">NEC</TableHead>
                <TableHead className="text-right">MISC</TableHead>
                <TableHead className="text-right">Backup WH</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Exceptions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.vendor_id} className="cursor-pointer" onClick={() => navigate(`/vendors/${r.vendor_id}`)}>
                  <TableCell className="font-mono text-xs">{r.vid}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.legal_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.tax_id_type ? `${r.tax_id_type.toUpperCase()} ••${r.tax_id_last4 ?? '????'}` : 'No TIN'}
                    </div>
                  </TableCell>
                  {!companyScope && (
                    <TableCell className="text-xs">
                      <div className="font-mono">{r.company_cid}</div>
                      <div className="text-muted-foreground">{r.company_name}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant={r.reportable_form === 'NONE' ? 'outline' : 'secondary'} className="text-[10px]">
                      {r.reportable_form}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.nec_cents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.misc_cents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.backup_withholding_cents)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{fmt(r.total_reportable_cents)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.exceptions.map((e) => (
                        <Badge key={e} variant="outline" className="text-[10px] border-warning text-warning">
                          {e.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? 'border-primary/40 bg-primary/5' : ''}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}