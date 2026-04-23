import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Shield, Users, Receipt, Search, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import {
  useWCAssignments,
  useWCCodes,
  useWCInvoiceItems,
  useWCPayrollCalcs,
  centsToUSD,
} from '@/hooks/useWorkersComp';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';

/**
 * Client-facing Workers' Comp summary.
 *
 * Privacy contract (must NEVER expose to client):
 *   - rate_per_hundred / rate_basis
 *   - internal_markup_rate / markup_rate / markup_cents
 *   - base_premium_cents
 * Anything we render here uses ONLY total_charge_cents and assignment metadata.
 */
export default function ClientWorkersComp() {
  const { profile, isClientAdmin, isSuperAdmin } = useAuth();
  const companyId = profile?.company_id ?? undefined;

  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const { data: employees = [] } = useEmployees(companyId);
  const { data: assignments = [] } = useWCAssignments(companyId);
  const { data: codes = [] } = useWCCodes();
  const { data: invoiceItems = [] } = useWCInvoiceItems(companyId);
  const { data: calcs = [] } = useWCPayrollCalcs(undefined, companyId);
  const { data: runs = [] } = usePayrollRuns(companyId);

  // Only client admins (or super-admins reviewing) hit this view.
  // Guards live AFTER hooks so hook order stays stable across renders.
  const accessDenied = !isClientAdmin && !isSuperAdmin;

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const codeMap = useMemo(() => new Map(codes.map((c) => [c.id, c])), [codes]);
  const runMap = useMemo(() => new Map(runs.map((r) => [r.id, r])), [runs]);

  // Covered employees (have an active assignment OR are flagged exempt)
  const covered = useMemo(() => {
    const activeAssigns = assignments.filter((a) => a.is_active);
    const assignedByEmp = new Map(activeAssigns.map((a) => [a.employee_id, a]));
    return employees
      .filter((e: any) => e.status === 'active' && !e.deleted_at)
      .map((e: any) => {
        const a = assignedByEmp.get(e.id);
        const code = a ? codeMap.get(a.wc_code_id) : null;
        return {
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          mid: e.mid,
          title: e.title || '—',
          status: e.wc_exempt
            ? 'exempt'
            : a
            ? 'covered'
            : 'missing',
          wcCode: code?.code ?? null,
          wcDescription: code?.description ?? null,
          effectiveDate: a?.effective_date ?? null,
          isOwnerOfficer: !!e.is_owner_officer,
          exemptReason: e.wc_exempt_reason ?? null,
        };
      });
  }, [employees, assignments, codeMap]);

  // Period options derived from invoice items (one per payroll run)
  const periodOptions = useMemo(() => {
    const opts = invoiceItems
      .map((item) => {
        const run = runMap.get(item.payroll_run_id);
        return run
          ? {
              id: run.id,
              label: `${format(new Date(run.pay_date), 'MMM d, yyyy')} (${run.pay_period_start} – ${run.pay_period_end})`,
              pay_date: run.pay_date,
            }
          : null;
      })
      .filter(Boolean) as Array<{ id: string; label: string; pay_date: string }>;
    return opts.sort((a, b) => b.pay_date.localeCompare(a.pay_date));
  }, [invoiceItems, runMap]);

  // Aggregate totals (client-safe: only total_charge_cents)
  const totals = useMemo(() => {
    const filteredItems =
      periodFilter === 'all'
        ? invoiceItems
        : invoiceItems.filter((i) => i.payroll_run_id === periodFilter);
    const totalCharge = filteredItems.reduce((s, i) => s + i.total_charge_cents, 0);
    const employeeCount = filteredItems.reduce((s, i) => s + i.employee_count, 0);
    return {
      totalCharge,
      employeeCount,
      payrollCount: filteredItems.length,
    };
  }, [invoiceItems, periodFilter]);

  // Per-employee charges (client-safe: only total_charge_cents)
  const perEmployeeCharges = useMemo(() => {
    const filteredCalcs =
      periodFilter === 'all'
        ? calcs
        : calcs.filter((c) => c.payroll_run_id === periodFilter);
    const byEmp = new Map<
      string,
      { total: number; runs: number; lastPayDate: string | null; codes: Set<string> }
    >();
    for (const c of filteredCalcs) {
      const cur = byEmp.get(c.employee_id) ?? {
        total: 0,
        runs: 0,
        lastPayDate: null,
        codes: new Set<string>(),
      };
      cur.total += c.total_charge_cents;
      cur.runs += 1;
      if (c.wc_code) cur.codes.add(c.wc_code);
      const run = runMap.get(c.payroll_run_id);
      if (run && (!cur.lastPayDate || run.pay_date > cur.lastPayDate)) {
        cur.lastPayDate = run.pay_date;
      }
      byEmp.set(c.employee_id, cur);
    }
    return Array.from(byEmp.entries())
      .map(([empId, agg]) => {
        const emp = empMap.get(empId);
        return {
          id: empId,
          name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
          mid: emp?.mid ?? '—',
          codes: Array.from(agg.codes).join(', ') || '—',
          runs: agg.runs,
          lastPayDate: agg.lastPayDate,
          total: agg.total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [calcs, periodFilter, empMap, runMap]);

  // Per-payroll history
  const payrollHistory = useMemo(() => {
    return invoiceItems
      .map((item) => {
        const run = runMap.get(item.payroll_run_id);
        return {
          id: item.id,
          payroll_run_id: item.payroll_run_id,
          pay_date: run?.pay_date ?? null,
          period: run
            ? `${format(new Date(run.pay_period_start), 'MMM d')} – ${format(
                new Date(run.pay_period_end),
                'MMM d, yyyy',
              )}`
            : '—',
          employee_count: item.employee_count,
          total_charge_cents: item.total_charge_cents,
        };
      })
      .sort((a, b) =>
        (b.pay_date ?? '').localeCompare(a.pay_date ?? ''),
      );
  }, [invoiceItems, runMap]);

  const filteredCovered = covered.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.wcCode ?? '').toLowerCase().includes(q) ||
      (c.title ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers' Compensation"
        description="Covered employees, code assignments, and total charges billed on each payroll. Rates and policy details are managed by AtlasOne HR."
      />

      {/* Headline stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Covered employees"
          value={covered.filter((c) => c.status === 'covered').length.toString()}
          change={`${covered.filter((c) => c.status === 'exempt').length} exempt · ${covered.filter((c) => c.status === 'missing').length} pending`}
          icon={Users}
        />
        <StatCard
          title={periodFilter === 'all' ? 'Total WC charged YTD' : 'WC charged (selected period)'}
          value={centsToUSD(totals.totalCharge)}
          change={`${totals.payrollCount} payroll${totals.payrollCount === 1 ? '' : 's'}`}
          icon={Receipt}
        />
        <StatCard
          title="Active policy"
          value="AtlasOne PEO"
          change="Coverage administered by AtlasOne HR"
          icon={ShieldCheck}
        />
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="employees">Covered Employees</TabsTrigger>
          <TabsTrigger value="charges">Per-Employee Charges</TabsTrigger>
          <TabsTrigger value="history">Payroll History</TabsTrigger>
        </TabsList>

        {/* Covered employees */}
        <TabsContent value="employees" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Workers' Comp coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>WC Class Code</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCovered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCovered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.title}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {c.wcCode
                            ? `${c.wcCode} — ${c.wcDescription}`
                            : c.status === 'exempt'
                            ? '—'
                            : <span className="text-destructive">Not assigned</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {c.effectiveDate
                            ? format(new Date(c.effectiveDate), 'MMM d, yyyy')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {c.status === 'covered' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-500 text-emerald-600"
                            >
                              Covered
                            </Badge>
                          )}
                          {c.status === 'exempt' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500 text-amber-600"
                            >
                              {c.isOwnerOfficer ? 'Owner / Officer · Exempt' : 'Exempt'}
                            </Badge>
                          )}
                          {c.status === 'missing' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-destructive text-destructive"
                            >
                              Pending assignment
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per-employee charges */}
        <TabsContent value="charges" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="All payroll periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payroll periods (YTD)</SelectItem>
                {periodOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Pay date {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Showing total charges only. Rates and internal calculations are not displayed.
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Class Code(s)</TableHead>
                    <TableHead className="text-right">Payrolls</TableHead>
                    <TableHead className="text-right">Last Pay Date</TableHead>
                    <TableHead className="text-right">Total WC Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perEmployeeCharges.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No WC charges in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {perEmployeeCharges.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-sm">
                            {row.name}
                            <span className="ml-2 text-xs text-muted-foreground font-mono">
                              {row.mid}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.codes}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.runs}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                            {row.lastPayDate
                              ? format(new Date(row.lastPayDate), 'MMM d, yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {centsToUSD(row.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {centsToUSD(
                            perEmployeeCharges.reduce((s, r) => s + r.total, 0),
                          )}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll history */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> WC charges by payroll
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Total WC Charged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollHistory.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No payroll WC charges yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {payrollHistory.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm tabular-nums">
                            {row.pay_date
                              ? format(new Date(row.pay_date), 'MMM d, yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.period}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.employee_count}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium tabular-nums">
                            {centsToUSD(row.total_charge_cents)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell colSpan={2}>Total YTD</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {payrollHistory.reduce((s, r) => s + r.employee_count, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {centsToUSD(
                            payrollHistory.reduce(
                              (s, r) => s + r.total_charge_cents,
                              0,
                            ),
                          )}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
