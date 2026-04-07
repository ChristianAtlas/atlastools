import { useState, useEffect } from 'react';
import { Save, User, CreditCard, Shield, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useUpdateEmployee, getInitials } from '@/hooks/useEmployees';
import { toast } from 'sonner';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function MyProfile() {
  const { data: employee, isLoading } = useCurrentEmployee();
  const updateEmployee = useUpdateEmployee();
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({
        first_name: employee.first_name ?? '',
        last_name: employee.last_name ?? '',
        email: employee.email ?? '',
        personal_email: employee.personal_email ?? '',
        phone: employee.phone ?? '',
        address_line1: employee.address_line1 ?? '',
        address_line2: employee.address_line2 ?? '',
        city: employee.city ?? '',
        state: employee.state ?? '',
        zip: employee.zip ?? '',
        emergency_contact_name: employee.emergency_contact_name ?? '',
        emergency_contact_phone: employee.emergency_contact_phone ?? '',
        emergency_contact_relationship: employee.emergency_contact_relationship ?? '',
      });
      setDirty(false);
    }
  }, [employee]);

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = () => {
    updateEmployee.mutate(
      { id: employee.id, ...form } as any,
      {
        onSuccess: () => {
          toast.success('Profile updated');
          setDirty(false);
        },
        onError: () => toast.error('Failed to save'),
      }
    );
  };

  const initials = getInitials(employee.first_name, employee.last_name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="My Profile" description="Manage your personal information and settings" />
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={updateEmployee.isPending} className="gap-1">
            <Save className="h-3.5 w-3.5" /> Save Changes
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar info card */}
        <Card className="animate-in-up h-fit">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
              {initials}
            </div>
            <h3 className="mt-3 text-base font-semibold">{employee.first_name} {employee.last_name}</h3>
            <p className="text-sm text-muted-foreground">{employee.title ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">{employee.companies?.name}</p>
            <div className="mt-4 space-y-1 text-xs text-left">
              <Row label="MID" value={employee.mid} />
              <Row label="Department" value={employee.department ?? '—'} />
              <Row label="Start Date" value={employee.start_date ? new Date(employee.start_date).toLocaleDateString() : '—'} />
              <Row label="Pay Type" value={employee.pay_type === 'salary' ? 'Salary' : 'Hourly'} />
              <Row label="Frequency" value={employee.pay_frequency} />
            </div>
          </CardContent>
        </Card>

        {/* Tabbed forms */}
        <Card className="animate-in-up stagger-1">
          <CardContent className="pt-6">
            <Tabs defaultValue="personal">
              <TabsList>
                <TabsTrigger value="personal" className="gap-1 text-xs"><User className="h-3.5 w-3.5" /> Personal</TabsTrigger>
                <TabsTrigger value="tax" className="gap-1 text-xs"><Shield className="h-3.5 w-3.5" /> Tax Info</TabsTrigger>
                <TabsTrigger value="deposit" className="gap-1 text-xs"><CreditCard className="h-3.5 w-3.5" /> Direct Deposit</TabsTrigger>
                <TabsTrigger value="security" className="gap-1 text-xs"><Lock className="h-3.5 w-3.5" /> Security</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" value={form.first_name} onChange={v => set('first_name', v)} />
                  <Field label="Last Name" value={form.last_name} onChange={v => set('last_name', v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Work Email" value={form.email} onChange={v => set('email', v)} />
                  <Field label="Personal Email" value={form.personal_email} onChange={v => set('personal_email', v)} />
                </div>
                <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />

                <h4 className="text-sm font-semibold pt-2">Address</h4>
                <Field label="Street Address" value={form.address_line1} onChange={v => set('address_line1', v)} />
                <Field label="Apt / Suite" value={form.address_line2} onChange={v => set('address_line2', v)} />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="City" value={form.city} onChange={v => set('city', v)} />
                  <div>
                    <Label className="text-xs">State</Label>
                    <Select value={form.state} onValueChange={v => set('state', v)}>
                      <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="ZIP" value={form.zip} onChange={v => set('zip', v)} />
                </div>

                <h4 className="text-sm font-semibold pt-2">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Name" value={form.emergency_contact_name} onChange={v => set('emergency_contact_name', v)} />
                  <Field label="Phone" value={form.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} />
                  <Field label="Relationship" value={form.emergency_contact_relationship} onChange={v => set('emergency_contact_relationship', v)} />
                </div>
              </TabsContent>

              <TabsContent value="tax" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Your federal and state tax withholding information. Contact HR to make changes.</p>
                <div className="grid grid-cols-2 gap-4">
                  <ReadonlyField label="Filing Status" value="Single" />
                  <ReadonlyField label="Federal Allowances" value="0" />
                  <ReadonlyField label="Additional Withholding" value="$0.00" />
                  <ReadonlyField label="State" value={employee.state ?? '—'} />
                </div>
              </TabsContent>

              <TabsContent value="deposit" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Your direct deposit accounts. Contact HR to make changes.</p>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Primary Account</p>
                        <p className="text-xs text-muted-foreground">Checking · ****4521</p>
                      </div>
                      <span className="text-xs text-muted-foreground">100% of net pay</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Manage your password and security settings.</p>
                <Button variant="outline" size="sm">Change Password</Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} className="h-9 text-sm mt-1" />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value} readOnly className="h-9 text-sm mt-1 bg-muted" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
