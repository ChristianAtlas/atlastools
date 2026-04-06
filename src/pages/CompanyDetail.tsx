import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, DollarSign, FileText, ShieldCheck, FolderOpen,
  Mail, Phone, MapPin, Calendar, Hash, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompany, type CompanyRow } from '@/hooks/useCompanies';
import { employees as mockEmployees, payrollRuns, invoices, complianceTasks } from '@/lib/mock-data';
import type { Employee, PayrollRun, Invoice, ComplianceTask } from '@/lib/types';
import { EditCompanyDialog } from '@/components/companies/EditCompanyDialog';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md bg-muted p-2 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ company, empCount, payrollTotal }: { company: CompanyRow; empCount: number; payrollTotal: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 animate-in-up">
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Company Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem icon={Building2} label="Company Name" value={company.name} />
          <InfoItem icon={Hash} label="EIN" value={company.ein} />
          <InfoItem icon={MapPin} label="State" value={company.state} />
          <InfoItem icon={Calendar} label="Client Since" value={new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
          <InfoItem icon={Mail} label="Primary Contact" value={company.primary_contact_name} />
          <InfoItem icon={Users} label="Employees" value={String(empCount)} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Active Employees</p>
              <p className="text-xl font-semibold tabular-nums mt-1">{empCount}</p>
            </div>
            <div className="rounded-md bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Total Payroll</p>
              <p className="text-xl font-semibold tabular-nums mt-1">{formatCurrency(payrollTotal)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status</h3>
          <div className="flex items-center gap-3">
            <StatusBadge status={company.status} />
            <span className="text-sm text-muted-foreground">
              {company.status === 'active' ? 'Company is active and processing payroll' :
               company.status === 'onboarding' ? 'Company is being onboarded' :
               company.status === 'suspended' ? 'Account suspended' : 'Account terminated'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Employees Tab ─── */
function EmployeesTab({ emps, navigate }: { emps: Employee[]; navigate: (path: string) => void }) {
  return (
    <div className="rounded-lg border bg-card animate-in-up">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Compensation</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emps.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
          ) : emps.map(emp => (
            <TableRow key={emp.id} className="cursor-pointer" onClick={() => navigate(`/employees/${emp.id}`)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {emp.avatarInitials}
                  </div>
                  <div>
                    <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{emp.title}</TableCell>
              <TableCell>{emp.department}</TableCell>
              <TableCell className="text-right tabular-nums">
                {emp.payType === 'hourly' ? `$${emp.salary}/hr` : formatCurrency(emp.salary)}
              </TableCell>
              <TableCell><StatusBadge status={emp.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Payroll Tab ─── */
function PayrollTab({ runs, navigate }: { runs: PayrollRun[]; navigate: (path: string) => void }) {
  return (
    <div className="rounded-lg border bg-card animate-in-up">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pay Period</TableHead>
            <TableHead>Pay Date</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead className="text-right">Gross Pay</TableHead>
            <TableHead className="text-right">Net Pay</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payroll runs</TableCell></TableRow>
          ) : runs.map(run => (
            <TableRow key={run.id} className="cursor-pointer" onClick={() => navigate(`/payroll/${run.id}`)}>
              <TableCell className="font-medium">{run.payPeriodStart} — {run.payPeriodEnd}</TableCell>
              <TableCell>{run.payDate}</TableCell>
              <TableCell className="tabular-nums">{run.employeeCount}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(run.grossPay)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(run.netPay)}</TableCell>
              <TableCell><StatusBadge status={run.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Invoices Tab ─── */
function InvoicesTab({ invs }: { invs: Invoice[] }) {
  return (
    <div className="rounded-lg border bg-card animate-in-up">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invs.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No invoices</TableCell></TableRow>
          ) : invs.map(inv => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium uppercase">{inv.id}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">{inv.type}</span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(inv.amount)}</TableCell>
              <TableCell>{inv.dueDate}</TableCell>
              <TableCell><StatusBadge status={inv.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Compliance Tab ─── */
function ComplianceTab({ tasks }: { tasks: ComplianceTask[] }) {
  return (
    <div className="rounded-lg border bg-card animate-in-up">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No compliance tasks</TableCell></TableRow>
          ) : tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>{task.category}</TableCell>
              <TableCell>{task.assignee}</TableCell>
              <TableCell>{task.dueDate}</TableCell>
              <TableCell><StatusBadge status={task.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Documents Tab ─── */
const mockDocs = [
  { id: 'd1', name: 'W-9 Form', type: 'Tax Form', date: '2025-01-15', size: '245 KB' },
  { id: 'd2', name: 'Master Service Agreement', type: 'Contract', date: '2024-08-15', size: '1.2 MB' },
  { id: 'd3', name: 'Certificate of Insurance', type: 'Insurance', date: '2025-02-01', size: '890 KB' },
];

function DocumentsTab() {
  return (
    <div className="rounded-lg border bg-card animate-in-up">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Size</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockDocs.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{doc.name}</span>
                </div>
              </TableCell>
              <TableCell>{doc.type}</TableCell>
              <TableCell>{doc.date}</TableCell>
              <TableCell className="tabular-nums">{doc.size}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Main Page ─── */
export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading, error } = useCompany(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company || error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Company not found</h2>
        <p className="text-sm text-muted-foreground mt-1">The company you're looking for doesn't exist.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/companies')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Companies
        </Button>
      </div>
    );
  }

  // Still use mock data for related entities until those tables are built
  const companyEmployees = mockEmployees.filter(e => e.companyId === company.id);
  const companyPayroll = payrollRuns.filter(p => p.companyId === company.id);
  const companyInvoices = invoices.filter(i => i.companyId === company.id);
  const companyCompliance = complianceTasks.filter(t => t.companyId === company.id);
  const payrollTotal = companyPayroll.reduce((sum, r) => sum + r.grossPay, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-in-up">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate('/companies')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">EIN: {company.ein} · {company.state} · {company.employee_count} employees</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Edit Company</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="animate-in-up stagger-1">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5"><Users className="h-3.5 w-3.5" />Employees ({companyEmployees.length})</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Payroll ({companyPayroll.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Invoices ({companyInvoices.length})</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Compliance ({companyCompliance.length})</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" />Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab company={company} empCount={companyEmployees.length} payrollTotal={payrollTotal} /></TabsContent>
        <TabsContent value="employees"><EmployeesTab emps={companyEmployees} navigate={navigate} /></TabsContent>
        <TabsContent value="payroll"><PayrollTab runs={companyPayroll} navigate={navigate} /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab invs={companyInvoices} /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab tasks={companyCompliance} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
      </Tabs>

      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}
