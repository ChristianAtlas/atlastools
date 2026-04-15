import { useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  BarChart3, Users, DollarSign, FileText, Download, TrendingUp, TrendingDown,
  AlertTriangle, Search, Filter, Building2, ShieldCheck, CreditCard, CalendarDays,
  ArrowUpRight, Clock, XCircle, Activity, Globe, Layers, Database, ChevronRight,
} from 'lucide-react';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import {
  useReportPayrollRuns, useReportEmployees, useReportInvoices,
  useReportComplianceItems, useReportNsfEvents, useReportPayrollRunEmployees,
  useReportComplianceLicenses, fmt, fmtDate,
} from '@/hooks/useReportingData';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';

/* ───── helpers ───── */
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
const startOfYear = new Date(now.getFullYear(), 0, 1);
const isAfter = (d: string, ref: Date) => new Date(d) >= ref;
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210,70%,55%)',
  'hsl(150,60%,45%)',
  'hsl(30,80%,55%)',
  'hsl(280,60%,55%)',
];

/* ───── MAIN ───── */
export default function Reports() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState(isSuperAdmin ? 'enterprise' : 'client');

  // Client admins only see their own company reports
  if (!isSuperAdmin) {
    return (
      <div className="space-y-5">
        <PageHeader title="Reports" description="View reports and analytics for your company" />
        <ClientReporting lockToOwnCompany />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Reporting" description="Enterprise analytics, client drill-downs, and custom report builder" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="enterprise"><BarChart3 className="h-4 w-4 mr-1.5" />Enterprise Dashboard</TabsTrigger>
          <TabsTrigger value="client"><Building2 className="h-4 w-4 mr-1.5" />Client Reporting</TabsTrigger>
          <TabsTrigger value="builder"><Database className="h-4 w-4 mr-1.5" />Report Builder & Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="enterprise"><EnterpriseDashboard /></TabsContent>
        <TabsContent value="client"><ClientReporting /></TabsContent>
        <TabsContent value="builder"><ReportBuilder /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. ENTERPRISE DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function EnterpriseDashboard() {
  const { data: payrollRuns = [] } = useReportPayrollRuns();
  const { data: employees = [] } = useReportEmployees();
  const { data: invoices = [] } = useReportInvoices();
  const { data: compliance = [] } = useReportComplianceItems();
  const { data: nsfEvents = [] } = useReportNsfEvents();
  const { data: companies = [] } = useCompanies();
  const { data: licenses = [] } = useReportComplianceLicenses();

  const activeEmps = employees.filter(e => e.status === 'active');
  const mtdRuns = payrollRuns.filter(r => isAfter(r.pay_date, startOfMonth));
  const ytdRuns = payrollRuns.filter(r => isAfter(r.pay_date, startOfYear));
  const mtdInvoices = invoices.filter(i => isAfter(i.created_at, startOfMonth));
  const newHiresMtd = employees.filter(e => isAfter(e.start_date, startOfMonth) && e.status === 'active');
  const termsMtd = employees.filter(e => e.termination_date && isAfter(e.termination_date, startOfMonth));
  const lateRuns = payrollRuns.filter(r => r.status === 'late_submission');
  const offCycleRuns = payrollRuns.filter(r => r.run_type === 'off_cycle');

  const totalPayrollMtd = mtdRuns.reduce((s, r) => s + (r.gross_pay_cents || 0), 0);
  const totalPayrollYtd = ytdRuns.reduce((s, r) => s + (r.gross_pay_cents || 0), 0);
  const totalInvoicedMtd = mtdInvoices.reduce((s, i) => s + (i.total_cents || 0), 0);
  const totalCollected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount_cents || 0), 0);
  const outstandingAR = invoices.reduce((s, i) => s + (i.balance_due_cents || 0), 0);
  const openNsf = nsfEvents.filter(n => !['resolved', 'closed'].includes(n.status));
  const complianceRisk = compliance.filter(c => c.blocker || c.risk_level === 'high');
  const expiredLicenses = licenses.filter(l => l.expiration_date && new Date(l.expiration_date) < now);

  // Payroll by month chart data
  const payrollByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    payrollRuns.forEach(r => {
      const m = r.pay_date?.slice(0, 7);
      if (m) map[m] = (map[m] || 0) + (r.gross_pay_cents || 0);
    });
    return Object.entries(map).sort().slice(-12).map(([m, v]) => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total: v / 100,
    }));
  }, [payrollRuns]);

  // Employee trend
  const empTrend = useMemo(() => {
    const map: Record<string, { hires: number; terms: number }> = {};
    employees.forEach(e => {
      const m = e.start_date?.slice(0, 7);
      if (m) {
        if (!map[m]) map[m] = { hires: 0, terms: 0 };
        map[m].hires++;
      }
      if (e.termination_date) {
        const tm = e.termination_date.slice(0, 7);
        if (!map[tm]) map[tm] = { hires: 0, terms: 0 };
        map[tm].terms++;
      }
    });
    return Object.entries(map).sort().slice(-12).map(([m, v]) => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      hires: v.hires,
      terminations: v.terms,
    }));
  }, [employees]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(i => {
      const m = i.created_at?.slice(0, 7);
      if (m) map[m] = (map[m] || 0) + (i.total_cents || 0);
    });
    return Object.entries(map).sort().slice(-12).map(([m, v]) => ({
      month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: v / 100,
    }));
  }, [invoices]);

  // Client breakdown
  const clientBreakdown = useMemo(() => {
    return companies.map(c => {
      const cRuns = payrollRuns.filter(r => r.company_id === c.id);
      const cInv = invoices.filter(i => i.company_id === c.id);
      const cEmps = employees.filter(e => e.company_id === c.id && e.status === 'active');
      const cComp = compliance.filter(ci => ci.company_id === c.id);
      const compScore = cComp.length ? Math.round(cComp.filter(ci => ci.status === 'completed').length / cComp.length * 100) : 100;
      return {
        id: c.id,
        name: c.name,
        employees: cEmps.length,
        payrollVolume: cRuns.reduce((s, r) => s + (r.gross_pay_cents || 0), 0),
        invoiceVolume: cInv.reduce((s, i) => s + (i.total_cents || 0), 0),
        arBalance: cInv.reduce((s, i) => s + (i.balance_due_cents || 0), 0),
        complianceScore: compScore,
      };
    }).sort((a, b) => b.payrollVolume - a.payrollVolume);
  }, [companies, payrollRuns, invoices, employees, compliance]);

  // State breakdown
  const stateBreakdown = useMemo(() => {
    const map: Record<string, { emps: number; payroll: number; flags: number }> = {};
    employees.filter(e => e.state && e.status === 'active').forEach(e => {
      const st = e.state!;
      if (!map[st]) map[st] = { emps: 0, payroll: 0, flags: 0 };
      map[st].emps++;
    });
    compliance.filter(c => c.state_code).forEach(c => {
      const st = c.state_code!;
      if (!map[st]) map[st] = { emps: 0, payroll: 0, flags: 0 };
      if (c.status !== 'completed') map[st].flags++;
    });
    return Object.entries(map).sort((a, b) => b[1].emps - a[1].emps).map(([state, v]) => ({
      state, ...v,
    }));
  }, [employees, compliance]);

  // Pay frequency breakdown
  const freqBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payrollRuns.forEach(r => {
      const f = r.pay_frequency || 'unknown';
      map[f] = (map[f] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace('_', '-'), value }));
  }, [payrollRuns]);

  return (
    <div className="space-y-6 animate-in-up">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <KpiCard icon={DollarSign} label="Payroll MTD" value={fmt(totalPayrollMtd)} sub={`YTD: ${fmt(totalPayrollYtd)}`} />
        <KpiCard icon={Activity} label="Payroll Runs" value={String(mtdRuns.length)} sub={`${lateRuns.length} late · ${offCycleRuns.length} off-cycle`} />
        <KpiCard icon={Users} label="Active Employees" value={String(activeEmps.length)} sub={`+${newHiresMtd.length} hires · -${termsMtd.length} terms MTD`} />
        <KpiCard icon={CreditCard} label="Invoiced MTD" value={fmt(totalInvoicedMtd)} sub={`Collected: ${fmt(totalCollected)}`} />
        <KpiCard icon={AlertTriangle} label="Outstanding AR" value={fmt(outstandingAR)} sub={`${openNsf.length} NSF cases`} accent />
        <KpiCard icon={ShieldCheck} label="Compliance Flags" value={String(complianceRisk.length)} sub={`${expiredLicenses.length} expired licenses`} accent={complianceRisk.length > 0} />
        <KpiCard icon={Building2} label="Active Clients" value={String(companies.filter(c => c.status === 'active').length)} sub={`of ${companies.length} total`} />
        <KpiCard icon={TrendingUp} label="Avg Payroll/Client" value={companies.length ? fmt(totalPayrollMtd / companies.length) : '$0'} sub="MTD" />
        <KpiCard icon={Users} label="Avg Emps/Client" value={companies.length ? String(Math.round(activeEmps.length / companies.length)) : '0'} />
        <KpiCard icon={DollarSign} label="Revenue/Employee" value={activeEmps.length ? fmt(Math.round(totalInvoicedMtd / activeEmps.length)) : '$0'} sub="MTD" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payroll Volume Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ChartContainer config={{ total: { label: 'Payroll', color: CHART_COLORS[0] } }}>
              <AreaChart data={payrollByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" className="text-[10px]" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} className="text-[10px]" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="total" fill="hsl(var(--primary)/0.15)" stroke="hsl(var(--primary))" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payroll by Frequency</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <ChartContainer config={{ value: { label: 'Runs' } }}>
              <PieChart>
                <Pie data={freqBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {freqBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hiring vs Terminations</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ChartContainer config={{ hires: { label: 'Hires', color: CHART_COLORS[3] }, terminations: { label: 'Terms', color: CHART_COLORS[4] } }}>
              <BarChart data={empTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" className="text-[10px]" />
                <YAxis className="text-[10px]" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hires" fill={CHART_COLORS[3]} radius={[3, 3, 0, 0]} />
                <Bar dataKey="terminations" fill={CHART_COLORS[4]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ChartContainer config={{ revenue: { label: 'Revenue', color: CHART_COLORS[2] } }}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" className="text-[10px]" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} className="text-[10px]" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Client Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Client</th>
                  <th className="text-right py-2 font-medium">Employees</th>
                  <th className="text-right py-2 font-medium">Payroll Volume</th>
                  <th className="text-right py-2 font-medium">Invoice Volume</th>
                  <th className="text-right py-2 font-medium">AR Balance</th>
                  <th className="text-right py-2 font-medium">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {clientBreakdown.slice(0, 20).map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="text-right py-2">{c.employees}</td>
                    <td className="text-right py-2">{fmt(c.payrollVolume)}</td>
                    <td className="text-right py-2">{fmt(c.invoiceVolume)}</td>
                    <td className="text-right py-2">{fmt(c.arBalance)}</td>
                    <td className="text-right py-2">
                      <Badge variant={c.complianceScore >= 80 ? 'default' : 'destructive'} className="text-[10px]">
                        {c.complianceScore}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {clientBreakdown.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No client data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* State Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">State Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">State</th>
                  <th className="text-right py-2 font-medium">Employees</th>
                  <th className="text-right py-2 font-medium">Compliance Flags</th>
                </tr>
              </thead>
              <tbody>
                {stateBreakdown.slice(0, 15).map(s => (
                  <tr key={s.state} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 font-medium">{s.state}</td>
                    <td className="text-right py-2">{s.emps}</td>
                    <td className="text-right py-2">
                      {s.flags > 0 ? <Badge variant="destructive" className="text-[10px]">{s.flags}</Badge> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. CLIENT REPORTING
   ═══════════════════════════════════════════════════════════ */
function ClientReporting({ lockToOwnCompany = false }: { lockToOwnCompany?: boolean }) {
  const { data: companies = [] } = useCompanies();
  // When locked, auto-select the first (only) company the client admin can see
  const autoCompanyId = lockToOwnCompany && companies.length > 0 ? companies[0].id : '';
  const [manualCompany, setSelectedCompany] = useState<string>('');
  const selectedCompany = lockToOwnCompany ? autoCompanyId : manualCompany;
  const [searchTerm, setSearchTerm] = useState('');
  const { data: payrollRuns = [] } = useReportPayrollRuns();
  const { data: employees = [] } = useReportEmployees();
  const { data: invoices = [] } = useReportInvoices();
  const { data: compliance = [] } = useReportComplianceItems();
  const { data: preData = [] } = useReportPayrollRunEmployees();

  const company = companies.find(c => c.id === selectedCompany);
  const cRuns = payrollRuns.filter(r => r.company_id === selectedCompany);
  const cEmps = employees.filter(e => e.company_id === selectedCompany);
  const cInv = invoices.filter(i => i.company_id === selectedCompany);
  const cComp = compliance.filter(ci => ci.company_id === selectedCompany);
  const activeEmps = cEmps.filter(e => e.status === 'active');
  const mtdRuns = cRuns.filter(r => isAfter(r.pay_date, startOfMonth));
  const ytdRuns = cRuns.filter(r => isAfter(r.pay_date, startOfYear));
  const totalMtd = mtdRuns.reduce((s, r) => s + (r.gross_pay_cents || 0), 0);
  const totalYtd = ytdRuns.reduce((s, r) => s + (r.gross_pay_cents || 0), 0);
  const hourly = activeEmps.filter(e => e.pay_type === 'hourly').length;
  const salary = activeEmps.filter(e => e.pay_type === 'salary').length;
  const invoicedTotal = cInv.reduce((s, i) => s + (i.total_cents || 0), 0);
  const paidTotal = cInv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount_cents || 0), 0);
  const outstanding = cInv.reduce((s, i) => s + (i.balance_due_cents || 0), 0);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const REPORT_CATEGORIES = [
    {
      title: 'Payroll Reports',
      icon: DollarSign,
      reports: ['Payroll Register', 'Payroll Summary by Period', 'Earnings Report', 'Deduction Report', 'Net Pay Summary', 'Off-Cycle Payroll Report'],
    },
    {
      title: 'Tax Reports',
      icon: FileText,
      reports: ['Tax Liability Report', 'SUI Wage Base Tracking', 'FUTA Liability Report', 'State Withholding Summary', 'Quarterly Tax Summary'],
    },
    {
      title: 'Employee / HR Reports',
      icon: Users,
      reports: ['Employee Census', 'Active vs Terminated', 'Compensation Report', 'Department Breakdown', 'PTO Balances', 'Work Location Report'],
    },
    {
      title: 'Compliance Reports',
      icon: ShieldCheck,
      reports: ['Missing I-9 Report', 'Missing Tax Forms', 'New Hire Reporting Status', 'Compliance Flags by Employee', 'Workers\' Comp Coverage'],
    },
    {
      title: 'Billing Reports',
      icon: CreditCard,
      reports: ['Invoice History', 'Payroll Invoice Breakdown', 'Monthly Invoice Breakdown', 'AR Aging Report', 'NSF / Failed Payments'],
    },
  ];

  const handleExportReport = (reportName: string) => {
    // Generate CSV from relevant data
    let csv = '';
    if (reportName === 'Employee Census') {
      csv = 'First Name,Last Name,Email,Status,Pay Type,Department,State,Start Date\n';
      cEmps.forEach(e => {
        csv += `${e.first_name},${e.last_name},${e.email},${e.status},${e.pay_type},${e.department || ''},${e.state || ''},${e.start_date}\n`;
      });
    } else if (reportName === 'Payroll Summary by Period') {
      csv = 'Pay Date,Frequency,Status,Employee Count,Gross Pay\n';
      cRuns.forEach(r => {
        csv += `${r.pay_date},${r.pay_frequency},${r.status},${r.employee_count},${(r.gross_pay_cents / 100).toFixed(2)}\n`;
      });
    } else if (reportName === 'Invoice History') {
      csv = 'Invoice #,Type,Date,Due Date,Status,Total,Balance\n';
      cInv.forEach(i => {
        csv += `${i.invoice_number},${i.invoice_type},${i.created_at?.slice(0, 10)},${i.due_date},${i.status},${(i.total_cents / 100).toFixed(2)},${(i.balance_due_cents / 100).toFixed(2)}\n`;
      });
    } else {
      toast.info(`Generating ${reportName}...`);
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '_')}_${selectedCompany?.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${reportName} exported`);
  };

  return (
    <div className="space-y-5 animate-in-up">
      {/* Client Selector */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 max-w-xs text-sm"
            />
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="h-8 w-64 text-sm">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {filteredCompanies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedCompany ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a client to view their reports</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Client KPI Dashboard */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <KpiCard icon={DollarSign} label="Payroll MTD" value={fmt(totalMtd)} sub={`YTD: ${fmt(totalYtd)}`} />
            <KpiCard icon={Users} label="Active Employees" value={String(activeEmps.length)} sub={`${hourly} hourly · ${salary} salary`} />
            <KpiCard icon={CreditCard} label="Invoiced Total" value={fmt(invoicedTotal)} sub={`Paid: ${fmt(paidTotal)}`} />
            <KpiCard icon={AlertTriangle} label="Outstanding" value={fmt(outstanding)} sub={`${cComp.filter(c => c.blocker).length} compliance flags`} accent={outstanding > 0} />
          </div>

          {/* Client payroll chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{company?.name} — Payroll History</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ChartContainer config={{ gross: { label: 'Gross Pay', color: CHART_COLORS[0] } }}>
                <BarChart data={cRuns.slice(0, 12).reverse().map(r => ({ date: r.pay_date?.slice(5, 10), gross: (r.gross_pay_cents || 0) / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" className="text-[10px]" />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} className="text-[10px]" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="gross" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Report Categories */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REPORT_CATEGORIES.map(cat => (
              <Card key={cat.title}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <cat.icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-medium">{cat.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {cat.reports.map(r => (
                      <li key={r} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <span className="text-xs">{r}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => handleExportReport(r)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. REPORT BUILDER & EXPORTS
   ═══════════════════════════════════════════════════════════ */
const DATA_SOURCES = ['Payroll', 'Employee', 'Tax', 'Billing', 'Compliance'] as const;
type DataSource = typeof DATA_SOURCES[number];

const FIELDS_BY_SOURCE: Record<DataSource, string[]> = {
  Payroll: ['Company', 'Pay Date', 'Pay Frequency', 'Status', 'Employee Count', 'Gross Pay', 'Net Pay', 'Employer Taxes', 'Workers Comp'],
  Employee: ['Company', 'Name', 'Email', 'Status', 'Pay Type', 'Department', 'State', 'Title', 'Start Date', 'Termination Date', 'Salary/Rate'],
  Tax: ['Company', 'Pay Date', 'Federal Tax', 'State Tax', 'SS', 'Medicare', 'Employer FICA', 'FUTA', 'SUI'],
  Billing: ['Company', 'Invoice #', 'Type', 'Date', 'Due Date', 'Status', 'Total', 'Paid', 'Balance'],
  Compliance: ['Company', 'Title', 'Category', 'Status', 'Priority', 'Due Date', 'Risk Level', 'Blocker'],
};

function ReportBuilder() {
  const [source, setSource] = useState<DataSource>('Payroll');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'mtd' | 'qtd' | 'ytd' | 'all'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: companies = [] } = useCompanies();
  const { data: payrollRuns = [] } = useReportPayrollRuns();
  const { data: employees = [] } = useReportEmployees();
  const { data: invoices = [] } = useReportInvoices();
  const { data: compliance = [] } = useReportComplianceItems();
  const { data: preData = [] } = useReportPayrollRunEmployees();

  const fields = FIELDS_BY_SOURCE[source];

  const toggleField = (f: string) => {
    setSelectedFields(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const selectAllFields = () => setSelectedFields([...fields]);
  const clearFields = () => setSelectedFields([]);

  // Build preview data
  const previewData = useMemo(() => {
    const dateRef = dateRange === 'mtd' ? startOfMonth : dateRange === 'qtd' ? startOfQuarter : dateRange === 'ytd' ? startOfYear : new Date(0);

    if (source === 'Payroll') {
      return payrollRuns
        .filter(r => isAfter(r.pay_date, dateRef))
        .filter(r => companyFilter === 'all' || r.company_id === companyFilter)
        .filter(r => statusFilter === 'all' || r.status === statusFilter)
        .slice(0, 50)
        .map(r => ({
          Company: (r as any).companies?.name || r.company_id?.slice(0, 8),
          'Pay Date': r.pay_date,
          'Pay Frequency': r.pay_frequency,
          Status: r.status,
          'Employee Count': r.employee_count,
          'Gross Pay': fmt(r.gross_pay_cents || 0),
          'Net Pay': fmt(r.net_pay_cents || 0),
          'Employer Taxes': fmt(r.employer_taxes_cents || 0),
          'Workers Comp': fmt(r.workers_comp_cents || 0),
        }));
    }
    if (source === 'Employee') {
      return employees
        .filter(e => companyFilter === 'all' || e.company_id === companyFilter)
        .filter(e => statusFilter === 'all' || e.status === statusFilter)
        .slice(0, 50)
        .map(e => ({
          Company: (e as any).companies?.name || '',
          Name: `${e.first_name} ${e.last_name}`,
          Email: e.email,
          Status: e.status,
          'Pay Type': e.pay_type,
          Department: e.department || '',
          State: e.state || '',
          Title: e.title || '',
          'Start Date': e.start_date,
          'Termination Date': e.termination_date || '',
          'Salary/Rate': e.pay_type === 'salary' ? fmt(e.annual_salary_cents || 0) : `$${((e.hourly_rate_cents || 0) / 100).toFixed(2)}/hr`,
        }));
    }
    if (source === 'Tax') {
      return preData
        .filter(p => companyFilter === 'all' || p.company_id === companyFilter)
        .slice(0, 50)
        .map(p => ({
          Company: p.company_id?.toString().slice(0, 8),
          'Pay Date': p.created_at?.slice(0, 10),
          'Federal Tax': fmt(p.federal_tax_cents || 0),
          'State Tax': fmt(p.state_tax_cents || 0),
          SS: fmt(p.social_security_cents || 0),
          Medicare: fmt(p.medicare_cents || 0),
          'Employer FICA': fmt(p.employer_fica_cents || 0),
          FUTA: fmt(p.employer_futa_cents || 0),
          SUI: fmt(p.employer_sui_cents || 0),
        }));
    }
    if (source === 'Billing') {
      return invoices
        .filter(i => isAfter(i.created_at, dateRef))
        .filter(i => companyFilter === 'all' || i.company_id === companyFilter)
        .filter(i => statusFilter === 'all' || i.status === statusFilter)
        .slice(0, 50)
        .map(i => ({
          Company: i.company_name,
          'Invoice #': i.invoice_number,
          Type: i.invoice_type,
          Date: i.created_at?.slice(0, 10),
          'Due Date': i.due_date,
          Status: i.status,
          Total: fmt(i.total_cents || 0),
          Paid: fmt(i.paid_amount_cents || 0),
          Balance: fmt(i.balance_due_cents || 0),
        }));
    }
    // Compliance
    return compliance
      .filter(c => companyFilter === 'all' || c.company_id === companyFilter)
      .filter(c => statusFilter === 'all' || c.status === statusFilter)
      .slice(0, 50)
      .map(c => ({
        Company: c.company_id || '',
        Title: c.title,
        Category: c.category,
        Status: c.status,
        Priority: c.priority,
        'Due Date': c.due_date || '',
        'Risk Level': c.risk_level || '',
        Blocker: c.blocker ? 'Yes' : 'No',
      }));
  }, [source, payrollRuns, employees, invoices, compliance, preData, dateRange, companyFilter, statusFilter]);

  const handleExport = (format: 'csv' | 'json') => {
    const activeFields = selectedFields.length ? selectedFields : fields;
    if (format === 'csv') {
      let csv = activeFields.join(',') + '\n';
      previewData.forEach((row: any) => {
        csv += activeFields.map(f => `"${(row[f] ?? '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${source}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const filtered = previewData.map((row: any) => {
        const obj: any = {};
        activeFields.forEach(f => { obj[f] = row[f]; });
        return obj;
      });
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${source}_report_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`${source} report exported as ${format.toUpperCase()}`);
  };

  const activeFields = selectedFields.length ? selectedFields : fields;

  return (
    <div className="space-y-5 animate-in-up">
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Config panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Data Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DATA_SOURCES.map(s => (
                <Button
                  key={s}
                  variant={source === s ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => { setSource(s); setSelectedFields([]); }}
                >
                  {s}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Fields</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={selectAllFields}>All</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={clearFields}>None</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {fields.map(f => (
                <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={selectedFields.includes(f)} onCheckedChange={() => toggleField(f)} />
                  {f}
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Date Range</label>
                <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtd">Month to Date</SelectItem>
                    <SelectItem value="qtd">Quarter to Date</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Client</label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Status</label>
                <Input
                  placeholder="e.g. active, paid"
                  className="h-7 text-xs"
                  value={statusFilter === 'all' ? '' : statusFilter}
                  onChange={e => setStatusFilter(e.target.value || 'all')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview + Export */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">{source} Report Preview</CardTitle>
                  <CardDescription className="text-xs">{previewData.length} rows{selectedFields.length ? ` · ${selectedFields.length} fields selected` : ''}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleExport('csv')}>
                    <Download className="h-3 w-3 mr-1" />CSV
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleExport('json')}>
                    <Download className="h-3 w-3 mr-1" />JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b">
                      {activeFields.map(f => (
                        <th key={f} className="text-left py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                        {activeFields.map(f => (
                          <td key={f} className="py-1.5 px-2 whitespace-nowrap">{row[f] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                    {previewData.length === 0 && (
                      <tr><td colSpan={activeFields.length} className="text-center py-8 text-muted-foreground">No data matches current filters</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ───── KPI Card ───── */
function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <Card className={accent ? 'border-destructive/40' : ''}>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${accent ? 'text-destructive' : 'text-primary'}`} />
          <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        </div>
        <p className="text-lg font-bold tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
