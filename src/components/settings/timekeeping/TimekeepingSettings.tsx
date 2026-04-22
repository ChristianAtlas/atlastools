import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, DollarSign, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTKSettings, useUpsertTKSettings, useTKPricing, useUpdateTKPricing } from '@/hooks/useTimekeeping';

interface Props {
  /** When provided, manage this client. Otherwise show super-admin pricing controls. */
  companyId?: string;
  /** True if current user is super admin. */
  isSuperAdmin?: boolean;
}

const DEFAULTS = {
  workweek_start_day: 0,
  pay_period_type: 'biweekly',
  require_geolocation: false,
  require_job_selection: false,
  allow_manual_entry: true,
  allow_self_correct_missed_punch: true,
  meal_break_minutes: 30,
  rest_breaks_enabled: false,
  break_attestation_required: false,
  rounding_minutes: 0,
  daily_ot_threshold: 8,
  weekly_ot_threshold: 40,
  require_manager_approval: true,
  multi_level_approval: false,
  late_threshold_minutes: 5,
  no_show_threshold_minutes: 60,
};

export function TimekeepingSettings({ companyId, isSuperAdmin }: Props) {
  const { data: settings, isLoading } = useTKSettings(companyId);
  const upsert = useUpsertTKSettings();
  const { data: pricing } = useTKPricing();
  const updatePricing = useUpdateTKPricing();

  const [draft, setDraft] = useState<any>({ ...DEFAULTS, is_enabled: false });
  const [pricingDraft, setPricingDraft] = useState<string>('');

  useEffect(() => {
    if (settings) setDraft({ ...DEFAULTS, ...settings });
    else setDraft({ ...DEFAULTS, is_enabled: false });
  }, [settings]);

  useEffect(() => {
    if (pricing) setPricingDraft((pricing.per_employee_cents / 100).toString());
  }, [pricing]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const handleToggleEnabled = (v: boolean) => {
    if (!companyId) return;
    set('is_enabled', v);
    upsert.mutate({ ...draft, is_enabled: v, company_id: companyId } as any, {
      onSuccess: () => toast.success(v ? 'Timekeeping add-on activated' : 'Timekeeping add-on deactivated'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleSave = () => {
    if (!companyId) return;
    upsert.mutate({ ...draft, company_id: companyId } as any, {
      onSuccess: () => toast.success('Timekeeping settings saved'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleSavePricing = () => {
    if (!pricing) return;
    const dollars = parseFloat(pricingDraft);
    if (Number.isNaN(dollars) || dollars < 0) { toast.error('Enter a valid price'); return; }
    updatePricing.mutate({ id: pricing.id, per_employee_cents: Math.round(dollars * 100) }, {
      onSuccess: () => toast.success('Pricing updated'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      {/* Super-admin pricing card */}
      {isSuperAdmin && pricing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Add-on pricing</CardTitle>
                <CardDescription>Per active employee with time or PTO entered each month.</CardDescription>
              </div>
              <Badge variant="outline">Effective {pricing.effective_date}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 max-w-[200px]">
              <Label htmlFor="tk-price">Price per active employee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input id="tk-price" type="number" step="0.01" min="0" value={pricingDraft} onChange={e => setPricingDraft(e.target.value)} className="pl-6" />
              </div>
            </div>
            <Button onClick={handleSavePricing} disabled={updatePricing.isPending} className="gap-1.5">
              {updatePricing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Update price
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Per-company toggle + policy controls */}
      {companyId && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Timekeeping add-on</CardTitle>
                  <CardDescription>Enable to allow employees to clock in, track breaks, and submit timecards. Billed monthly per active employee.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={draft.is_enabled ? 'default' : 'secondary'}>{draft.is_enabled ? 'Active' : 'Inactive'}</Badge>
                  <Switch checked={!!draft.is_enabled} onCheckedChange={handleToggleEnabled} disabled={upsert.isPending} />
                </div>
              </div>
            </CardHeader>
          </Card>

          {draft.is_enabled && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Punch & break policy</CardTitle>
                  <CardDescription>How employees record time and breaks.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <ToggleRow label="Require geolocation on punch" checked={draft.require_geolocation} onChange={v => set('require_geolocation', v)} />
                  <ToggleRow label="Require job/site selection" checked={draft.require_job_selection} onChange={v => set('require_job_selection', v)} />
                  <ToggleRow label="Allow manual time entry" checked={draft.allow_manual_entry} onChange={v => set('allow_manual_entry', v)} />
                  <ToggleRow label="Allow self-correct missed punches" checked={draft.allow_self_correct_missed_punch} onChange={v => set('allow_self_correct_missed_punch', v)} />
                  <ToggleRow label="Enable rest break tracking" checked={draft.rest_breaks_enabled} onChange={v => set('rest_breaks_enabled', v)} />
                  <ToggleRow label="Require break attestation at clock-out" checked={draft.break_attestation_required} onChange={v => set('break_attestation_required', v)} />
                  <NumberRow label="Meal break (minutes)" value={draft.meal_break_minutes} onChange={v => set('meal_break_minutes', v)} />
                  <NumberRow label="Punch rounding (minutes)" value={draft.rounding_minutes} onChange={v => set('rounding_minutes', v)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overtime & attendance</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <NumberRow label="Daily overtime threshold (hours)" value={draft.daily_ot_threshold} onChange={v => set('daily_ot_threshold', v)} />
                  <NumberRow label="Weekly overtime threshold (hours)" value={draft.weekly_ot_threshold} onChange={v => set('weekly_ot_threshold', v)} />
                  <NumberRow label="Late threshold (minutes)" value={draft.late_threshold_minutes} onChange={v => set('late_threshold_minutes', v)} />
                  <NumberRow label="No-show threshold (minutes)" value={draft.no_show_threshold_minutes} onChange={v => set('no_show_threshold_minutes', v)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Approval workflow</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <ToggleRow label="Require manager approval" checked={draft.require_manager_approval} onChange={v => set('require_manager_approval', v)} />
                  <ToggleRow label="Multi-level approval" checked={draft.multi_level_approval} onChange={v => set('multi_level_approval', v)} />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
                  {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save settings
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-md border p-3 space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" min={0} value={value ?? 0} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}