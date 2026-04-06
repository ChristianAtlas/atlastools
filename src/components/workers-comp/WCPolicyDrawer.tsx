import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCompanies } from '@/hooks/useCompanies';
import { useCreateWCPolicy, useUpdateWCPolicy, WCPolicy } from '@/hooks/useWorkersComp';
import { toast } from 'sonner';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const MONOPOLISTIC_STATES = ['ND','OH','WA','WY'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: WCPolicy | null;
}

export function WCPolicyDrawer({ open, onOpenChange, policy }: Props) {
  const isEdit = !!policy;
  const { data: companies = [] } = useCompanies();
  const create = useCreateWCPolicy();
  const update = useUpdateWCPolicy();

  const [form, setForm] = useState({
    company_id: '',
    carrier_name: '',
    policy_number: '',
    effective_date: '',
    expiration_date: '',
    states_covered: [] as string[],
    experience_mod: 1.0,
    is_monopolistic: false,
    minimum_premium_cents: 0,
    markup_type: 'percentage',
    markup_rate: 0.015,
    markup_flat_cents: 0,
    status: 'active',
    notes: '',
    state_fund_account: '',
    reporting_frequency: 'quarterly',
  });

  useEffect(() => {
    if (policy) {
      setForm({
        company_id: policy.company_id,
        carrier_name: policy.carrier_name,
        policy_number: policy.policy_number,
        effective_date: policy.effective_date,
        expiration_date: policy.expiration_date,
        states_covered: policy.states_covered || [],
        experience_mod: policy.experience_mod,
        is_monopolistic: policy.is_monopolistic,
        minimum_premium_cents: policy.minimum_premium_cents,
        markup_type: policy.markup_type,
        markup_rate: policy.markup_rate,
        markup_flat_cents: policy.markup_flat_cents,
        status: policy.status,
        notes: policy.notes || '',
        state_fund_account: policy.state_fund_account || '',
        reporting_frequency: policy.reporting_frequency || 'quarterly',
      });
    } else {
      setForm({
        company_id: '', carrier_name: '', policy_number: '', effective_date: '', expiration_date: '',
        states_covered: [], experience_mod: 1.0, is_monopolistic: false, minimum_premium_cents: 0,
        markup_type: 'percentage', markup_rate: 0.015, markup_flat_cents: 0, status: 'active',
        notes: '', state_fund_account: '', reporting_frequency: 'quarterly',
      });
    }
  }, [policy, open]);

  const handleStateToggle = (state: string) => {
    setForm(prev => ({
      ...prev,
      states_covered: prev.states_covered.includes(state)
        ? prev.states_covered.filter(s => s !== state)
        : [...prev.states_covered, state],
      is_monopolistic: prev.states_covered.includes(state)
        ? prev.states_covered.filter(s => s !== state).some(s => MONOPOLISTIC_STATES.includes(s))
        : [...prev.states_covered, state].some(s => MONOPOLISTIC_STATES.includes(s)),
    }));
  };

  const handleSave = async () => {
    if (!form.company_id || !form.carrier_name || !form.policy_number || !form.effective_date || !form.expiration_date) {
      toast.error('Fill all required fields');
      return;
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: policy!.id, ...form });
        toast.success('Policy updated');
      } else {
        await create.mutateAsync(form);
        toast.success('Policy created');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit' : 'Add'} WC Policy</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div>
            <Label>Client *</Label>
            <Select value={form.company_id} onValueChange={v => setForm(p => ({ ...p, company_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Carrier Name *</Label>
              <Input value={form.carrier_name} onChange={e => setForm(p => ({ ...p, carrier_name: e.target.value }))} />
            </div>
            <div>
              <Label>Policy Number *</Label>
              <Input value={form.policy_number} onChange={e => setForm(p => ({ ...p, policy_number: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Effective Date *</Label>
              <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} />
            </div>
            <div>
              <Label>Expiration Date *</Label>
              <Input type="date" value={form.expiration_date} onChange={e => setForm(p => ({ ...p, expiration_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>Experience Modifier (Mod)</Label>
            <Input type="number" step="0.01" value={form.experience_mod} onChange={e => setForm(p => ({ ...p, experience_mod: parseFloat(e.target.value) || 1 }))} />
          </div>

          <div>
            <Label>States Covered</Label>
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
              {US_STATES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStateToggle(s)}
                  className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                    form.states_covered.includes(s)
                      ? MONOPOLISTIC_STATES.includes(s)
                        ? 'bg-amber-100 border-amber-400 text-amber-700'
                        : 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {form.is_monopolistic && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">⚠ Includes monopolistic state(s): {form.states_covered.filter(s => MONOPOLISTIC_STATES.includes(s)).join(', ')}</p>
            )}
          </div>

          {form.is_monopolistic && (
            <div className="space-y-3 p-3 rounded-lg border border-amber-300 bg-amber-50">
              <p className="text-xs font-medium text-amber-700">Monopolistic State Configuration</p>
              <div>
                <Label className="text-xs">State Fund Account #</Label>
                <Input value={form.state_fund_account} onChange={e => setForm(p => ({ ...p, state_fund_account: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Reporting Frequency</Label>
                <Select value={form.reporting_frequency} onValueChange={v => setForm(p => ({ ...p, reporting_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            <p className="text-xs font-medium text-foreground">Internal Markup (AtlasOne only)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Markup Type</Label>
                <Select value={form.markup_type} onValueChange={v => setForm(p => ({ ...p, markup_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Fee</SelectItem>
                    <SelectItem value="blended">Blended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.markup_type === 'percentage' || form.markup_type === 'blended') && (
                <div>
                  <Label className="text-xs">Markup Rate (%)</Label>
                  <Input type="number" step="0.001" value={(form.markup_rate * 100).toFixed(1)} onChange={e => setForm(p => ({ ...p, markup_rate: parseFloat(e.target.value) / 100 || 0 }))} />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={create.isPending || update.isPending}>
              {isEdit ? 'Update Policy' : 'Create Policy'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
