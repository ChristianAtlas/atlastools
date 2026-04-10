import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, Check, Clock, Calendar, Briefcase, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeOffPolicyInput, AccrualMethod, ResetSchedule, UnusedHoursPolicy, PolicyType } from '@/hooks/useTimeOffPolicies';

const STEPS = [
  { label: 'Plan Type', description: 'Name and type of plan' },
  { label: 'Accrual Method', description: 'How employees earn time off' },
  { label: 'Eligible Earnings', description: 'Which earnings accrue time off' },
  { label: 'Caps & Limits', description: 'Balance and accrual caps' },
  { label: 'Reset & Carryover', description: 'Year reset and unused hours' },
  { label: 'Waiting Period', description: 'New employee waiting period' },
  { label: 'Review', description: 'Review and save' },
];

const EARNING_CODES = [
  { code: 'regular', label: 'Regular Earnings', default: true },
  { code: 'overtime', label: 'Overtime', default: false },
  { code: 'double_time', label: 'Double Time', default: false },
  { code: 'holiday', label: 'Holiday Pay', default: false },
  { code: 'pto', label: 'PTO Pay', default: false },
  { code: 'sick', label: 'Sick Pay', default: false },
  { code: 'bonus', label: 'Bonus', default: false },
  { code: 'commission', label: 'Commission', default: false },
];

interface Props {
  companyId: string;
  userId?: string;
  initial?: Partial<TimeOffPolicyInput>;
  onSave: (policy: TimeOffPolicyInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function TimeOffPolicyWizard({ companyId, userId, initial, onSave, onCancel, isSaving }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<TimeOffPolicyInput>({
    company_id: companyId,
    name: initial?.name ?? '',
    policy_type: initial?.policy_type ?? 'pto',
    accrual_method: initial?.accrual_method ?? 'per_pay_period',
    accrual_rate: initial?.accrual_rate ?? 0,
    eligible_earning_codes: initial?.eligible_earning_codes ?? ['regular'],
    balance_cap_hours: initial?.balance_cap_hours ?? null,
    annual_accrual_cap_hours: initial?.annual_accrual_cap_hours ?? null,
    reset_schedule: initial?.reset_schedule ?? 'calendar_year',
    custom_reset_date: initial?.custom_reset_date ?? null,
    unused_hours_policy: initial?.unused_hours_policy ?? 'carryover',
    carryover_max_hours: initial?.carryover_max_hours ?? null,
    waiting_period_days: initial?.waiting_period_days ?? 0,
    is_active: initial?.is_active ?? true,
    created_by: userId ?? null,
  });

  const update = (partial: Partial<TimeOffPolicyInput>) => setForm(prev => ({ ...prev, ...partial }));

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.accrual_rate > 0;
    return true;
  };

  const handleFinish = () => onSave(form);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                i === step ? 'bg-primary text-primary-foreground' :
                i < step ? 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20' :
                'text-muted-foreground bg-muted'
              )}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span className="text-xs">{i + 1}</span>}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-0.5" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step].label}</CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && <StepPlanType form={form} update={update} />}
          {step === 1 && <StepAccrualMethod form={form} update={update} />}
          {step === 2 && <StepEligibleEarnings form={form} update={update} />}
          {step === 3 && <StepCapsLimits form={form} update={update} />}
          {step === 4 && <StepResetCarryover form={form} update={update} />}
          {step === 5 && <StepWaitingPeriod form={form} update={update} />}
          {step === 6 && <StepReview form={form} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={isSaving}>
            <Check className="h-4 w-4 mr-1" /> {initial ? 'Update Policy' : 'Create Policy'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step Components ───

function StepPlanType({ form, update }: { form: TimeOffPolicyInput; update: (p: Partial<TimeOffPolicyInput>) => void }) {
  const presets: { type: PolicyType; label: string; icon: any }[] = [
    { type: 'pto', label: 'PTO (Paid Time Off)', icon: Clock },
    { type: 'vacation', label: 'Vacation', icon: Briefcase },
    { type: 'sick', label: 'Sick Leave', icon: AlertCircle },
    { type: 'custom', label: 'Custom Plan', icon: Calendar },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Plan Type</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {presets.map(p => {
            const Icon = p.icon;
            return (
              <button
                key={p.type}
                onClick={() => {
                  update({ policy_type: p.type });
                  if (p.type !== 'custom' && !form.name) update({ name: p.label.split(' (')[0] });
                }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left',
                  form.policy_type === p.type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="plan-name">Plan Name</Label>
        <Input
          id="plan-name"
          value={form.name}
          onChange={e => update({ name: e.target.value })}
          placeholder="e.g. Vacation, Sick Leave, PTO"
          className="mt-1"
        />
      </div>
    </div>
  );
}

function StepAccrualMethod({ form, update }: { form: TimeOffPolicyInput; update: (p: Partial<TimeOffPolicyInput>) => void }) {
  const methods: { value: AccrualMethod; label: string; desc: string }[] = [
    { value: 'per_hour_worked', label: 'Each hour worked', desc: 'Portion of Time Off for every hour worked' },
    { value: 'per_pay_period', label: 'Each pay period', desc: 'Portion of Time Off for every pay period worked' },
    { value: 'annual_allowance', label: 'Annual allowance', desc: 'Fixed number of hours per year' },
  ];

  const rateLabel = form.accrual_method === 'per_hour_worked'
    ? 'Hours of time off earned per hour worked'
    : form.accrual_method === 'per_pay_period'
    ? 'Hours of time off earned per pay period'
    : 'Total hours granted per year';

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium">How do your employees earn Time Off for this plan?</Label>
        <RadioGroup
          value={form.accrual_method}
          onValueChange={v => update({ accrual_method: v as AccrualMethod })}
          className="mt-3 space-y-3"
        >
          {methods.map(m => (
            <label
              key={m.value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                form.accrual_method === m.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value={m.value} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label htmlFor="accrual-rate">{rateLabel}</Label>
        <Input
          id="accrual-rate"
          type="number"
          min={0}
          step="0.01"
          value={form.accrual_rate || ''}
          onChange={e => update({ accrual_rate: parseFloat(e.target.value) || 0 })}
          className="mt-1 max-w-xs"
          placeholder="e.g. 3.08"
        />
        {form.accrual_method === 'per_pay_period' && form.accrual_rate > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {(form.accrual_rate * 26).toFixed(1)} hours/year (bi-weekly) or {(form.accrual_rate * 24).toFixed(1)} hours/year (semi-monthly)
          </p>
        )}
        {form.accrual_method === 'per_hour_worked' && form.accrual_rate > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {(form.accrual_rate * 2080).toFixed(1)} hours/year for a full-time employee (2,080 hrs/year)
          </p>
        )}
      </div>
    </div>
  );
}

function StepEligibleEarnings({ form, update }: { form: TimeOffPolicyInput; update: (p: Partial<TimeOffPolicyInput>) => void }) {
  const toggle = (code: string) => {
    const current = form.eligible_earning_codes;
    if (current.includes(code)) {
      update({ eligible_earning_codes: current.filter(c => c !== code) });
    } else {
      update({ eligible_earning_codes: [...current, code] });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Which earnings will earn Time Off for this plan?</Label>
      <p className="text-xs text-muted-foreground">Select the earning codes that count toward time off accrual.</p>
      <div className="space-y-2 mt-3">
        {EARNING_CODES.map(ec => (
          <label
            key={ec.code}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              form.eligible_earning_codes.includes(ec.code) ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-muted/50'
            )}
          >
            <Checkbox
              checked={form.eligible_earning_codes.includes(ec.code)}
              onCheckedChange={() => toggle(ec.code)}
            />
            <span className="text-sm">{ec.label}</span>
            {ec.default && <Badge variant="secondary" className="text-xs ml-auto">Default</Badge>}
          </label>
        ))}
      </div>
    </div>
  );
}

function StepCapsLimits({ form, update }: { form: TimeOffPolicyInput; update: (p: Partial<TimeOffPolicyInput>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="balance-cap">What's the max number of unused hours for this plan?</Label>
        <p className="text-xs text-muted-foreground mt-1">
          After employees reach the time off balance cap, they'll automatically stop accruing hours temporarily. Time off accruals resume once the plan balance falls below the cap.
        </p>
        <Input
          id="balance-cap"
          type="number"
          min={0}
          value={form.balance_cap_hours ?? ''}
          onChange={e => update({ balance_cap_hours: e.target.value ? parseFloat(e.target.value) : null })}
          className="mt-2 max-w-xs"
          placeholder="Leave blank for no cap"
        />
      </div>
      <Separator />
      <div>
        <Label htmlFor="annual-cap">What's the max number of hours an employee can accrue during the year?</Label>
        <p className="text-xs text-muted-foreground mt-1">
          After employees reach the max, they'll stop accruing hours until the next annual plan reset date.
        </p>
        <Input
          id="annual-cap"
          type="number"
          min={0}
          value={form.annual_accrual_cap_hours ?? ''}
          onChange={e => update({ annual_accrual_cap_hours: e.target.value ? parseFloat(e.target.value) : null })}
          className="mt-2 max-w-xs"
          placeholder="Leave blank for no cap"
        />
      </div>
    </div>
  );
}

function StepResetCarryover({ form, update }: { form: TimeOffPolicyInput; update: (p: Partial<TimeOffPolicyInput>) => void }) {
  const resetOptions: { value: ResetSchedule; label: string; desc: string }[] = [
    { value: 'calendar_year', label: 'Calendar year', desc: 'On January 1' },
    { value: 'hire_date', label: 'Hire date', desc: 'On the employee hire date' },
    { value: 'custom_date', label: 'Custom date', desc: 'On the date you select' },
  ];

  const unusedOptions: { value: UnusedHoursPolicy; label: string; desc: string }[] = [
    { value: 'clear', label: 'Clear hours', desc: 'Clear any unused time off hours at the end of the year.' },
    { value: 'carryover', label: 'Carry over hours', desc: 'Keep some or all unused time off hours.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium">When does this plan reset every year?</Label>
        <RadioGroup
          value={form.reset_schedule}
          onValueChange={v => update({ reset_schedule: v as ResetSchedule })}
          className="mt-3 space-y-2"
        >
          {resetOptions.map(o => (
            <label
              key={o.value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                form.reset_schedule === o.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value={o.value} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
        {form.reset_schedule === 'custom_date' && (
          <div className="mt-3">
            <Label htmlFor="custom-date">Custom Reset Date (MM-DD)</Label>
            <Input
              id="custom-date"
              value={form.custom_reset_date ?? ''}
              onChange={e => update({ custom_reset_date: e.target.value })}
              placeholder="e.g. 04-01"
              className="max-w-xs mt-1"
            />
          </div>
        )}
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">How do you handle unused hours for this plan?</Label>
        <RadioGroup
          value={form.unused_hours_policy}
          onValueChange={v => update({ unused_hours_policy: v as UnusedHoursPolicy })}
          className="mt-3 space-y-2"
        >
          {unusedOptions.map(o => (
            <label
              key={o.value}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                form.unused_hours_policy === o.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <RadioGroupItem value={o.value} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
        {form.unused_hours_policy === 'carryover' && (
          <div className="mt-3">
            <Label htmlFor="carryover-max">Max carryover hours</Label>
            <Input
              id="carryover-max"
              type="number"
              min={0}
              value={form.carryover_max_hours ?? ''}
              onChange={e => update({ carryover_max_hours: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="Leave blank for unlimited"
              className="max-w-xs mt-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepWaitingPeriod({ form, update }: { form: TimeOffPolicyInput; update: (p: Partial<TimeOffPolicyInput>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Set up a PTO waiting period?</Label>
        <p className="text-xs text-muted-foreground mt-1">
          New employees will be required to wait the number of days you choose before they can earn paid time off. They'll start earning time off during the payroll when the waiting period ends.
        </p>
      </div>
      <div>
        <Label htmlFor="waiting-days">Waiting period (days)</Label>
        <Input
          id="waiting-days"
          type="number"
          min={0}
          value={form.waiting_period_days}
          onChange={e => update({ waiting_period_days: parseInt(e.target.value) || 0 })}
          className="max-w-xs mt-1"
          placeholder="0 = no waiting period"
        />
        {form.waiting_period_days > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Employees will begin accruing after {form.waiting_period_days} days from their hire date.
          </p>
        )}
      </div>
    </div>
  );
}

function StepReview({ form }: { form: TimeOffPolicyInput }) {
  const methodLabels: Record<AccrualMethod, string> = {
    per_hour_worked: 'Per hour worked',
    per_pay_period: 'Per pay period',
    annual_allowance: 'Annual allowance',
  };

  const resetLabels: Record<ResetSchedule, string> = {
    calendar_year: 'January 1 (Calendar Year)',
    hire_date: 'Employee hire date',
    custom_date: `Custom: ${form.custom_reset_date ?? '—'}`,
  };

  const rows: [string, string][] = [
    ['Plan Name', form.name],
    ['Plan Type', form.policy_type],
    ['Accrual Method', methodLabels[form.accrual_method]],
    ['Accrual Rate', `${form.accrual_rate} hours`],
    ['Eligible Earnings', form.eligible_earning_codes.join(', ')],
    ['Balance Cap', form.balance_cap_hours != null ? `${form.balance_cap_hours} hours` : 'No cap'],
    ['Annual Accrual Cap', form.annual_accrual_cap_hours != null ? `${form.annual_accrual_cap_hours} hours` : 'No cap'],
    ['Reset Schedule', resetLabels[form.reset_schedule]],
    ['Unused Hours', form.unused_hours_policy === 'clear' ? 'Clear at reset' : `Carry over${form.carryover_max_hours != null ? ` (max ${form.carryover_max_hours} hrs)` : ' (unlimited)'}`],
    ['Waiting Period', form.waiting_period_days > 0 ? `${form.waiting_period_days} days` : 'None'],
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Review your time off policy settings before saving.</p>
      <div className="rounded-lg border divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
