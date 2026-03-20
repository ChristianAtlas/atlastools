import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { invoices } from '@/lib/mock-data';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function Invoices() {
  return (
    <div className="space-y-5">
      <PageHeader title="Invoices" description="Billing and payment tracking" />

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-1">
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
            {invoices.map(inv => (
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
    </div>
  );
}
