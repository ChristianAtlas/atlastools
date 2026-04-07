import { Building2, Users, DollarSign, ClipboardList, ArrowRight, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useComplianceItems } from '@/hooks/useCompliance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CLIENT_REPORTING_STATES } from '@/hooks/useTaxManagement';

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

  // Fetch client SUI rates to detect missing state registrations
  const { data: clientSuiRates = [] } = useQuery({
    queryKey: ['client_sui_rates_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_sui_rates')
        .select('company_id, state_code, effective_date');
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const pendingPayrolls = payrollRuns.filter(p => PENDING_STATUSES.includes(p.status)).length;

  // === Task calculations ===
  const openComplianceTasks = complianceItems.filter(
    t => t.status === 'pending' || t.status === 'overdue' || t.status === 'in_progress'
  ).length;

  // Employees still onboarding
  const onboardingEmployees = employees.filter(e => e.status === 'onboarding').length;

  // Employees missing SSN
  const missingSsnCount = employees.filter(
    e => (e.status === 'active' || e.status === 'onboarding') && !e.ssn_encrypted
  ).length;

  // SUI missing registrations: companies with employees in client-reporting states but no rate on file
  const today = new Date().toISOString().slice(0, 10);
  const coveredPairs = new Set(
    clientSuiRates
      .filter(r => r.effective_date <= today)
      .map(r => `${r.company_id}_${r.state_code}`)
  );
  const missingPairs = new Set<string>();
  for (const emp of employees) {
    if (!emp.state || !emp.company_id) continue;
    if (emp.status !== 'active' && emp.status !== 'onboarding') continue;
    const st = emp.state.toUpperCase();
    if (!CLIENT_REPORTING_STATES.includes(st as any)) continue;
    const key = `${emp.company_id}_${st}`;
    if (!coveredPairs.has(key)) missingPairs.add(key);
  }
  const missingSuiCount = missingPairs.size;

  const totalTasks = openComplianceTasks + onboardingEmployees + missingSsnCount + missingSuiCount;

  const taskBreakdown = [
    { label: 'Compliance tasks', count: openComplianceTasks },
    { label: 'Employees onboarding', count: onboardingEmployees },
    { label: 'Missing SSN', count: missingSsnCount },
    { label: 'Missing SUI registrations', count: missingSuiCount },
  ].filter(b => b.count > 0);

  const activeRuns = payrollRuns
    .filter(p => p.status !== 'completed' && p.status !== 'voided')
    .slice(0, 4);

  const isLoading = loadingCo || loadingEmp || loadingPR;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your platform activity" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} title="Active Companies" value={isLoading ? '…' : String(activeCompanies)} delay={0} href="/companies" />
        <StatCard icon={Users} title="Total Employees" value={isLoading ? '…' : String(activeEmployees)} delay={60} href="/employees" />
        <StatCard icon={DollarSign} title="Pending Payrolls" value={isLoading ? '…' : String(pendingPayrolls)} delay={120} href="/payroll" />
        <StatCard
          icon={ClipboardList}
          title="Open Tasks"
          value={isLoading ? '…' : String(totalTasks)}
          changeType={totalTasks > 0 ? 'negative' : 'neutral'}
          change={totalTasks > 0 ? 'Requires attention' : 'All clear'}
          delay={180}
          href="/compliance"
          breakdown={taskBreakdown}
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
