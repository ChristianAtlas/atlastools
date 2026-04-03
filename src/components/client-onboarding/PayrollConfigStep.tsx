import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, Clock } from 'lucide-react';
import type { WizardData } from '@/hooks/useClientOnboarding';

interface Props {
  data: WizardData;
  onSave: (data: Partial<WizardData>) => void;
  onBack: () => void;
  isSaving: boolean;
}

const EARNING_TYPES = ['Regular', 'Overtime', 'Holiday', 'PTO', 'Bonus', 'Commission', 'Reimbursement'];
const DEDUCTION_TYPES = ['Medical', 'Dental', 'Vision', '401(k)', 'HSA', 'FSA', 'Life Insurance', 'Disability'];

export function PayrollConfigStep({ data, onSave, onBack, isSaving }: Props) {
  const p = data.payroll;

  const [payFrequency, setPayFrequency] = useState(p?.pay_frequency || 'biweekly');
  const [firstPayrollDate, setFirstPayrollDate] = useState(p?.first_payroll_date || '');
  const [checkDateOffset, setCheckDateOffset] = useState(p?.check_date_offset?.toString() || '5');
  const [earningTypes, setEarningTypes] = useState<string[]>(p?.default_earning_types || ['Regular', 'Overtime', 'PTO']);
  const [deductions, setDeductions] = useState<string[]>(p?.benefit_deductions || []);
  const [timeTracking, setTimeTracking] = useState<string>(p?.time_tracking_method || 'none');

  const toggleEarning = (t: string) => {
    setEarningTypes(prev => prev.includes(t) ? prev.filter(e => e !== t) : [...prev, t]);
  };

  const toggleDeduction = (d: string) => {
    setDeductions(prev => prev.includes(d) ? prev.filter(e => e !== d) : [...prev, d]);
  };

  const handleSubmit = () => {
    onSave({
      payroll: {
        pay_frequency: payFrequency,
        first_payroll_date: firstPayrollDate || undefined,
        check_date_offset: parseInt(checkDateOffset) || 5,
        default_earning_types: earningTypes,
        benefit_deductions: deductions,
        time_tracking_method: timeTracking as 'native' | 'integration' | 'none',
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Pay Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />Pay Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Pay Frequency *</Label>
              <Select value={payFrequency} onValueChange={setPayFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="semimonthly">Semi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>First Payroll Date</Label>
              <Input type="date" value={firstPayrollDate} onChange={e => setFirstPayrollDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Check Date Offset (days after period end)</Label>
              <Input type="number" value={checkDateOffset} onChange={e => setCheckDateOffset(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earning Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />Default Earning Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {EARNING_TYPES.map(t => (
              <button
                key={t}
                onClick={() => toggleEarning(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  earningTypes.includes(t)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefit Deductions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Benefit Deductions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DEDUCTION_TYPES.map(d => (
              <button
                key={d}
                onClick={() => toggleDeduction(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  deductions.includes(d)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />Time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { value: 'native', label: 'Atlas Time Tracking', desc: 'Use built-in time tracking' },
              { value: 'integration', label: 'External Integration', desc: 'Connect existing system' },
              { value: 'none', label: 'No Time Tracking', desc: 'Salary employees only' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeTracking(opt.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  timeTracking === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-semibold">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save & Continue'}</Button>
      </div>
    </div>
  );
}
