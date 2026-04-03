import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, nextTuesday, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, Loader2, AlertCircle } from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreatePayrollRun, type PayrollRunType } from '@/hooks/usePayrollRuns';
import { toast } from 'sonner';

interface NewPayrollRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RUN_TYPES: { value: PayrollRunType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'off_cycle', label: 'Off-Cycle' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Commission' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'correction', label: 'Correction' },
];

const PAY_FREQUENCIES: { value: string; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
];

function computeNextTuesday6pmEST(): Date {
  const now = new Date();
  let tue = nextTuesday(now);
  // If today is Tuesday and before 6PM EST, use today
  if (now.getDay() === 2) {
    const estHour = now.getUTCHours() - 5;
    if (estHour < 18) {
      tue = now;
    }
  }
  tue.setUTCHours(23, 0, 0, 0); // 6PM EST = 23:00 UTC
  return tue;
}

function getDefaultPayPeriod(frequency: string): { start: string; end: string; payDate: string } {
  const now = new Date();
  let start: Date, end: Date, payDate: Date;

  if (frequency === 'weekly') {
    start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    end = addDays(start, 6);
    payDate = addDays(end, 5); // Friday after
  } else if (frequency === 'biweekly') {
    start = startOfWeek(now, { weekStartsOn: 1 });
    end = addDays(start, 13);
    payDate = addDays(end, 5);
  } else if (frequency === 'semimonthly') {
    const day = now.getDate();
    if (day <= 15) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 16);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    payDate = addDays(end, 5);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    payDate = addDays(end, 5);
  }

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    payDate: format(payDate, 'yyyy-MM-dd'),
  };
}

export function NewPayrollRunDialog({ open, onOpenChange }: NewPayrollRunDialogProps) {
  const navigate = useNavigate();
  const { data: companies = [] } = useCompanies();
  const createRun = useCreatePayrollRun();

  const [companyId, setCompanyId] = useState('');
  const [runType, setRunType] = useState<PayrollRunType>('regular');
  const [payFrequency, setPayFrequency] = useState('biweekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [payDate, setPayDate] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch active employees for selected company
  const { data: employees = [] } = useEmployees(companyId || undefined);
  const activeEmployees = employees.filter(e => e.status === 'active');

  // Auto-compute deadline
  const deadline = useMemo(() => computeNextTuesday6pmEST(), []);

  // When company or frequency changes, set default dates
  const handleCompanyChange = (id: string) => {
    setCompanyId(id);
    if (!periodStart) {
      const defaults = getDefaultPayPeriod(payFrequency);
      setPeriodStart(defaults.start);
      setPeriodEnd(defaults.end);
      setPayDate(defaults.payDate);
    }
  };

  const handleFrequencyChange = (freq: string) => {
    setPayFrequency(freq);
    const defaults = getDefaultPayPeriod(freq);
    setPeriodStart(defaults.start);
    setPeriodEnd(defaults.end);
    setPayDate(defaults.payDate);
  };

  const handleSubmit = async () => {
    if (!companyId || !periodStart || !periodEnd || !payDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const result = await createRun.mutateAsync({
        company_id: companyId,
        run_type: runType,
        pay_frequency: payFrequency,
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        pay_date: payDate,
        notes: notes || undefined,
      });
      toast.success(`Payroll run created with ${result.employee_count} employees`);
      onOpenChange(false);
      resetForm();
      navigate(`/payroll/${result.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create payroll run');
    }
  };

  const resetForm = () => {
    setCompanyId('');
    setRunType('regular');
    setPayFrequency('biweekly');
    setPeriodStart('');
    setPeriodEnd('');
    setPayDate('');
    setNotes('');
  };

  const selectedCompany = companies.find(c => c.id === companyId);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Payroll Run</DialogTitle>
          <DialogDescription>
            Create a new payroll run in draft status. Active employees will be auto-populated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Company */}
          <div className="space-y-1.5">
            <Label>Company *</Label>
            <Select value={companyId} onValueChange={handleCompanyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Run Type */}
            <div className="space-y-1.5">
              <Label>Run Type</Label>
              <Select value={runType} onValueChange={(v) => setRunType(v as PayrollRunType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pay Frequency */}
            <div className="space-y-1.5">
              <Label>Pay Frequency</Label>
              <Select value={payFrequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAY_FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pay Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Period Start *</Label>
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period End *</Label>
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          {/* Pay Date */}
          <div className="space-y-1.5">
            <Label>Pay Date *</Label>
            <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>

          {/* Deadline info */}
          <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5 text-sm">
            <Clock className="h-4 w-4 text-warning shrink-0" />
            <div>
              <p className="font-medium text-xs">Submission Deadline</p>
              <p className="text-xs text-muted-foreground">
                {format(deadline, "EEEE, MMMM d, yyyy 'at' h:mm a")} EST
              </p>
            </div>
          </div>

          {/* Employee preview */}
          {companyId && (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium text-xs">Employees to Include</p>
                <p className="text-xs text-muted-foreground">
                  {activeEmployees.length} active employee{activeEmployees.length !== 1 ? 's' : ''} at {selectedCompany?.name}
                </p>
              </div>
            </div>
          )}

          {companyId && activeEmployees.length === 0 && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">No active employees found for this company.</p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any notes for this payroll run..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!companyId || !periodStart || !periodEnd || !payDate || createRun.isPending}
          >
            {createRun.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Create Draft Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
