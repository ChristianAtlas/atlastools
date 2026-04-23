import { Link } from 'react-router-dom';
import { useCurrentVendor, useMyVendorPayments } from '@/hooks/useCurrentVendor';
import { useVendorDocuments, evaluateVendorEligibility, ELIGIBILITY_LABELS } from '@/hooks/useVendors';
import { useVendorBanking } from '@/hooks/useCurrentVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import { AlertCircle, FileText, CreditCard, User, Banknote, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

function formatCents(c: number) {
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const DOC_TYPE_LABELS: Record<string, string> = {
  w9: 'W-9',
  w8ben: 'W-8BEN',
  w8bene: 'W-8BEN-E',
  coi: 'Certificate of Insurance',
  contract: 'Contract / MSA',
  msa: 'Master Service Agreement',
  nda: 'NDA',
  other: 'Other',
};

function paymentStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'default';
    case 'voided':
    case 'failed':
      return 'destructive';
    case 'scheduled':
    case 'pending':
    case 'processing':
      return 'secondary';
    default:
      return 'outline';
  }
}

function PaymentStatusIcon({ status }: { status: string }) {
  if (status === 'paid' || status === 'completed') return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === 'voided' || status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export default function ContractorDashboard() {
  const { data: vendor, isLoading } = useCurrentVendor();
  const { data: docs } = useVendorDocuments(vendor?.id);
  const { data: payments } = useMyVendorPayments(vendor?.id);
  const { data: banking } = useVendorBanking(vendor?.id);

  const eligibility = vendor ? evaluateVendorEligibility(vendor) : null;
  const ytd = useMemo(() => {
    if (!payments) return { gross: 0, withholding: 0, count: 0, nec: 0, misc: 0 };
    const year = new Date().getFullYear();
    const rows = payments.filter((p: any) => p.reporting_year === year && p.status !== 'voided');
    const nec = rows
      .filter((p: any) => (p.reporting_category ?? p.category) === 'nec')
      .reduce((s: number, p: any) => s + (p.gross_amount_cents ?? 0), 0);
    const misc = rows
      .filter((p: any) => {
        const c = p.reporting_category ?? p.category;
        return c && c !== 'nec';
      })
      .reduce((s: number, p: any) => s + (p.gross_amount_cents ?? 0), 0);
    return {
      gross: rows.reduce((s: number, p: any) => s + (p.gross_amount_cents ?? 0), 0),
      withholding: rows.reduce((s: number, p: any) => s + (p.backup_withholding_cents ?? 0), 0),
      count: rows.length,
      nec,
      misc,
    };
  }, [payments]);

  const w9 = (docs ?? []).find((d) => d.document_type === 'w9' && d.is_active_w9);
  const onFileDocs = (docs ?? []).filter((d: any) => !d.deleted_at).slice(0, 6);
  const recentPayments = (payments ?? []).slice(0, 5);

  const onboardingSteps = vendor
    ? [
        {
          done: !!(vendor.email && vendor.phone && vendor.address_line1 && vendor.city && vendor.state && vendor.zip),
          label: 'Profile',
          to: '/contractor/profile',
        },
        {
          done: vendor.w9_status === 'on_file' && (docs ?? []).some((d: any) => d.document_type === 'w9' && d.is_active_w9),
          label: 'W-9',
          to: '/contractor/documents?type=w9',
        },
        { done: !!banking, label: 'Banking', to: '/contractor/banking' },
      ]
    : [];
  const onboardingDone = onboardingSteps.filter((s) => s.done).length;
  const onboardingTotal = onboardingSteps.length;
  const onboardingPct = onboardingTotal ? Math.round((onboardingDone / onboardingTotal) * 100) : 0;
  const nextOnboardingStep = onboardingSteps.find((s) => !s.done);

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!vendor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No contractor record is linked to this account. Please contact your administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  const display =
    vendor.business_name ||
    [vendor.first_name, vendor.last_name].filter(Boolean).join(' ') ||
    vendor.legal_name;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={`Welcome, ${display}`} description={`Vendor ID: ${vendor.vid}`} />

      {onboardingTotal > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
                {nextOnboardingStep ? (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" /> {onboardingDone} of {onboardingTotal} complete
                  </Badge>
                ) : (
                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Complete</Badge>
                )}
              </div>
              {nextOnboardingStep ? (
                <Button asChild size="sm">
                  <Link to={nextOnboardingStep.to}>
                    Continue: {nextOnboardingStep.label}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to="/contractor/onboarding">Review checklist</Link>
                </Button>
              )}
            </div>
            <Progress value={onboardingPct} />
          </CardContent>
        </Card>
      )}

      {eligibility && !eligibility.eligible && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Action required to receive payments</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4">
                {eligibility.blockers.map((b) => (
                  <li key={b}>{ELIGIBILITY_LABELS[b]}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">YTD gross paid</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatCents(ytd.gross)}</p>
            <p className="text-xs text-muted-foreground">{ytd.count} payments this year</p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">1099-NEC</span><span className="tabular-nums font-medium">{formatCents(ytd.nec)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">1099-MISC</span><span className="tabular-nums font-medium">{formatCents(ytd.misc)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Backup withholding</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatCents(ytd.withholding)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {vendor.backup_withholding_enabled
                ? `Active at ${((vendor.backup_withholding_rate ?? 0.24) * 100).toFixed(0)}%`
                : 'Not currently withheld'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">W-9 status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={vendor.w9_status === 'on_file' ? 'default' : 'secondary'}>
              {vendor.w9_status.replace(/_/g, ' ')}
            </Badge>
            {w9 && (
              <p className="text-xs text-muted-foreground mt-2">
                Last uploaded {new Date(w9.created_at).toLocaleDateString()}
              </p>
            )}
            {vendor.w9_expires_at && (
              <p className="text-xs text-muted-foreground">
                Expires {new Date(vendor.w9_expires_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent payment activity</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/contractor/payments">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {recentPayments.map((p: any) => {
                  const run = p.vendor_payment_runs;
                  const dateStr = run?.pay_date
                    ? new Date(run.pay_date).toLocaleDateString()
                    : new Date(p.created_at).toLocaleDateString();
                  return (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PaymentStatusIcon status={p.status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{formatCents(p.gross_amount_cents ?? 0)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {dateStr}
                            {p.reporting_category ? ` · ${String(p.reporting_category).toUpperCase()}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant={paymentStatusVariant(p.status)} className="capitalize shrink-0">
                        {String(p.status).replace(/_/g, ' ')}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documents on file</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/contractor/documents">Manage</Link></Button>
          </CardHeader>
          <CardContent>
            {onFileDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No documents uploaded yet.</p>
            ) : (
              <ul className="divide-y">
                {onFileDocs.map((d: any) => (
                  <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {DOC_TYPE_LABELS[d.document_type] ?? d.document_type}
                          {d.document_type === 'w9' && d.is_active_w9 && (
                            <span className="ml-2 text-xs text-primary">(active)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Uploaded {new Date(d.created_at).toLocaleDateString()}
                          {d.expires_at ? ` · expires ${new Date(d.expires_at).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Button asChild variant="outline" className="justify-start h-auto py-3">
          <Link to="/contractor/payments"><CreditCard className="h-4 w-4 mr-2" /> View payment history</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-auto py-3">
          <Link to="/contractor/documents"><FileText className="h-4 w-4 mr-2" /> Upload / manage documents</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-auto py-3">
          <Link to="/contractor/profile"><User className="h-4 w-4 mr-2" /> Edit profile</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start h-auto py-3">
          <Link to="/contractor/banking"><Banknote className="h-4 w-4 mr-2" /> Update banking</Link>
        </Button>
      </div>
    </div>
  );
}