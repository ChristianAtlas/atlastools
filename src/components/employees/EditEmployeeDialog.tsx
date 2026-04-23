import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useUpdateEmployee, type EmployeeRow } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';

interface EditEmployeeDialogProps {
  employee: EmployeeRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

export function EditEmployeeDialog({ employee, open, onOpenChange, defaultTab = 'profile' }: EditEmployeeDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [form, setForm] = useState(() => buildForm(employee));
  const update = useUpdateEmployee();
  const { toast } = useToast();

  // Reset form when employee changes or dialog opens
  useEffect(() => {
    if (open) {
      setForm(buildForm(employee));
      setActiveTab(defaultTab);
    }
  }, [open, employee, defaultTab]);

  const set = (key: string, value: string | number | null) => setForm(f => ({ ...f, [key]: value }));

  const handlePayTypeChange = (payType: string) => {
    setForm(f => ({
      ...f,
      pay_type: payType as typeof f.pay_type,
      pay_frequency: payType === 'salary' ? 'semimonthly' : 'biweekly',
    }));
  };

  const handleSave = async () => {
    try {
      const payload: Record<string, any> = {
        id: employee.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        personal_email: form.personal_email || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        title: form.title || null,
        department: form.department || null,
        status: form.status,
        start_date: form.start_date,
        pay_type: form.pay_type,
        pay_frequency: form.pay_frequency,
        annual_salary_cents: form.pay_type === 'salary' ? form.annual_salary_cents : null,
        hourly_rate_cents: form.pay_type === 'hourly' ? form.hourly_rate_cents : null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        emergency_contact_relationship: form.emergency_contact_relationship || null,
      };
      await update.mutateAsync(payload as any);
      toast({ title: 'Employee updated' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee — {employee.first_name} {employee.last_name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="tax">Tax Info</TabsTrigger>
            <TabsTrigger value="deposit">Direct Deposit</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" value={form.first_name} onChange={v => set('first_name', v)} />
              <Field label="Last Name" value={form.last_name} onChange={v => set('last_name', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Work Email" value={form.email} onChange={v => set('email', v)} type="email" />
              <Field label="Personal Email" value={form.personal_email} onChange={v => set('personal_email', v)} type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />
              <Field label="Date of Birth" value={form.date_of_birth} onChange={v => set('date_of_birth', v)} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non_binary">Non-Binary</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
            <Field label="Address Line 1" value={form.address_line1} onChange={v => set('address_line1', v)} />
            <Field label="Address Line 2" value={form.address_line2} onChange={v => set('address_line2', v)} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="City" value={form.city} onChange={v => set('city', v)} />
              <Field label="State" value={form.state} onChange={v => set('state', v)} />
              <Field label="ZIP" value={form.zip} onChange={v => set('zip', v)} />
            </div>

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employment Details</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title" value={form.title} onChange={v => set('title', v)} />
              <Field label="Department" value={form.department} onChange={v => set('department', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date" value={form.start_date} onChange={v => set('start_date', v)} type="date" />
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => set('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emergency Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Name" value={form.emergency_contact_name} onChange={v => set('emergency_contact_name', v)} />
              <Field label="Relationship" value={form.emergency_contact_relationship} onChange={v => set('emergency_contact_relationship', v)} />
              <Field label="Phone" value={form.emergency_contact_phone} onChange={v => set('emergency_contact_phone', v)} />
            </div>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4 mt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Base Compensation</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pay Type</Label>
                <Select value={form.pay_type} onValueChange={handlePayTypeChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pay Frequency</Label>
                <Select value={form.pay_frequency} onValueChange={v => set('pay_frequency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.pay_type === 'salary' ? (
              <div className="space-y-1.5">
                <Label>Annual Salary ($)</Label>
                <Input
                  type="number"
                  value={form.annual_salary_cents != null ? (form.annual_salary_cents / 100).toFixed(2) : ''}
                  onChange={e => set('annual_salary_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.hourly_rate_cents != null ? (form.hourly_rate_cents / 100).toFixed(2) : ''}
                  onChange={e => set('hourly_rate_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="tax" className="space-y-4 mt-4">
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium mb-1">Tax information editing coming soon</p>
              <p>Federal W-4 and state withholding configuration will be managed here.</p>
            </div>
          </TabsContent>

          <TabsContent value="deposit" className="space-y-4 mt-4">
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              <p className="font-medium mb-1">Direct deposit editing coming soon</p>
              <p>Bank account and allocation management will be available here.</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Reusable edit button for card headers — only shown to super admins */
export function CardEditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onClick}>
      <Pencil className="h-3 w-3" />Edit
    </Button>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function buildForm(emp: EmployeeRow) {
  return {
    first_name: emp.first_name,
    last_name: emp.last_name,
    email: emp.email,
    personal_email: emp.personal_email || '',
    phone: emp.phone || '',
    date_of_birth: emp.date_of_birth || '',
    gender: emp.gender || '',
    address_line1: emp.address_line1 || '',
    address_line2: emp.address_line2 || '',
    city: emp.city || '',
    state: emp.state || '',
    zip: emp.zip || '',
    title: emp.title || '',
    department: emp.department || '',
    status: emp.status,
    start_date: emp.start_date,
    pay_type: emp.pay_type,
    pay_frequency: emp.pay_frequency,
    annual_salary_cents: emp.annual_salary_cents,
    hourly_rate_cents: emp.hourly_rate_cents,
    emergency_contact_name: emp.emergency_contact_name || '',
    emergency_contact_phone: emp.emergency_contact_phone || '',
    emergency_contact_relationship: emp.emergency_contact_relationship || '',
  };
}
