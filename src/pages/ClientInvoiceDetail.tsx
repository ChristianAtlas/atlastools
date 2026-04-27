import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, CheckCircle2, AlertCircle, Clock, Receipt, Info, AlertTriangle, History,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useInvoice,
  useInvoiceLineItems,
  usePayInvoiceCheckout,
  usePaymentAttempts,
  useNsfEvents,
  centsToUSD,
} from '@/hooks/useInvoices';

/**
 * Five canonical sections for payroll invoices.
 * Internal categories (e.g. *_markup) are stripped before client render.
 */
const SECTIONS = [
  {
    key: 'total_payments',
    title: '1. Total Payments',
    description: 'Gross wages and contractor payments processed this run.',
    categories: ['gross_pay', 'contractor_payment', 'bonus', 'commission'],
    informational: false,
  },
  {
    key: 'employee_taxes',
    title: '2. Employee Tax Withholdings',
    description: 'Withheld from employee paychecks. Informational — not added to your total.',
    categories: ['employee_tax', 'employee_taxes'],
    informational: true,
  },
  {
    key: 'employee_deductions',
    title: '3. Employee Deductions',
    description: 'Pre/post-tax deductions withheld from employees. Informational.',
    categories: ['employee_deduction', 'employee_deductions'],
    informational: true,
  },
  {
    key: 'employer_taxes',
    title: '4. Employer Tax Contributions',
    description: 'Employer-side payroll taxes (FICA, FUTA, SUI).',
    categories: ['employer_tax', 'employer_taxes', 'sui'],
    informational: false,
  },
  {
    key: 'employer_benefits',
    title: '5. Employer Benefit Contributions',
    description: 'Workers’ Comp, 401(k) match, and other employer-paid benefits.',
    categories: ['employer_benefit', 'employer_benefits', 'workers_comp', '401k_match'],
    informational: false,
  },
] as const;

export default function ClientInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, isClientAdmin, isSuperAdmin } = useAuth();
  const companyId = profile?.company_id ?? undefined;

  const { data: invoice, isLoading } = useInvoice(id);
  const { data: lineItems = [] } = useInvoiceLineItems(id);
  const { data: paymentAttempts = [] } = usePaymentAttempts(id);
  const { data: allNsfEvents = [] } = useNsfEvents(companyId);
  const payCheckout = usePayInvoiceCheckout();

  const invoiceNsfEvents = useMemo(
    () => allNsfEvents.filter((e) => e.invoice_id === id),
    [allNsfEvents, id],
  );
  const openNsf = invoiceNsfEvents.find((e) => e.status === 'open');

  // Privacy: filter out any internal/markup line items before any rendering.
  const visibleItems = useMemo(
    () => lineItems.filter((li) => !li.is_internal && li.markup_type !== 'sui_markup' && li.markup_type !== 'wc_markup'),
    [lineItems],
  );

  const sections = useMemo(() => {
    return SECTIONS.map((s) => {
      const items = visibleItems.filter((li) => {
        if (li.section_label && li.section_label.toLowerCase().includes(s.key.split('_')[0])) return true;
        return li.category && (s.categories as readonly string[]).includes(li.category);
      });
      const subtotal = items.reduce((sum, li) => sum + li.total_cents, 0);
      return { ...s, items, subtotal };
    });
  }, [visibleItems]);

  // Items that didn't match a section (e.g. monthly service line items) → render flat
  const ungroupedItems = useMemo(() => {
    const grouped = new Set(sections.flatMap((s) => s.items.map((i) => i.id)));
    return visibleItems.filter((li) => !grouped.has(li.id));
  }, [sections, visibleItems]);

  if (!isClientAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading invoice…" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice not found" />
        <Button asChild variant="outline"><Link to="/client-invoices"><ArrowLeft className="h-4 w-4 mr-2" />Back to invoices</Link></Button>
      </div>
    );
  }

  // Tenancy guard for client_admin
  if (isClientAdmin && companyId && invoice.company_id !== companyId) {
    return <Navigate to="/client-invoices" replace />;
  }

  const balance = invoice.balance_due_cents ?? invoice.total_cents;
  const isPastDue = invoice.status !== 'paid' && invoice.status !== 'voided' && new Date(invoice.due_date) < new Date();
  const canPay = balance > 0 && invoice.status !== 'paid' && invoice.status !== 'voided' && invoice.status !== 'processing';

  const handlePayNow = async () => {
    try {
      const res = await payCheckout.mutateAsync(invoice.id);
      if (res?.url) window.location.href = res.url;
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start checkout');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link to="/client-invoices"><ArrowLeft className="h-4 w-4 mr-1" />All invoices</Link>
        </Button>
        <PageHeader
          title={invoice.invoice_number}
          description={`${invoice.invoice_type === 'monthly' ? 'Monthly Service' : 'Payroll'} invoice • ${format(new Date(invoice.period_start), 'MMM d')} – ${format(new Date(invoice.period_end), 'MMM d, yyyy')}`}
          actions={canPay ? (
            <Button onClick={handlePayNow} disabled={payCheckout.isPending} size="lg">
              <Receipt className="h-4 w-4 mr-2" />
              Pay {centsToUSD(balance)}
            </Button>
          ) : undefined}
        />
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryItem label="Status" value={<StatusPill status={invoice.status} pastDue={isPastDue} />} />
            <SummaryItem label="Due Date" value={format(new Date(invoice.due_date), 'MMM d, yyyy')} />
            <SummaryItem label="Total" value={<span className="tabular-nums">{centsToUSD(invoice.total_cents)}</span>} />
            <SummaryItem label="Balance Due" value={<span className="tabular-nums font-semibold">{centsToUSD(balance)}</span>} />
          </div>
        </CardContent>
      </Card>

      {/* 5-section breakdown (only for payroll invoices) */}
      {invoice.invoice_type === 'payroll' || invoice.invoice_type === 'payroll_run' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Breakdown</CardTitle>
            <CardDescription>
              Sections marked <em>informational</em> are shown for transparency and are not included in the amount you owe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={['total_payments']} className="w-full">
              {sections.map((section) => (
                <AccordionItem key={section.key} value={section.key}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-3">
                      <div className="flex items-center gap-2 text-left">
                        <span className="font-medium">{section.title}</span>
                        {section.informational && (
                          <Badge variant="secondary" className="text-[10px] uppercase">Informational</Badge>
                        )}
                      </div>
                      <span className="tabular-nums whitespace-nowrap text-sm">
                        {centsToUSD(section.subtotal)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-3 flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {section.description}
                    </p>
                    {section.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic px-2 py-3">No items in this section.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Rate</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {section.items.map((li) => (
                            <TableRow key={li.id}>
                              <TableCell className="text-sm">{li.description}</TableCell>
                              <TableCell className="text-right tabular-nums text-sm">{li.quantity}</TableCell>
                              <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">{centsToUSD(li.unit_price_cents)}</TableCell>
                              <TableCell className="text-right tabular-nums text-sm whitespace-nowrap font-medium">{centsToUSD(li.total_cents)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...ungroupedItems, ...visibleItems.filter((i) => !ungroupedItems.includes(i))].map((li) => (
                  <TableRow key={li.id}>
                    <TableCell className="text-sm">{li.description}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{li.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">{centsToUSD(li.unit_price_cents)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm whitespace-nowrap font-medium">{centsToUSD(li.total_cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Totals footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="ml-auto max-w-sm space-y-2">
            <Row label="Subtotal" value={centsToUSD(invoice.subtotal_cents)} />
            <Separator />
            <Row label="Total" value={centsToUSD(invoice.total_cents)} bold />
            {invoice.paid_amount_cents > 0 && (
              <Row label="Paid" value={`– ${centsToUSD(invoice.paid_amount_cents)}`} />
            )}
            <Separator />
            <Row label="Balance Due" value={centsToUSD(balance)} bold large />
          </div>
          {canPay && (
            <div className="flex justify-end mt-6">
              <Button onClick={handlePayNow} disabled={payCheckout.isPending} size="lg">
                <Receipt className="h-4 w-4 mr-2" />
                Pay {centsToUSD(balance)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

function Row({ label, value, bold, large }: { label: string; value: string; bold?: boolean; large?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${large ? 'text-base' : 'text-sm'} ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums whitespace-nowrap">{value}</span>
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