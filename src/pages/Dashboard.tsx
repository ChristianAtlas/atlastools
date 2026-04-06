import { Building2, Users, DollarSign, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useComplianceItems } from '@/hooks/useCompliance';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const PENDING_STATUSES = [
  'draft', 'time_review', 'editing', 'preview',
  'pending_client_approval', 'awaiting_approval',
  'open', 'open_for_timecards', 'awaiting_timecard_approval',
  'timecards_approved',
];

export default function Dashboard() {
  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const { data: employees = [], isLoading: loadingEmp } = useEmployees();
  const { data: payrollRuns = [], isLoading: loadingPR } = usePayrollRuns();
  const { data: auditLogs = [], isLoading: loadingAudit } = useAuditLogs({ limit: 5 });
  const { data: complianceItems = [] } = useComplianceItems();

  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const pendingPayrolls = payrollRuns.filter(p => PENDING_STATUSES.includes(p.status)).length;
  const overdueCompliance = complianceItems.filter(t => t.status === 'overdue').length;

  const activeRuns = payrollRuns
    .filter(p => p.status !== 'completed' && p.status !== 'voided')
    .slice(0, 4);

  const isLoading = loadingCo || loadingEmp || loadingPR;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your platform activity" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} title="Active Companies" value={isLoading ? '…' : String(activeCompanies)} delay={0} />
        <StatCard icon={Users} title="Total Employees" value={isLoading ? '…' : String(activeEmployees)} delay={60} />
        <StatCard icon={DollarSign} title="Pending Payrolls" value={isLoading ? '…' : String(pendingPayrolls)} delay={120} />
        <StatCard
          icon={AlertTriangle}
          title="Overdue Tasks"
          value={isLoading ? '…' : String(overdueCompliance)}
          changeType={overdueCompliance > 0 ? 'negative' : 'neutral'}
          change={overdueCompliance > 0 ? 'Requires attention' : 'All clear'}
          delay={180}
        />
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
            {loadingPR ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeRuns.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">No active payroll runs</p>
            ) : (
              activeRuns.map(run => (
                <div key={run.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{run.companies?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.employee_count} employees · Pay date {run.pay_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(run.gross_pay_cents / 100)}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-card shadow-sm animate-in-up stagger-3">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <Link to="/audit-log" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {loadingAudit ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : (
              auditLogs.map(entry => (
                <div key={entry.id} className="px-5 py-3">
                  <p className="text-sm">
                    <span className="font-medium">{entry.user_email ?? 'System'}</span>
                    <span className="text-muted-foreground"> {entry.action.toLowerCase()} </span>
                    <span className="font-medium">{entry.table_name} #{entry.record_id.slice(0, 8)}</span>
                  </p>
                  {entry.changed_fields && entry.changed_fields.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Changed: {entry.changed_fields.join(', ')}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(entry.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
