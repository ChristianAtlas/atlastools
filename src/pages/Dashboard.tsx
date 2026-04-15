import { Building2, Users, DollarSign, ClipboardList, ArrowRight, Loader2, MoreHorizontal, AlertCircle, UserPlus, KeyRound, FileWarning, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayrollRuns, type PayrollRunRow } from '@/hooks/usePayrollRuns';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useComplianceItems } from '@/hooks/useCompliance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CLIENT_REPORTING_STATES } from '@/hooks/useTaxManagement';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const formatCurrencyShort = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const PENDING_STATUSES = [
  'draft', 'time_review', 'editing', 'preview',
  'pending_client_approval', 'awaiting_approval',
  'open', 'open_for_timecards', 'awaiting_timecard_approval',
  'timecards_approved',
];

const COMPLETED_STATUSES = ['completed', 'paid', 'processing', 'funded'];

/* ── Donut chart for last payroll ── */
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function LastPayrollDonut({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const radius = 70;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
        {total === 0 ? (
          <circle cx="100" cy="100" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        ) : (
          segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const offset = -(cumulative / total) * circumference;
            cumulative += seg.value;
            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            );
          })
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-bold tabular-nums">{formatCurrency(total / 100)}</span>
        <span className="text-[11px] text-muted-foreground">Cash required</span>
      </div>
    </div>
  );
}

function LastPayrollCard({ run }: { run: PayrollRunRow }) {
  const netPay = run.net_pay_cents;
  const taxes = (run.employer_taxes_cents ?? 0);
  const wc = run.workers_comp_cents;
  const benefits = run.employer_benefits_cents;
  const total = run.total_employer_cost_cents || (netPay + taxes + wc + benefits);

  const segments: DonutSegment[] = [
    { label: 'Net Pay', value: netPay, color: 'hsl(262, 60%, 45%)' },
    { label: 'Taxes', value: taxes, color: 'hsl(262, 50%, 60%)' },
    { label: "Workers' Comp", value: wc, color: 'hsl(262, 40%, 72%)' },
    { label: 'ER Benefits', value: benefits, color: 'hsl(262, 35%, 82%)' },
  ].filter(s => s.value > 0);

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const fmtShort = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="rounded-lg border bg-card shadow-sm animate-in-up stagger-2">
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="text-sm font-semibold">Last payroll</h2>
        <Link to="/payroll" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-5 space-y-5">
        {/* Info boxes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Check date</p>
            <p className="text-sm font-medium">{fmtDate(run.pay_date)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Pay period</p>
            <p className="text-sm font-medium">{fmtShort(run.pay_period_start)} – {fmtShort(run.pay_period_end)}</p>
          </div>
        </div>

        {/* Donut */}
        <LastPayrollDonut segments={segments} total={total} />

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-muted-foreground truncate">{seg.label}</span>
              <span className="ml-auto font-medium tabular-nums">{formatCurrencyShort(seg.value / 100)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
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

  const onboardingEmployees = employees.filter(e => e.status === 'onboarding').length;

  const missingSsnCount = employees.filter(
    e => (e.status === 'active' || e.status === 'onboarding') && !e.ssn_encrypted
  ).length;

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

  // Last completed payroll for client admin card
  const lastCompletedRun = payrollRuns
    .filter(p => COMPLETED_STATUSES.includes(p.status))
    .sort((a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime())[0] ?? null;

  const isLoading = loadingCo || loadingEmp || loadingPR;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your platform activity" />

      <div className={cn('grid gap-4 sm:grid-cols-2', isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        {isSuperAdmin && (
          <StatCard icon={Building2} title="Active Companies" value={isLoading ? '…' : String(activeCompanies)} delay={0} href="/companies" />
        )}
        <StatCard icon={Users} title="Total Employees" value={isLoading ? '…' : String(activeEmployees)} delay={60} href="/employees" />
        <StatCard icon={DollarSign} title="Pending Payrolls" value={isLoading ? '…' : String(pendingPayrolls)} delay={120} href="/payroll" />
        {isSuperAdmin ? (
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
        ) : (
          <div
            className="rounded-lg border bg-card p-5 shadow-sm animate-in-up"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Open Tasks</p>
                <p className="text-2xl font-semibold tabular-nums">{isLoading ? '…' : String(totalTasks)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </div>
            {totalTasks === 0 ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span>All clear — no open tasks</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {openComplianceTasks > 0 && (
                  <li className="flex items-center gap-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-muted-foreground">Compliance tasks</span>
                    <span className="ml-auto font-semibold tabular-nums">{openComplianceTasks}</span>
                  </li>
                )}
                {onboardingEmployees > 0 && (
                  <li className="flex items-center gap-2 text-xs">
                    <UserPlus className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-muted-foreground">Employees onboarding</span>
                    <span className="ml-auto font-semibold tabular-nums">{onboardingEmployees}</span>
                  </li>
                )}
                {missingSsnCount > 0 && (
                  <li className="flex items-center gap-2 text-xs">
                    <KeyRound className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-muted-foreground">Missing SSN</span>
                    <span className="ml-auto font-semibold tabular-nums">{missingSsnCount}</span>
                  </li>
                )}
                {missingSuiCount > 0 && (
                  <li className="flex items-center gap-2 text-xs">
                    <FileWarning className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-muted-foreground">Missing SUI registrations</span>
                    <span className="ml-auto font-semibold tabular-nums">{missingSuiCount}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={cn('grid gap-6', !isSuperAdmin && lastCompletedRun ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        {/* Last Payroll — client admin only */}
        {!isSuperAdmin && lastCompletedRun && (
          <LastPayrollCard run={lastCompletedRun} />
        )}

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
                      {formatCurrencyShort(run.gross_pay_cents / 100)}
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