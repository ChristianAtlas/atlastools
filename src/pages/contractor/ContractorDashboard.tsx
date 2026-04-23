import { Link } from 'react-router-dom';
import { useCurrentVendor, useMyVendorPayments } from '@/hooks/useCurrentVendor';
import { useVendorDocuments, evaluateVendorEligibility, ELIGIBILITY_LABELS } from '@/hooks/useVendors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { AlertCircle, FileText, CreditCard, User, Banknote } from 'lucide-react';
import { useMemo } from 'react';

function formatCents(c: number) {
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function ContractorDashboard() {
  const { data: vendor, isLoading } = useCurrentVendor();
  const { data: docs } = useVendorDocuments(vendor?.id);
  const { data: payments } = useMyVendorPayments(vendor?.id);

  const eligibility = vendor ? evaluateVendorEligibility(vendor) : null;
  const ytd = useMemo(() => {
    if (!payments) return { gross: 0, withholding: 0, count: 0 };
    const year = new Date().getFullYear();
    const rows = payments.filter((p: any) => p.reporting_year === year && p.status !== 'voided');
    return {
      gross: rows.reduce((s: number, p: any) => s + (p.gross_amount_cents ?? 0), 0),
      withholding: rows.reduce((s: number, p: any) => s + (p.backup_withholding_cents ?? 0), 0),
      count: rows.length,
    };
  }, [payments]);

  const w9 = (docs ?? []).find((d) => d.document_type === 'w9' && d.is_active_w9);

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
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Backup withholding</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatCents(ytd.withholding)}</p>
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