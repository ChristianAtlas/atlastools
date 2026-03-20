import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { BILLING_TIERS, PAYROLL_MARKUPS } from '@/lib/billing-config';
import { invoices as mockInvoices } from '@/lib/mock-data';
import { companies, employees, payrollRuns } from '@/lib/mock-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, FileText, Calculator, Users, TrendingUp, AlertTriangle } from 'lucide-react';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const formatCurrencyCents = (cents: number) => formatCurrency(cents / 100);

// Simulated invoice generation using mock data + billing tiers
function generateMockInvoice(companyId: string, tierSlug: string, addons: string[]) {
  const company = companies.find(c => c.id === companyId);
  if (!company) return null;

  const tier = BILLING_TIERS[tierSlug as keyof typeof BILLING_TIERS];
  if (!tier) return null;

  const empCount = employees.filter(e => e.companyId === companyId && e.status === 'active').length;
  const companyPayrolls = payrollRuns.filter(pr => pr.companyId === companyId);

  const lineItems: Array<{ description: string; qty: number; unitCents: number; totalCents: number; isMarkup: boolean }> = [];

  // Base plan
  const baseQty = tier.perEmployee ? empCount : 1;
  lineItems.push({
    description: `${tier.name} × ${baseQty} ${tier.perEmployee ? 'employees' : ''}`,
    qty: baseQty,
    unitCents: tier.pricePerEmployee * 100,
    totalCents: tier.pricePerEmployee * 100 * baseQty,
    isMarkup: false,
  });

  // Monthly service charge
  const svc = BILLING_TIERS.monthly_service;
  lineItems.push({
    description: svc.name,
    qty: 1,
    unitCents: svc.pricePerEmployee * 100,
    totalCents: svc.pricePerEmployee * 100,
    isMarkup: false,
  });

  // Add-ons
  for (const slug of addons) {
    const addon = BILLING_TIERS[slug as keyof typeof BILLING_TIERS];
    if (addon && addon.isAddon) {
      const qty = addon.perEmployee ? empCount : 1;
      lineItems.push({
        description: `${addon.name} × ${qty} ${addon.perEmployee ? 'employees' : ''}`,
        qty,
        unitCents: addon.pricePerEmployee * 100,
        totalCents: addon.pricePerEmployee * 100 * qty,
        isMarkup: false,
      });
    }
  }

  // Payroll markups
  for (const pr of companyPayrolls) {
    const grossCents = Math.round(pr.grossPay * 100);
    const general = Math.round(grossCents * PAYROLL_MARKUPS.general.rate);
    const sui = Math.round(grossCents * PAYROLL_MARKUPS.sui.rate);

    lineItems.push({
      description: `General Markup (${PAYROLL_MARKUPS.general.rate * 100}%) — ${pr.payPeriodStart} to ${pr.payPeriodEnd}`,
      qty: 1,
      unitCents: general,
      totalCents: general,
      isMarkup: true,
    });
    lineItems.push({
      description: `SUI Markup (${PAYROLL_MARKUPS.sui.rate * 100}%) — ${pr.payPeriodStart} to ${pr.payPeriodEnd}`,
      qty: 1,
      unitCents: sui,
      totalCents: sui,
      isMarkup: true,
    });
  }

  const subtotal = lineItems.filter(li => !li.isMarkup).reduce((s, li) => s + li.totalCents, 0);
  const markup = lineItems.filter(li => li.isMarkup).reduce((s, li) => s + li.totalCents, 0);

  return { company, lineItems, subtotal, markup, total: subtotal + markup, empCount };
}

export default function Invoices() {
  const [selectedCompany, setSelectedCompany] = useState('c1');
  const [selectedTier, setSelectedTier] = useState('peo_basic');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const preview = useMemo(
    () => generateMockInvoice(selectedCompany, selectedTier, selectedAddons),
    [selectedCompany, selectedTier, selectedAddons]
  );

  const toggleAddon = (slug: string) => {
    setSelectedAddons(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const addonTiers = Object.entries(BILLING_TIERS).filter(([, t]) => t.isAddon);
  const planTiers = Object.entries(BILLING_TIERS).filter(([, t]) => !t.isAddon && t.slug !== 'monthly_service');

  // Summary stats from mock invoices
  const totalOutstanding = mockInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const totalPaid = mockInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const overdueCount = mockInvoices.filter(i => i.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Invoices" description="Invoice generation, pricing tiers, and markup calculations" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in-up stagger-1">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--success))]/10">
              <TrendingUp className="h-5 w-5 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Collected This Month</p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--warning))]/10">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-xl font-semibold tabular-nums">{overdueCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-xl font-semibold tabular-nums">{mockInvoices.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="animate-in-up stagger-2">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="calculator">Invoice Calculator</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Tiers</TabsTrigger>
        </TabsList>

        {/* Invoices Table */}
        <TabsContent value="invoices">
          <Card className="shadow-sm">
            <div className="overflow-hidden rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Invoice</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Due Date</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mockInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-medium">{inv.id.toUpperCase()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.companyName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                          {inv.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.dueDate}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Invoice Calculator */}
        <TabsContent value="calculator">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Configuration */}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4" /> Configure Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {planTiers.map(([slug, tier]) => (
                        <SelectItem key={slug} value={slug}>
                          {tier.name} — ${tier.pricePerEmployee}/ee/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Add-ons</label>
                  <div className="space-y-2">
                    {addonTiers.map(([slug, tier]) => (
                      <label key={slug} className="flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedAddons.includes(slug)}
                          onChange={() => toggleAddon(slug)}
                          className="rounded border-input"
                        />
                        <span className="text-sm flex-1">{tier.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          ${tier.pricePerEmployee}/{tier.perEmployee ? 'ee' : 'mo'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Users className="h-4 w-4" />
                  <span>
                    {preview?.empCount ?? 0} active employees for{' '}
                    {companies.find(c => c.id === selectedCompany)?.name}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="shadow-sm lg:col-span-3">
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Invoice Preview</CardTitle>
                <Button size="sm" onClick={() => setShowPreview(true)} disabled={!preview}>
                  View Full Invoice
                </Button>
              </CardHeader>
              <CardContent>
                {preview ? (
                  <div className="space-y-4">
                    {/* Service charges */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Service Charges
                      </p>
                      <div className="space-y-1.5">
                        {preview.lineItems.filter(li => !li.isMarkup).map((li, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{li.description}</span>
                            <span className="font-medium tabular-nums">{formatCurrencyCents(li.totalCents)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payroll markups */}
                    {preview.lineItems.some(li => li.isMarkup) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Payroll Markups
                        </p>
                        <div className="space-y-1.5">
                          {preview.lineItems.filter(li => li.isMarkup).map((li, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{li.description}</span>
                              <span className="font-medium tabular-nums">{formatCurrencyCents(li.totalCents)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal (services)</span>
                        <span className="tabular-nums">{formatCurrencyCents(preview.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payroll markups</span>
                        <span className="tabular-nums">{formatCurrencyCents(preview.markup)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold pt-1 border-t">
                        <span>Total</span>
                        <span className="tabular-nums">{formatCurrencyCents(preview.total)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a company and plan to preview.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pricing Tiers */}
        <TabsContent value="pricing">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(BILLING_TIERS).map(([slug, tier]) => (
              <Card key={slug} className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                    {tier.isAddon && <Badge variant="secondary" className="text-xs">Add-on</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">${tier.pricePerEmployee}</span>
                    <span className="text-sm text-muted-foreground">
                      /{tier.perEmployee ? 'employee' : 'month'}
                      {tier.perEmployee ? '/month' : ''}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {slug === 'contractors' ? 'Per paid contractor per month' :
                     tier.perEmployee ? 'Per active employee per month' :
                     'Flat monthly platform fee'}
                  </p>
                </CardContent>
              </Card>
            ))}

            {/* Markup rates card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payroll Markups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(PAYROLL_MARKUPS).map(([key, m]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                    <span className="text-lg font-bold tabular-nums">{(m.rate * 100).toFixed(1)}%</span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Applied to gross wages on each payroll run
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Full Invoice Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              {preview?.company.name} — Monthly billing breakdown
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Company</span><span className="font-medium text-foreground">{preview.company.name}</span>
                <span>Active Employees</span><span className="font-medium text-foreground">{preview.empCount}</span>
                <span>Plan</span><span className="font-medium text-foreground">{BILLING_TIERS[selectedTier as keyof typeof BILLING_TIERS]?.name}</span>
              </div>

              <div className="border-t pt-3 space-y-2">
                {preview.lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between">
                    <span className={li.isMarkup ? 'text-muted-foreground italic' : 'text-muted-foreground'}>
                      {li.description}
                    </span>
                    <span className="font-medium tabular-nums">{formatCurrencyCents(li.totalCents)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 flex justify-between text-base font-semibold">
                <span>Total Due</span>
                <span className="tabular-nums">{formatCurrencyCents(preview.total)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
            <Button>Generate & Send via Stripe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
