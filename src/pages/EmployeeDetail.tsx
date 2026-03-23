import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, Clock, FileText, Upload, ShieldCheck, CreditCard, PalmtreeIcon, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useEmployee, useCompensationRecords,
  empCentsToUSD, getInitials,
  type EmployeeRow, type CompensationRecordRow,
} from '@/hooks/useEmployees';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function ProfileTab({ emp }: { emp: EmployeeRow }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 animate-in-up">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow icon={Mail} label="Email" value={emp.email} />
          <InfoRow icon={Phone} label="Phone" value={emp.phone || '—'} />
          <InfoRow icon={MapPin} label="Address" value={
            [emp.address_line1, emp.city, emp.state, emp.zip].filter(Boolean).join(', ') || '—'
          } />
          <InfoRow icon={Calendar} label="Date of Birth" value={
            emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
          } />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow icon={Building2} label="Company" value={emp.companies?.name ?? '—'} />
          <InfoRow icon={ShieldCheck} label="Department" value={emp.department ?? '—'} />
          <InfoRow label="Title" value={emp.title ?? '—'} />
          <InfoRow icon={Calendar} label="Start Date" value={
            new Date(emp.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          } />
          <InfoRow label="Employee ID" value={emp.id.substring(0, 8).toUpperCase()} />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium mt-0.5">{emp.emergency_contact_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Relationship</p>
              <p className="text-sm font-medium mt-0.5">{emp.emergency_contact_relationship || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium mt-0.5">{emp.emergency_contact_phone || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompensationTab({ emp, history }: { emp: EmployeeRow; history: CompensationRecordRow[] }) {
  const currentPay = emp.pay_type === 'hourly'
    ? empCentsToUSD(emp.hourly_rate_cents, 'hourly')
    : empCentsToUSD(emp.annual_salary_cents, 'salary');

  return (
    <div className="grid gap-5 md:grid-cols-2 animate-in-up">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">Base Pay</p>
            <p className="text-2xl font-semibold tabular-nums">{currentPay}</p>
          </div>
          <Separator />
          <div className="space-y-1.5">
            <InfoRow label="Pay Type" value={emp.pay_type === 'salary' ? 'Salaried' : 'Hourly'} />
            <InfoRow label="Pay Frequency" value={emp.pay_frequency === 'biweekly' ? 'Bi-weekly' : emp.pay_frequency} />
            <InfoRow label="FLSA Status" value={
              emp.pay_type === 'salary' && (emp.annual_salary_cents ?? 0) >= 5860000 ? 'Exempt' : 'Non-Exempt'
            } />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compensation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history available</p>
            ) : history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium capitalize">{h.reason.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.effective_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {h.change_percentage ? ` · +${h.change_percentage}%` : ''}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {h.pay_type === 'hourly'
                    ? empCentsToUSD(h.hourly_rate_cents, 'hourly')
                    : empCentsToUSD(h.annual_salary_cents, 'salary')}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Benefits Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Medical</p>
              <p className="text-sm font-medium mt-1">Blue Cross PPO</p>
              <Badge variant="secondary" className="mt-1.5 text-xs">Employee + Spouse</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Dental</p>
              <p className="text-sm font-medium mt-1">Delta Dental</p>
              <Badge variant="secondary" className="mt-1.5 text-xs">Employee Only</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">401(k)</p>
              <p className="text-sm font-medium mt-1">6% contribution</p>
              <Badge variant="secondary" className="mt-1.5 text-xs">3% employer match</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaxInfoTab() {
  return (
    <div className="grid gap-5 md:grid-cols-2 animate-in-up">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Federal W-4</CardTitle>
          <CardDescription>Last updated Jan 15, 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Filing Status" value="Married Filing Jointly" />
          <InfoRow label="Multiple Jobs" value="No" />
          <InfoRow label="Dependents Claim Amount" value="$4,000" />
          <InfoRow label="Extra Withholding" value="$0.00" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">State Tax</CardTitle>
          <CardDescription>Texas — no state income tax</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Work State" value="Texas" />
          <InfoRow label="Resident State" value="Texas" />
          <InfoRow label="State Withholding" value="N/A" />
          <InfoRow label="Local Tax" value="None" />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tax Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {['W-4 (2025)', 'W-2 (2024)', 'I-9 Verification'].map(doc => (
              <div key={doc} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{doc}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DirectDepositTab() {
  return (
    <div className="grid gap-5 md:grid-cols-2 animate-in-up">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Primary Account</CardTitle>
          <CardDescription>Checking — receives remainder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow icon={CreditCard} label="Bank" value="Chase Bank" />
          <InfoRow label="Account Type" value="Checking" />
          <InfoRow label="Routing Number" value="•••••6789" />
          <InfoRow label="Account Number" value="•••••4321" />
          <InfoRow label="Allocation" value="Remainder (100%)" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Secondary Account</CardTitle>
          <CardDescription>Savings — fixed amount</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow icon={CreditCard} label="Bank" value="Ally Bank" />
          <InfoRow label="Account Type" value="Savings" />
          <InfoRow label="Routing Number" value="•••••1234" />
          <InfoRow label="Account Number" value="•••••8765" />
          <InfoRow label="Allocation" value="$500.00 per pay period" />
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prenote Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))]" />
            <p className="text-sm">Both accounts verified — prenote completed Jan 22, 2025</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsTab() {
  const docs = [
    { name: 'Offer Letter', type: 'Employment', date: 'Aug 20, 2024', signed: true },
    { name: 'W-4 Form', type: 'Tax', date: 'Jan 15, 2025', signed: true },
    { name: 'I-9 Verification', type: 'Compliance', date: 'Sep 02, 2024', signed: true },
    { name: 'Direct Deposit Form', type: 'Payroll', date: 'Sep 05, 2024', signed: true },
    { name: 'Employee Handbook Acknowledgment', type: 'Policy', date: 'Sep 01, 2024', signed: false },
  ];

  return (
    <div className="space-y-4 animate-in-up">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{docs.length} documents on file</p>
        <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1.5" />Upload</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Document</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">E-Sign</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {docs.map(doc => (
                <tr key={doc.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.type}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{doc.date}</td>
                  <td className="px-4 py-3">
                    {doc.signed
                      ? <Badge variant="secondary" className="text-xs bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">Signed</Badge>
                      : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function PTOTab() {
  const balances = [
    { type: 'Vacation', used: 3, accrued: 10, pending: 1, color: 'var(--chart-1)' },
    { type: 'Sick Leave', used: 1, accrued: 5, pending: 0, color: 'var(--chart-2)' },
    { type: 'Personal', used: 0, accrued: 3, pending: 0, color: 'var(--chart-3)' },
  ];

  const requests = [
    { dates: 'Apr 7–11, 2025', type: 'Vacation', days: 5, status: 'pending' as const },
    { dates: 'Feb 14, 2025', type: 'Sick Leave', days: 1, status: 'completed' as const },
    { dates: 'Jan 2–3, 2025', type: 'Vacation', days: 2, status: 'completed' as const },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3 animate-in-up">
      {balances.map(b => {
        const available = b.accrued - b.used - b.pending;
        return (
          <Card key={b.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{b.type}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums">{available}</span>
                <span className="text-sm text-muted-foreground">days available</span>
              </div>
              <Progress value={(b.used / b.accrued) * 100} className="h-1.5" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums">{b.accrued}</p>
                  <p className="text-xs text-muted-foreground">Accrued</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{b.used}</p>
                  <p className="text-xs text-muted-foreground">Used</p>
                </div>
                <div>
                  <p className="text-lg font-semibold tabular-nums">{b.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <Card className="md:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requests.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <PalmtreeIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{r.type} — {r.days} day{r.days > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">{r.dates}</p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: emp, isLoading, error } = useEmployee(id);
  const { data: compHistory = [] } = useCompensationRecords(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!emp || error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <p className="text-muted-foreground">Employee not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Employees
        </Button>
      </div>
    );
  }

  const initials = getInitials(emp.first_name, emp.last_name);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 animate-in-up">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/employees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{emp.first_name} {emp.last_name}</h1>
              <StatusBadge status={emp.status} />
            </div>
            <p className="text-sm text-muted-foreground">{emp.title} · {emp.companies?.name}</p>
          </div>
        </div>
        <Button variant="outline" size="sm">Edit Employee</Button>
      </div>

      <Tabs defaultValue="profile" className="animate-in-up stagger-1">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="compensation" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Compensation</TabsTrigger>
          <TabsTrigger value="tax" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Tax Info</TabsTrigger>
          <TabsTrigger value="deposit" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Direct Deposit</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Documents</TabsTrigger>
          <TabsTrigger value="pto" className="gap-1.5"><PalmtreeIcon className="h-3.5 w-3.5" />PTO</TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileTab emp={emp} /></TabsContent>
        <TabsContent value="compensation"><CompensationTab emp={emp} history={compHistory} /></TabsContent>
        <TabsContent value="tax"><TaxInfoTab /></TabsContent>
        <TabsContent value="deposit"><DirectDepositTab /></TabsContent>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="pto"><PTOTab /></TabsContent>
      </Tabs>
    </div>
  );
}
