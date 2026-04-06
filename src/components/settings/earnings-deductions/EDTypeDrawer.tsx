import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Save, X } from 'lucide-react';
import {
  type EarningDeductionType, type EarningDeductionCategory,
  CALCULATION_METHODS, PAY_BEHAVIORS, WORKER_TYPES, DEDUCTION_SIDES, TAX_TREATMENTS, SCOPES, AVAILABILITY_OPTIONS,
  useCreateEDType, useUpdateEDType,
} from '@/hooks/useEarningsDeductions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editType: EarningDeductionType | null;
  mode: 'earning' | 'deduction';
  categories: EarningDeductionCategory[];
  companyId?: string | null;
}

export function EDTypeDrawer({ open, onOpenChange, editType, mode, categories, companyId }: Props) {
  const createType = useCreateEDType();
  const updateType = useUpdateEDType();
  const isEdit = !!editType;

  const filteredCategories = categories.filter(c => c.type === mode);

  // Form state
  const [form, setForm] = useState(getDefaults());

  function getDefaults(): Record<string, any> {
    return {
      name: '', code: '', description: '', category_id: '',
      scope: companyId ? 'client_custom' : 'enterprise_custom',
      pay_behavior: 'paid', calculation_method: 'flat',
      default_rate: '', default_multiplier: '',
      worker_type: 'w2',
      pay_run_types: ['regular', 'off_cycle', 'bonus'],
      // Tax
      tax_federal_income: mode === 'earning', tax_social_security: mode === 'earning',
      tax_medicare: mode === 'earning', tax_futa: mode === 'earning',
      tax_state_income: mode === 'earning', tax_state_unemployment: mode === 'earning',
      tax_local: mode === 'earning',
      taxable: mode === 'earning',
      // Reporting
      reporting_w2_box: '', reporting_1099_type: '', reporting_box_code: '',
      reporting_box14_literal: '',
      // Special flags
      pto: false, tip: false, fringe_benefit: false, reimbursement: false,
      scorp: false, contractor_only: false, employer_paid_taxable: false,
      exclude_from_hours_worked: false,
      // Deduction specific
      deduction_side: 'employee', tax_treatment: 'post_tax',
      annual_limit_cents: '', catch_up_eligible: false, catch_up_limit_cents: '',
      stop_at_goal: false, goal_amount_cents: '',
      priority_order: 0,
      // Availability
      availability: 'all_clients',
      gl_code: '',
      is_active: true,
    };
  }

  useEffect(() => {
    if (editType) {
      const flags = editType.special_flags ?? [];
      setForm({
        name: editType.name, code: editType.code, description: editType.description ?? '',
        category_id: editType.category_id ?? '',
        scope: editType.scope,
        pay_behavior: editType.pay_behavior ?? 'paid',
        calculation_method: editType.calculation_method ?? 'flat',
        default_rate: editType.default_rate ?? '', default_multiplier: editType.default_multiplier ?? '',
        worker_type: editType.worker_type ?? 'w2',
        pay_run_types: editType.pay_run_types ?? ['regular', 'off_cycle', 'bonus'],
        tax_federal_income: editType.tax_federal_income, tax_social_security: editType.tax_social_security,
        tax_medicare: editType.tax_medicare, tax_futa: editType.tax_futa,
        tax_state_income: editType.tax_state_income, tax_state_unemployment: editType.tax_state_unemployment,
        tax_local: editType.tax_local, taxable: editType.taxable,
        reporting_w2_box: editType.reporting_w2_box ?? '', reporting_1099_type: editType.reporting_1099_type ?? '',
        reporting_box_code: editType.reporting_box_code ?? '', reporting_box14_literal: editType.reporting_box14_literal ?? '',
        pto: flags.includes('pto'), tip: flags.includes('tip'), fringe_benefit: flags.includes('fringe_benefit'),
        reimbursement: flags.includes('reimbursement'), scorp: flags.includes('scorp'),
        contractor_only: flags.includes('contractor_only'), employer_paid_taxable: flags.includes('employer_paid_taxable'),
        exclude_from_hours_worked: flags.includes('exclude_from_hours_worked'),
        deduction_side: editType.deduction_side ?? 'employee', tax_treatment: editType.tax_treatment ?? 'post_tax',
        annual_limit_cents: editType.annual_limit_cents ? (editType.annual_limit_cents / 100).toString() : '',
        catch_up_eligible: editType.catch_up_eligible,
        catch_up_limit_cents: editType.catch_up_limit_cents ? (editType.catch_up_limit_cents / 100).toString() : '',
        stop_at_goal: editType.stop_at_goal, 
        goal_amount_cents: editType.goal_amount_cents ? (editType.goal_amount_cents / 100).toString() : '',
        priority_order: editType.priority_order,
        availability: editType.availability ?? 'all_clients',
        gl_code: editType.gl_code ?? '',
        is_active: editType.is_active,
      });
    } else {
      setForm(getDefaults());
    }
  }, [editType, open, mode, companyId]);

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) {
      return;
    }

    const specialFlags: string[] = [];
    if (form.pto) specialFlags.push('pto');
    if (form.tip) specialFlags.push('tip');
    if (form.fringe_benefit) specialFlags.push('fringe_benefit');
    if (form.reimbursement) specialFlags.push('reimbursement');
    if (form.scorp) specialFlags.push('scorp');
    if (form.contractor_only) specialFlags.push('contractor_only');
    if (form.employer_paid_taxable) specialFlags.push('employer_paid_taxable');
    if (form.exclude_from_hours_worked) specialFlags.push('exclude_from_hours_worked');

    const payload: any = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase().replace(/\s+/g, '_'),
      category: mode,
      subcategory: form.tax_treatment || (mode === 'earning' ? 'regular' : 'post_tax'),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      scope: form.scope,
      pay_behavior: form.pay_behavior,
      calculation_method: form.calculation_method,
      default_rate: form.default_rate ? Number(form.default_rate) : null,
      default_multiplier: form.default_multiplier ? Number(form.default_multiplier) : null,
      worker_type: form.worker_type,
      pay_run_types: form.pay_run_types,
      tax_federal_income: form.tax_federal_income,
      tax_social_security: form.tax_social_security,
      tax_medicare: form.tax_medicare,
      tax_futa: form.tax_futa,
      tax_state_income: form.tax_state_income,
      tax_state_unemployment: form.tax_state_unemployment,
      tax_local: form.tax_local,
      taxable: form.taxable,
      reporting_w2_box: form.reporting_w2_box || null,
      reporting_1099_type: form.reporting_1099_type || null,
      reporting_box_code: form.reporting_box_code || null,
      reporting_box14_literal: form.reporting_box14_literal || null,
      special_flags: specialFlags,
      deduction_side: mode === 'deduction' ? form.deduction_side : null,
      tax_treatment: mode === 'deduction' ? form.tax_treatment : null,
      annual_limit_cents: form.annual_limit_cents ? Math.round(Number(form.annual_limit_cents) * 100) : null,
      catch_up_eligible: form.catch_up_eligible,
      catch_up_limit_cents: form.catch_up_limit_cents ? Math.round(Number(form.catch_up_limit_cents) * 100) : null,
      stop_at_goal: form.stop_at_goal,
      goal_amount_cents: form.goal_amount_cents ? Math.round(Number(form.goal_amount_cents) * 100) : null,
      priority_order: form.priority_order,
      availability: form.availability,
      gl_code: form.gl_code || null,
      is_active: form.is_active,
      company_id: companyId || null,
      is_default: false,
    };

    if (isEdit) {
      updateType.mutate({ id: editType.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createType.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isPending = createType.isPending || updateType.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[580px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {isEdit ? 'Edit' : 'Add'} {mode === 'earning' ? 'Earning' : 'Deduction'} Type
            {isEdit && editType?.is_default && (
              <Badge variant="outline" className="text-xs">System Default</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            <Tabs defaultValue="general">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                <TabsTrigger value="tax" className="text-xs">Tax & Reporting</TabsTrigger>
                {mode === 'earning' ? (
                  <TabsTrigger value="flags" className="text-xs">Flags</TabsTrigger>
                ) : (
                  <TabsTrigger value="limits" className="text-xs">Limits</TabsTrigger>
                )}
                <TabsTrigger value="availability" className="text-xs">Availability</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Type Name *</Label>
                    <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Shift Differential" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Short Code *</Label>
                    <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. SHIFT_DIFF" className="font-mono text-sm uppercase" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Description</Label>
                  <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this type..." rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Category</Label>
                    <Select value={form.category_id} onValueChange={v => set('category_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Scope</Label>
                    <Select value={form.scope} onValueChange={v => set('scope', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCOPES.filter(s => companyId ? s.value === 'client_custom' : s.value !== 'client_custom').map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {mode === 'earning' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Pay Behavior</Label>
                      <Select value={form.pay_behavior} onValueChange={v => set('pay_behavior', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAY_BEHAVIORS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Calculation Method</Label>
                      <Select value={form.calculation_method} onValueChange={v => set('calculation_method', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CALCULATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Deduction Side</Label>
                      <Select value={form.deduction_side} onValueChange={v => set('deduction_side', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEDUCTION_SIDES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Tax Treatment</Label>
                      <Select value={form.tax_treatment} onValueChange={v => set('tax_treatment', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TAX_TREATMENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Calculation Method</Label>
                    <Select value={form.calculation_method} onValueChange={v => set('calculation_method', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CALCULATION_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Worker Type</Label>
                    <Select value={form.worker_type} onValueChange={v => set('worker_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {WORKER_TYPES.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(form.calculation_method === 'multiplier_x_rate' || form.calculation_method === 'hours_x_rate') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Default Rate</Label>
                      <Input type="number" step="0.01" value={form.default_rate} onChange={e => set('default_rate', e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Default Multiplier</Label>
                      <Input type="number" step="0.1" value={form.default_multiplier} onChange={e => set('default_multiplier', e.target.value)} placeholder="1.5" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">GL Code</Label>
                  <Input value={form.gl_code} onChange={e => set('gl_code', e.target.value)} placeholder="e.g. 5100-001" className="font-mono text-sm" />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} id="active" />
                  <Label htmlFor="active" className="text-sm">Active</Label>
                </div>
              </TabsContent>

              <TabsContent value="tax" className="mt-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">Taxability</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'tax_federal_income', label: 'Federal Income Tax' },
                      { key: 'tax_social_security', label: 'Social Security' },
                      { key: 'tax_medicare', label: 'Medicare' },
                      { key: 'tax_futa', label: 'FUTA' },
                      { key: 'tax_state_income', label: 'State Income Tax' },
                      { key: 'tax_state_unemployment', label: 'State Unemployment (SUI)' },
                      { key: 'tax_local', label: 'Local Tax' },
                    ].map(t => (
                      <div key={t.key} className="flex items-center gap-2">
                        <Switch checked={form[t.key]} onCheckedChange={v => set(t.key, v)} id={t.key} />
                        <Label htmlFor={t.key} className="text-xs">{t.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Reporting</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">W-2 Box / Code</Label>
                      <Input value={form.reporting_w2_box} onChange={e => set('reporting_w2_box', e.target.value)} placeholder="e.g. 12D, 7, 8" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">1099 Type</Label>
                      <Select value={form.reporting_1099_type || '_none'} onValueChange={v => set('reporting_1099_type', v === '_none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          <SelectItem value="1099-NEC">1099-NEC</SelectItem>
                          <SelectItem value="1099-MISC">1099-MISC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Box 14 Literal</Label>
                      <Input value={form.reporting_box14_literal} onChange={e => set('reporting_box14_literal', e.target.value)} placeholder="e.g. CASDI" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Box Code</Label>
                      <Input value={form.reporting_box_code} onChange={e => set('reporting_box_code', e.target.value)} placeholder="e.g. Box 10, Box 11" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {mode === 'earning' ? (
                <TabsContent value="flags" className="mt-4 space-y-4">
                  <h4 className="text-sm font-medium mb-1">Special Flags</h4>
                  <p className="text-xs text-muted-foreground mb-3">These flags control how this earning type behaves in payroll calculations and reporting.</p>
                  <div className="space-y-3">
                    {[
                      { key: 'pto', label: 'PTO Earning', desc: 'Counts against PTO balance' },
                      { key: 'tip', label: 'Tip Earning', desc: 'Subject to tip credit and allocation rules' },
                      { key: 'fringe_benefit', label: 'Fringe Benefit', desc: 'Employer-provided benefit reported as income' },
                      { key: 'reimbursement', label: 'Reimbursement', desc: 'Accountable plan expense reimbursement' },
                      { key: 'scorp', label: 'S-Corp Specific', desc: '2% shareholder-employee special handling' },
                      { key: 'contractor_only', label: 'Contractor Only', desc: 'Available only for 1099 workers' },
                      { key: 'employer_paid_taxable', label: 'Employer-Paid Taxable Benefit', desc: 'Imputed income from employer benefit' },
                      { key: 'exclude_from_hours_worked', label: 'Exclude from Hours Worked', desc: 'Does not count toward overtime calculations' },
                    ].map(f => (
                      <div key={f.key} className="flex items-start gap-3">
                        <Switch checked={form[f.key]} onCheckedChange={v => set(f.key, v)} id={f.key} className="mt-0.5" />
                        <div>
                          <Label htmlFor={f.key} className="text-sm font-medium">{f.label}</Label>
                          <p className="text-xs text-muted-foreground">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ) : (
                <TabsContent value="limits" className="mt-4 space-y-4">
                  <h4 className="text-sm font-medium mb-1">Limits & Compliance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Annual Contribution Limit ($)</Label>
                      <Input type="number" step="0.01" value={form.annual_limit_cents} onChange={e => set('annual_limit_cents', e.target.value)} placeholder="23,500.00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Priority Order</Label>
                      <Input type="number" value={form.priority_order} onChange={e => set('priority_order', Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch checked={form.catch_up_eligible} onCheckedChange={v => set('catch_up_eligible', v)} id="catchup" />
                    <Label htmlFor="catchup" className="text-sm">Catch-Up Eligible (Age 50+)</Label>
                  </div>

                  {form.catch_up_eligible && (
                    <div className="space-y-1.5 pl-8">
                      <Label className="text-xs font-medium">Catch-Up Limit ($)</Label>
                      <Input type="number" step="0.01" value={form.catch_up_limit_cents} onChange={e => set('catch_up_limit_cents', e.target.value)} placeholder="7,750.00" />
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center gap-3">
                    <Switch checked={form.stop_at_goal} onCheckedChange={v => set('stop_at_goal', v)} id="goal" />
                    <Label htmlFor="goal" className="text-sm">Stop at Goal Amount</Label>
                  </div>

                  {form.stop_at_goal && (
                    <div className="space-y-1.5 pl-8">
                      <Label className="text-xs font-medium">Goal Amount ($)</Label>
                      <Input type="number" step="0.01" value={form.goal_amount_cents} onChange={e => set('goal_amount_cents', e.target.value)} />
                    </div>
                  )}

                  {form.tax_treatment === 'garnishment' && (
                    <>
                      <Separator />
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <h4 className="text-sm font-medium">Garnishment Settings</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">Garnishment-specific rules (disposable earnings, max withholding %, protected amounts, jurisdiction) are configured per-employee at the payroll level.</p>
                      </div>
                    </>
                  )}
                </TabsContent>
              )}

              <TabsContent value="availability" className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Availability</Label>
                  <Select value={form.availability} onValueChange={v => set('availability', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Pay Run Eligibility</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'regular', label: 'Regular Payroll' },
                      { value: 'off_cycle', label: 'Off-Cycle Payroll' },
                      { value: 'bonus', label: 'Bonus Payroll' },
                      { value: 'onboarding', label: 'Onboarding Setup' },
                    ].map(r => (
                      <div key={r.value} className="flex items-center gap-2">
                        <Switch
                          checked={form.pay_run_types?.includes(r.value)}
                          onCheckedChange={v => {
                            const current = form.pay_run_types ?? [];
                            set('pay_run_types', v ? [...current, r.value] : current.filter((x: string) => x !== r.value));
                          }}
                          id={`run_${r.value}`}
                        />
                        <Label htmlFor={`run_${r.value}`} className="text-xs">{r.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !form.name.trim() || !form.code.trim()}>
            <Save className="h-4 w-4 mr-1.5" />
            {isEdit ? 'Save Changes' : 'Create Type'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
