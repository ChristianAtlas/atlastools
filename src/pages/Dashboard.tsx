import { Building2, Users, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { payrollRuns, complianceTasks, companies, employees, auditLog } from '@/lib/mock-data';
import { Link } from 'react-router-dom';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const pendingPayrolls = payrollRuns.filter(p => ['draft', 'in_review', 'pending_approval'].includes(p.status)).length;
  const overdueCompliance = complianceTasks.filter(t => t.status === 'overdue').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your platform activity" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} title="Active Companies" value={String(companies.filter(c => c.status === 'active').length)} change="+1 this month" changeType="positive" delay={0} />
        <StatCard icon={Users} title="Total Employees" value={String(activeEmployees)} change="+3 this period" changeType="positive" delay={60} />
        <StatCard icon={DollarSign} title="Pending Payrolls" value={String(pendingPayrolls)} delay={120} />
        <StatCard icon={AlertTriangle} title="Overdue Tasks" value={String(overdueCompliance)} changeType={overdueCompliance > 0 ? 'negative' : 'neutral'} change={overdueCompliance > 0 ? 'Requires attention' : 'All clear'} delay={180} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Payroll Runs */}
        <div className="rounded-lg border bg-card shadow-sm animate-in-up stagger-2">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Active Payroll Runs</h2>
            <Link to="/payroll" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {payrollRuns.filter(p => p.status !== 'completed').slice(0, 4).map(run => (
              <div key={run.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{run.companyName}</p>
                  <p className="text-xs text-muted-foreground">{run.employeeCount} employees · Pay date {run.payDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(run.grossPay)}</span>
                  <StatusBadge status={run.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance / Recent Activity */}
        <div className="rounded-lg border bg-card shadow-sm animate-in-up stagger-3">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Link to="/audit-log" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {auditLog.slice(0, 5).map(entry => (
              <div key={entry.id} className="px-5 py-3">
                <p className="text-sm">
                  <span className="font-medium">{entry.userName}</span>
                  <span className="text-muted-foreground"> {entry.action.toLowerCase()} </span>
                  <span className="font-medium">{entry.entity} #{entry.entityId}</span>
                </p>
                {entry.changes && <p className="text-xs text-muted-foreground mt-0.5">{entry.changes}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
