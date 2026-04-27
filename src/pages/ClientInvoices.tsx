import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { CreditCard, Search, Receipt, AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInvoices,
  useBillingProfiles,
  usePayInvoiceCheckout,
  useToggleAutopay,
  usePaymentMethods,
  centsToUSD,
} from '@/hooks/useInvoices';

/**
 * Client-facing invoices list.
 *
 * Privacy contract — never expose to client:
 *   - markup_cents, sui_markup_rate, workers_comp_markup_rate
 *   - is_internal line items
 *   - internal billing notes
 */
export default function ClientInvoices() {
  const { profile, isClientAdmin, isSuperAdmin } = useAuth();
  const companyId = profile?.company_id ?? undefined;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: invoices = [], isLoading } = useInvoices(companyId);
  const { data: billingProfiles = [] } = useBillingProfiles();
  const { data: paymentMethods = [] } = usePaymentMethods(companyId);
  const payCheckout = usePayInvoiceCheckout();
  const toggleAutopay = useToggleAutopay();

  const billingProfile = useMemo(
    () => billingProfiles.find((b) => b.company_id === companyId),
    [billingProfiles, companyId],
  );
  const autopayEnabled = (billingProfile as any)?.autopay_enabled === true;
  const hasDefaultMethod = paymentMethods.some((m) => m.is_default && m.status === 'active');

  const accessDenied = !isClientAdmin && !isSuperAdmin;
  if (accessDenied) return <Navigate to="/" replace />;

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false;
    if (search && !inv.invoice_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalDue = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'voided')
    .reduce((sum, i) => sum + (i.balance_due_cents ?? i.total_cents), 0);
  const pastDue = invoices
    .filter((i) => i.status === 'past_due' || (i.status !== 'paid' && i.status !== 'voided' && new Date(i.due_date) < new Date()))
    .reduce((sum, i) => sum + (i.balance_due_cents ?? i.total_cents), 0);
  const paidYTD = invoices
    .filter((i) => i.status === 'paid' && new Date(i.paid_at ?? '').getFullYear() === new Date().getFullYear())
    .reduce((sum, i) => sum + i.total_cents, 0);

  const handlePayNow = async (invoiceId: string) => {
    try {
      const res = await payCheckout.mutateAsync(invoiceId);
      if (res?.url) window.location.href = res.url;
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start checkout');
    }
  };

  const handleToggleAutopay = async (enabled: boolean) => {
    if (!companyId) return;
    if (enabled && !hasDefaultMethod) {
      toast.error('Add a payment method before enabling autopay');
      return;
    }
    try {
      await toggleAutopay.mutateAsync({ company_id: companyId, enabled });
      toast.success(enabled ? 'Autopay enabled' : 'Autopay disabled');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update autopay');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Billing"
        description="View and pay your AtlasOne HR invoices"
      />

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Outstanding"
          value={centsToUSD(totalDue)}
          icon={Receipt}
          tone={totalDue > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Past Due"
          value={centsToUSD(pastDue)}
          icon={AlertCircle}
          tone={pastDue > 0 ? 'destructive' : 'default'}
        />
        <StatCard label="Paid YTD" value={centsToUSD(paidYTD)} icon={CheckCircle2} />
      </div>

      {/* Autopay card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Autopay
            </CardTitle>
            <CardDescription className="mt-1">
              Automatically charge your default payment method on the due date.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="autopay-toggle" className="text-sm">
              {autopayEnabled ? 'On' : 'Off'}
            </Label>
            <Switch
              id="autopay-toggle"
              checked={autopayEnabled}
              onCheckedChange={handleToggleAutopay}
              disabled={toggleAutopay.isPending}
            />
          </div>
        </CardHeader>
        <CardContent>
          {!hasDefaultMethod ? (
            <div className="flex items-center justify-between rounded-md border border-dashed border-border p-3 text-sm">
              <span className="text-muted-foreground">No payment method on file.</span>
              <Button asChild variant="outline" size="sm">
                <Link to="/client-settings#billing">Add payment method</Link>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Default method: {paymentMethods.find((m) => m.is_default)?.brand ?? 'Bank account'} •••• {paymentMethods.find((m) => m.is_default)?.last4}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="monthly">Monthly Service</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices found</TableCell></TableRow>
                ) : filtered.map((inv) => {
                  const balance = inv.balance_due_cents ?? inv.total_cents;
                  const canPay = balance > 0 && inv.status !== 'paid' && inv.status !== 'voided' && inv.status !== 'processing';
                  const isPastDue = inv.status !== 'paid' && inv.status !== 'voided' && new Date(inv.due_date) < new Date();
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link to={`/client-invoices/${inv.id}`} className="hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize text-sm text-muted-foreground">{inv.invoice_type}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(inv.due_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap font-medium">
                        {centsToUSD(inv.total_cents)}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={inv.status} pastDue={isPastDue} />
                      </TableCell>
                      <TableCell className="text-right">
                        {canPay ? (
                          <Button
                            size="sm"
                            onClick={() => handlePayNow(inv.id)}
                            disabled={payCheckout.isPending}
                          >
                            Pay Now
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/client-invoices/${inv.id}`}>
                              View <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusPill({ status, pastDue }: { status: string; pastDue: boolean }) {
  if (status === 'paid') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
  if (status === 'voided') return <Badge variant="secondary">Voided</Badge>;
  if (status === 'processing') return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (pastDue || status === 'past_due') return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Past Due</Badge>;
  return <Badge variant="outline">Open</Badge>;
}