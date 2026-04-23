import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, ShieldAlert, AlertTriangle, FileWarning } from 'lucide-react';
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
  useVendors,
  evaluateVendorEligibility,
  ELIGIBILITY_LABELS,
  type VendorRow,
  type VendorEligibilityCode,
} from '@/hooks/useVendors';
import { rowsToCsv, downloadCsv } from '@/lib/csv';

type EligibilityFilter = 'all' | 'eligible' | 'blocked' | 'missing_w9' | 'expired_w9';

const W9_EXPIRY_WARN_DAYS = 30;

function w9ExpiryStatus(w9_expires_at: string | null): 'none' | 'ok' | 'expiring_soon' | 'expired' {
  if (!w9_expires_at) return 'none';
  const exp = new Date(w9_expires_at);
  const today = new Date(new Date().toDateString());
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= W9_EXPIRY_WARN_DAYS) return 'expiring_soon';
  return 'ok';
}

function buildCsv(rows: ReportRow[], year: number) {
  const headers = [
    'Reporting Year',
    'CID',
    'Company',
    'VID',
    'Legal Name',
    'Worker Type',
    'Status',
    'Onboarding',
    'W-9 Status',
    'W-9 Collected',
    'W-9 Expires',
    'TIN Type',
    'TIN Last 4',
    'Backup Withholding',
    'Eligible for 1099',
    'Blockers',
  ];
  const body = rows.map((r) => [
    year,
    r.vendor.companies?.cid ?? '',
    r.vendor.companies?.name ?? '',
    r.vendor.vid,
    r.vendor.legal_name,
    r.vendor.worker_type === '1099_ic' ? '1099 IC' : 'C2C Vendor',
    r.vendor.status,
    r.vendor.onboarding_status,
    r.vendor.w9_status,
    r.vendor.w9_collected_at ?? '',
    r.vendor.w9_expires_at ?? '',
    r.vendor.tax_id_type ? r.vendor.tax_id_type.toUpperCase() : '',
    r.vendor.tax_id_last4 ?? '',
    r.vendor.backup_withholding_enabled ? 'Y' : 'N',
    r.eligibility.eligible ? 'Y' : 'N',
    r.eligibility.blockers.map((b) => ELIGIBILITY_LABELS[b]).join('; '),
  ]);
  return rowsToCsv(headers, body);
}

interface ReportRow {
  vendor: VendorRow;
  eligibility: ReturnType<typeof evaluateVendorEligibility>;
  w9Expiry: ReturnType<typeof w9ExpiryStatus>;
}

export default function Vendor1099EligibilityReport() {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [search, setSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>('all');
  const [workerType, setWorkerType] = useState<'all' | '1099_ic' | 'c2c_vendor'>('all');

  const companyScope = isSuperAdmin ? undefined : profile?.company_id ?? undefined;
  const { data: vendors, isLoading } = useVendors({ companyId: companyScope });

  const allRows: ReportRow[] = useMemo(() => {
    return (vendors ?? []).map((v) => ({
      vendor: v,
      eligibility: evaluateVendorEligibility(v),
      w9Expiry: w9ExpiryStatus(v.w9_expires_at),
    }));
  }, [vendors]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (workerType !== 'all') rows = rows.filter((r) => r.vendor.worker_type === workerType);
    if (eligibilityFilter === 'eligible') rows = rows.filter((r) => r.eligibility.eligible);
    if (eligibilityFilter === 'blocked') rows = rows.filter((r) => !r.eligibility.eligible);
    if (eligibilityFilter === 'missing_w9') {
      rows = rows.filter((r) => r.eligibility.blockers.includes('w9_not_on_file'));
    }
    if (eligibilityFilter === 'expired_w9') {
      rows = rows.filter((r) => r.eligibility.blockers.includes('w9_expired') || r.w9Expiry === 'expiring_soon');
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.vendor.vid, r.vendor.legal_name, r.vendor.companies?.cid, r.vendor.companies?.name]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [allRows, workerType, eligibilityFilter, search]);

  const totals = useMemo(() => {
    return allRows.reduce(
      (acc, r) => ({
        total: acc.total + 1,
        eligible: acc.eligible + (r.eligibility.eligible ? 1 : 0),
        blocked: acc.blocked + (r.eligibility.eligible ? 0 : 1),
        missingW9: acc.missingW9 + (r.eligibility.blockers.includes('w9_not_on_file') ? 1 : 0),
        expiredW9: acc.expiredW9 + (r.eligibility.blockers.includes('w9_expired') ? 1 : 0),
        expiringSoon: acc.expiringSoon + (r.w9Expiry === 'expiring_soon' ? 1 : 0),
      }),
      { total: 0, eligible: 0, blocked: 0, missingW9: 0, expiredW9: 0, expiringSoon: 0 },
    );
  }, [allRows]);

  const handleDownload = () => {
    const csv = buildCsv(filtered, year);
    const scope = companyScope ? 'company' : 'all';
    downloadCsv(`1099_eligibility_${year}_${scope}.csv`, csv);
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to vendors
      </Button>

      <PageHeader
        title="1099 eligibility report"
        description="Per-vendor readiness for 1099 reporting. Surfaces missing or expired W-9s and other onboarding blockers so you can fix them before year-end filing."
        actions={
          <Button onClick={handleDownload} disabled={!filtered.length}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatTile label="Vendors" value={String(totals.total)} />
        <StatTile label="Eligible" value={String(totals.eligible)} tone="success" />
        <StatTile label="Blocked" value={String(totals.blocked)} tone={totals.blocked > 0 ? 'warning' : 'default'} />
        <StatTile label="Missing W-9" value={String(totals.missingW9)} tone={totals.missingW9 > 0 ? 'destructive' : 'default'} />
        <StatTile label="Expired W-9" value={String(totals.expiredW9)} tone={totals.expiredW9 > 0 ? 'destructive' : 'default'} />
        <StatTile label={`Expiring ≤${W9_EXPIRY_WARN_DAYS}d`} value={String(totals.expiringSoon)} tone={totals.expiringSoon > 0 ? 'warning' : 'default'} />
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
        <Select value={workerType} onValueChange={(v) => setWorkerType(v as typeof workerType)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All worker types</SelectItem>
            <SelectItem value="1099_ic">1099 IC</SelectItem>
            <SelectItem value="c2c_vendor">C2C Vendor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={eligibilityFilter} onValueChange={(v) => setEligibilityFilter(v as EligibilityFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All eligibility</SelectItem>
            <SelectItem value="eligible">Eligible only</SelectItem>
            <SelectItem value="blocked">Blocked only</SelectItem>
            <SelectItem value="missing_w9">Missing W-9</SelectItem>
            <SelectItem value="expired_w9">Expired or expiring soon</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <FileWarning className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No vendors match the current filters for {year}.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VID</TableHead>
                <TableHead>Vendor</TableHead>
                {!companyScope && <TableHead>Client</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>W-9</TableHead>
                <TableHead>TIN</TableHead>
                <TableHead>Blockers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.vendor.id} className="cursor-pointer" onClick={() => navigate(`/vendors/${r.vendor.id}`)}>
                  <TableCell className="font-mono text-xs">{r.vendor.vid}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.vendor.legal_name}</div>
                    <div className="text-xs text-muted-foreground">{r.vendor.email ?? '—'}</div>
                  </TableCell>
                  {!companyScope && (
                    <TableCell className="text-xs">
                      <div className="font-mono">{r.vendor.companies?.cid}</div>
                      <div className="text-muted-foreground">{r.vendor.companies?.name}</div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {r.vendor.worker_type === '1099_ic' ? '1099 IC' : 'C2C'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.eligibility.eligible ? (
                      <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Eligible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-warning text-warning">
                        <ShieldAlert className="mr-1 h-3 w-3" /> Blocked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <W9Cell vendor={r.vendor} expiry={r.w9Expiry} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.vendor.tax_id_type ? (
                      <span className="font-mono">{r.vendor.tax_id_type.toUpperCase()} ••{r.vendor.tax_id_last4 ?? '????'}</span>
                    ) : (
                      <span className="text-destructive">Missing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.eligibility.blockers.map((b) => (
                        <Badge key={b} variant="outline" className="text-[10px] border-warning text-warning">
                          {ELIGIBILITY_LABELS[b]}
                        </Badge>
                      ))}
                      {r.eligibility.eligible && r.w9Expiry === 'expiring_soon' && (
                        <Badge variant="outline" className="text-[10px] border-warning text-warning">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          W-9 expiring soon
                        </Badge>
                      )}
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

function W9Cell({ vendor, expiry }: { vendor: VendorRow; expiry: ReturnType<typeof w9ExpiryStatus> }) {
  const status = vendor.w9_status;
  const tone =
    status === 'on_file' && expiry !== 'expired'
      ? expiry === 'expiring_soon'
        ? 'warning'
        : 'success'
      : 'destructive';
  const label =
    status === 'on_file'
      ? expiry === 'expired'
        ? 'Expired'
        : 'On file'
      : status === 'pending_review'
        ? 'Pending review'
        : status === 'expired'
          ? 'Expired'
          : 'Not collected';
  const cls =
    tone === 'success'
      ? 'bg-success/15 text-success border-success/30'
      : tone === 'warning'
        ? 'border-warning text-warning'
        : 'border-destructive text-destructive';
  return (
    <div className="space-y-0.5">
      <Badge variant="outline" className={`text-[10px] ${cls}`}>{label}</Badge>
      {vendor.w9_expires_at && (
        <div className="text-[10px] text-muted-foreground">
          Exp {new Date(vendor.w9_expires_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}) {
  const cls =
    tone === 'success'
      ? 'border-success/40 bg-success/5'
      : tone === 'warning'
        ? 'border-warning/40 bg-warning/5'
        : tone === 'destructive'
          ? 'border-destructive/40 bg-destructive/5'
          : '';
  return (
    <Card className={`p-3 ${cls}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </Card>
  );
}
