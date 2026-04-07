import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import {
  useInvoices, useInvoiceLineItems, useNsfEvents, useBillingProfiles,
  useUpdateInvoiceStatus, useGenerateMonthlyInvoices, useGeneratePayrollInvoice,
  useCreateNsfCase, useUpdateNsfCase,
  centsToUSD, type InvoiceRow, type NsfEventRow,
} from '@/hooks/useInvoices';
import { useCompanies } from '@/hooks/useCompanies';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  DollarSign, FileText, TrendingUp, AlertTriangle, Clock, Send,
  Download, CheckCircle, XCircle, RefreshCw, Search, Filter,
  CreditCard, Ban, CalendarDays, Users, ArrowUpRight, Eye, Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const fmt = (cents: number) => centsToUSD(cents);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  generated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  due_immediately: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pending_payment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  past_due: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  failed_payment: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  nsf_returned: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  in_collections: 'bg-red-200 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  written_off: 'bg-muted text-muted-foreground',
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const cls = INVOICE_STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, iconColor }: { icon: React.ElementType; label: string; value: string | number; iconColor?: string }) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor || 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 ${iconColor ? 'text-inherit' : 'text-primary'}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Invoice Detail Dialog ───
function InvoiceDetailDialog({ invoice, open, onClose, isSuperAdmin }: { invoice: InvoiceRow | null; open: boolean; onClose: () => void; isSuperAdmin: boolean }) {
  const { data: lineItems } = useInvoiceLineItems(invoice?.id);
  const updateStatus = useUpdateInvoiceStatus();

  if (!invoice) return null;

  const clientItems = (lineItems || []).filter(li => !li.is_markup);
  const markupItems = (lineItems || []).filter(li => li.is_markup);

  const handleMarkPaid = () => {
    updateStatus.mutate({ id: invoice.id, status: 'paid' }, {
      onSuccess: () => { toast.success('Invoice marked as paid'); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleSend = () => {
    updateStatus.mutate({ id: invoice.id, status: 'sent', sent_at: new Date().toISOString(), delivery_status: 'sent' } as any, {
      onSuccess: () => toast.success('Invoice sent'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoice.invoice_number}</span>
            <InvoiceStatusBadge status={invoice.status} />
          </DialogTitle>
          <DialogDescription>
            {invoice.company_name} · {invoice.invoice_type === 'monthly' ? 'Monthly' : 'Payroll'} Invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Invoice Date</span>
              <p className="font-medium">{fmtDate(invoice.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date</span>
              <p className="font-medium">{fmtDate(invoice.due_date)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Period</span>
              <p className="font-medium">{fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Employees</span>
              <p className="font-medium">{invoice.employee_count}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientItems.map(li => (
                  <tr key={li.id}>
                    <td className="px-3 py-2">{li.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{li.quantity}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(li.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td colSpan={2} className="px-3 py-2 font-semibold">Total</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmt(invoice.total_cents)}</td>
                </tr>
                {invoice.balance_due_cents > 0 && invoice.balance_due_cents !== invoice.total_cents && (
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-muted-foreground">Balance Due</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-destructive">{fmt(invoice.balance_due_cents)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Internal markup details (super admin only) */}
          {isSuperAdmin && markupItems.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Internal Markup Details</p>
              <div className="space-y-1">
                {markupItems.map(li => (
                  <div key={li.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{li.description}</span>
                    <span className="tabular-nums">{fmt(li.total_cents)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catch-up info */}
          {invoice.catch_up_count > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <ArrowUpRight className="h-4 w-4" />
              Includes catch-up charges for {invoice.catch_up_count} employees ({fmt(invoice.catch_up_cents)})
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {invoice.status !== 'paid' && (
            <>
              <Button variant="outline" size="sm" onClick={handleSend} disabled={invoice.status === 'sent'}>
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
              <Button size="sm" onClick={handleMarkPaid} disabled={updateStatus.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── NSF Case Dialog ───
function NsfDetailDialog({ nsfCase, open, onClose }: { nsfCase: NsfEventRow | null; open: boolean; onClose: () => void }) {
  const updateNsf = useUpdateNsfCase();
  const [notes, setNotes] = useState('');

  if (!nsfCase) return null;

  const handleResolve = () => {
    updateNsf.mutate({ id: nsfCase.id, status: 'resolved', resolved_at: new Date().toISOString(), notes: notes || nsfCase.notes }, {
      onSuccess: () => { toast.success('NSF case resolved'); onClose(); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleRetry = () => {
    updateNsf.mutate({ id: nsfCase.id, status: 'retry_scheduled', retry_count: nsfCase.retry_count + 1, retry_scheduled_at: new Date().toISOString() } as any, {
      onSuccess: () => toast.success('Retry scheduled'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>NSF Case #{nsfCase.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>Failed payment resolution</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-muted-foreground">Amount</span><p className="font-medium">{fmt(nsfCase.amount_cents)}</p></div>
            <div><span className="text-muted-foreground">Fee</span><p className="font-medium">{fmt(nsfCase.fee_cents)}</p></div>
            <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{nsfCase.failure_type || 'NSF'}</p></div>
            <div><span className="text-muted-foreground">Retries</span><p className="font-medium">{nsfCase.retry_count}/3</p></div>
            <div><span className="text-muted-foreground">Status</span><p><InvoiceStatusBadge status={nsfCase.status} /></p></div>
            <div><span className="text-muted-foreground">Created</span><p className="font-medium">{fmtDate(nsfCase.created_at)}</p></div>
          </div>
          <Textarea placeholder="Add resolution notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        </div>
        <DialogFooter className="gap-2">
          {nsfCase.retry_eligible && nsfCase.retry_count < 3 && (
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={updateNsf.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry Payment
            </Button>
          )}
          <Button size="sm" onClick={handleResolve} disabled={updateNsf.isPending}>
            <CheckCircle className="h-4 w-4 mr-1" /> Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Wire Instructions Card (Client Admin) ───
function WireInstructionsCard() {
  return (
    <Card className="shadow-sm border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Wire Instructions for Late Payroll Funding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          If your payroll submission was late, you may be required to fund via wire transfer. Use the details below:
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/50 rounded-lg p-4">
          <div><span className="text-muted-foreground">Bank Name</span><p className="font-medium">First National Bank</p></div>
          <div><span className="text-muted-foreground">Routing Number</span><p className="font-mono font-medium">021000021</p></div>
          <div><span className="text-muted-foreground">Account Number</span><p className="font-mono font-medium">•••••7890</p></div>
          <div><span className="text-muted-foreground">Account Name</span><p className="font-medium">AtlasOne Payroll Trust</p></div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Reference</span>
            <p className="font-medium">Include your Company ID and payroll period in the wire memo</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Wire transfers typically settle same-day if initiated before 2:00 PM EST. Contact your account manager for questions.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───
export default function Invoices() {
  const { isSuperAdmin } = useAuth();
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: nsfEvents = [] } = useNsfEvents();
  const { data: billingProfiles = [] } = useBillingProfiles();
  const { data: companies = [] } = useCompanies();
  const generateMonthly = useGenerateMonthlyInvoices();
  const updateStatus = useUpdateInvoiceStatus();

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [selectedNsf, setSelectedNsf] = useState<NsfEventRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  // Stats
  const totalAR = invoices.filter(i => !['paid', 'written_off', 'resolved'].includes(i.status)).reduce((s, i) => s + i.balance_due_cents, 0);
  const paidThisMonth = invoices
    .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth())
    .reduce((s, i) => s + i.total_cents, 0);
  const overdueInvoices = invoices.filter(i => ['past_due', 'failed_payment', 'nsf_returned'].includes(i.status));
  const openNsf = nsfEvents.filter(n => !['resolved', 'closed'].includes(n.status));
  const invoicesToday = invoices.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString());

  // Filtered invoices
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (searchTerm && !inv.company_name.toLowerCase().includes(searchTerm.toLowerCase()) && !inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (typeFilter !== 'all' && inv.invoice_type !== typeFilter) return false;
      if (companyFilter !== 'all' && inv.company_id !== companyFilter) return false;
      return true;
    });
  }, [invoices, searchTerm, statusFilter, typeFilter, companyFilter]);

  const handleGenerateMonthly = () => {
    generateMonthly.mutate({}, {
      onSuccess: (d) => toast.success(`Generated ${d.count} monthly invoice(s)`),
      onError: (e) => toast.error(e.message),
    });
  };

  const uniqueStatuses = [...new Set(invoices.map(i => i.status))];
  const uniqueCompanies = [...new Map(invoices.map(i => [i.company_id, i.company_name])).entries()];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSuperAdmin ? "Billing & Invoices" : "My Invoices"}
        description={isSuperAdmin ? "Invoice generation, payment tracking, and collections management" : "View your company invoices and payment history"}
        actions={isSuperAdmin ? (
          <Button onClick={handleGenerateMonthly} disabled={generateMonthly.isPending}>
            <CalendarDays className="h-4 w-4 mr-2" />
            {generateMonthly.isPending ? 'Generating...' : 'Generate Monthly Invoices'}
          </Button>
        ) : undefined}
      />

      {/* KPI Cards */}
      <div className={`grid gap-4 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
        <StatCard icon={DollarSign} label="Outstanding Balance" value={fmt(totalAR)} />
        <StatCard icon={TrendingUp} label="Paid This Month" value={fmt(paidThisMonth)} iconColor="bg-green-100 dark:bg-green-900/30" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueInvoices.length} iconColor="bg-destructive/10" />
        {isSuperAdmin && <StatCard icon={XCircle} label="NSF Cases Open" value={openNsf.length} iconColor="bg-red-100 dark:bg-red-900/30" />}
        {isSuperAdmin && <StatCard icon={FileText} label="Generated Today" value={invoicesToday.length} />}
      </div>

      {/* Wire Instructions for Client Admins */}
      {!isSuperAdmin && <WireInstructionsCard />}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="overdue" className="relative">
              Overdue / Failed
              {overdueInvoices.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-4 w-4">{overdueInvoices.length}</span>
              )}
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="nsf" className="relative">
              NSF Cases
              {openNsf.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] h-4 w-4">{openNsf.length}</span>
              )}
            </TabsTrigger>
          )}
          {isSuperAdmin && <TabsTrigger value="ar">Client AR Summary</TabsTrigger>}
        </TabsList>

        {/* ─── All Invoices Tab ─── */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by company or invoice #..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="off_cycle">Off-Cycle</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSuperAdmin && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Card className="shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Invoice #</th>
                    {isSuperAdmin && <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>}
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Balance</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Due Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">EEs</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Loading invoices...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-8 text-center text-muted-foreground">{isSuperAdmin ? 'No invoices found. Click "Generate Monthly Invoices" to create invoices for all active clients.' : 'No invoices found.'}</td></tr>
                  ) : filtered.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-xs">{inv.invoice_number}</td>
                      {isSuperAdmin && <td className="px-4 py-3">{inv.company_name}</td>}
                      <td className="px-4 py-3">
                        <Badge variant={inv.invoice_type === 'payroll' ? 'default' : 'secondary'} className="text-xs capitalize">
                          {inv.invoice_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{fmt(inv.total_cents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {inv.balance_due_cents > 0 ? (
                          <span className="text-destructive font-medium">{fmt(inv.balance_due_cents)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3 tabular-nums">{inv.employee_count}</td>
                      <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedInvoice(inv)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isSuperAdmin && inv.status !== 'paid' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              updateStatus.mutate({ id: inv.id, status: 'paid' }, {
                                onSuccess: () => toast.success('Marked as paid'),
                                onError: (e) => toast.error(e.message),
                              });
                            }}>
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Overdue / Failed Tab ─── */}
        <TabsContent value="overdue" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Overdue & Failed Payment Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No overdue or failed invoices 🎉</p>
              ) : (
                <div className="space-y-3">
                  {overdueInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground">{inv.invoice_number} · Due {fmtDate(inv.due_date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums text-destructive">{fmt(inv.balance_due_cents)}</span>
                        <InvoiceStatusBadge status={inv.status} />
                        <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)}>View</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          updateStatus.mutate({ id: inv.id, status: 'paid' }, {
                            onSuccess: () => toast.success('Marked paid'),
                          });
                        }}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Paid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── NSF Cases Tab ─── */}
        <TabsContent value="nsf" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                NSF / Failed Payment Cases ({nsfEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nsfEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No NSF cases</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Case ID</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Fee</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Retries</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {nsfEvents.map(nsf => (
                        <tr key={nsf.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{nsf.id.slice(0, 8)}</td>
                          <td className="px-3 py-2">{nsf.company_id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(nsf.amount_cents)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(nsf.fee_cents)}</td>
                          <td className="px-3 py-2 capitalize">{nsf.failure_type || 'nsf'}</td>
                          <td className="px-3 py-2 tabular-nums">{nsf.retry_count}/3</td>
                          <td className="px-3 py-2"><InvoiceStatusBadge status={nsf.status} /></td>
                          <td className="px-3 py-2 text-muted-foreground">{fmtDate(nsf.created_at)}</td>
                          <td className="px-3 py-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedNsf(nsf)}>Manage</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Client AR Summary Tab ─── */}
        <TabsContent value="ar" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Accounts Receivable by Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Group invoices by company
                const arByCompany = new Map<string, { name: string; total: number; pastDue: number; count: number; riskStatus: string }>();
                for (const inv of invoices) {
                  if (['paid', 'written_off'].includes(inv.status)) continue;
                  const existing = arByCompany.get(inv.company_id) || { name: inv.company_name, total: 0, pastDue: 0, count: 0, riskStatus: 'none' };
                  existing.total += inv.balance_due_cents;
                  existing.count += 1;
                  if (['past_due', 'failed_payment', 'nsf_returned', 'in_collections'].includes(inv.status)) {
                    existing.pastDue += inv.balance_due_cents;
                  }
                  const profile = billingProfiles.find(bp => bp.company_id.toString() === inv.company_id);
                  if (profile) existing.riskStatus = profile.nsf_risk_status;
                  arByCompany.set(inv.company_id, existing);
                }
                const entries = Array.from(arByCompany.entries()).sort((a, b) => b[1].total - a[1].total);

                if (entries.length === 0) {
                  return <p className="text-sm text-muted-foreground py-4 text-center">No outstanding balances</p>;
                }

                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Client</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Outstanding</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Past Due</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Invoices</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Risk</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {entries.map(([companyId, data]) => (
                        <tr key={companyId} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{data.name}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(data.total)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {data.pastDue > 0 ? <span className="text-destructive font-medium">{fmt(data.pastDue)}</span> : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{data.count}</td>
                          <td className="px-3 py-2">
                            {data.riskStatus !== 'none' ? (
                              <Badge variant="destructive" className="text-xs capitalize">{data.riskStatus}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Normal</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setCompanyFilter(companyId);
                              // switch to invoices tab programmatically via DOM
                              document.querySelector<HTMLButtonElement>('[data-state][value="invoices"]')?.click();
                            }}>View Invoices</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InvoiceDetailDialog invoice={selectedInvoice} open={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      <NsfDetailDialog nsfCase={selectedNsf} open={!!selectedNsf} onClose={() => setSelectedNsf(null)} />
    </div>
  );
}
