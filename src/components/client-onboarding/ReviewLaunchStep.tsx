import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, FileText, DollarSign, Users, Rocket, CheckCircle2, AlertCircle,
  Edit, MapPin, Shield, FileCheck, PenLine,
} from 'lucide-react';
import type { WizardData } from '@/hooks/useClientOnboarding';
import { BILLING_TIERS } from '@/lib/billing-config';

interface Props {
  data: WizardData;
  onLaunch: (review: NonNullable<WizardData['review']>) => void;
  onBack: () => void;
  onEdit: (step: number) => void;
  isLaunching: boolean;
}

function SectionHeader({ icon: Icon, title, step, onEdit, status }: {
  icon: React.ElementType; title: string; step: number; onEdit: (s: number) => void;
  status: 'complete' | 'incomplete' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
        {status === 'complete' && <CheckCircle2 className="h-4 w-4 text-success" />}
        {status === 'incomplete' && <AlertCircle className="h-4 w-4 text-destructive" />}
        {status === 'warning' && <AlertCircle className="h-4 w-4 text-warning" />}
      </div>
      <Button variant="ghost" size="sm" className="text-xs" onClick={() => onEdit(step)}>
        <Edit className="h-3 w-3 mr-1" />Edit
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

export function ReviewLaunchStep({ data, onLaunch, onBack, onEdit, isLaunching }: Props) {
  const c = data.company;
  const t = data.tax;
  const p = data.payroll;
  const e = data.employees;

  const today = new Date().toISOString().slice(0, 10);
  const [signerName, setSignerName] = useState(data.review?.form_8973_signer_name || c?.primary_contact?.name || '');
  const [signerTitle, setSignerTitle] = useState(data.review?.form_8973_signer_title || '');
  const [contractBegin, setContractBegin] = useState(data.review?.form_8973_contract_begin_date || today);
  const [acknowledgeCoemployment, setAcknowledgeCoemployment] = useState(!!data.review?.form_8973_signed);
  const [signed, setSigned] = useState(!!data.review?.form_8973_signed);

  const form8973Complete = useMemo(
    () => signed && !!signerName.trim() && !!signerTitle.trim() && !!contractBegin && acknowledgeCoemployment,
    [signed, signerName, signerTitle, contractBegin, acknowledgeCoemployment],
  );

  const companyComplete = !!(c?.legal_name && c?.ein && c?.entity_type && c?.state_of_incorporation);
  const taxComplete = !!(t?.state_registrations?.length);
  const payrollComplete = !!(p?.pay_frequency);
  const hasEmployees = (e?.employee_data?.length || 0) > 0;
  const canLaunch = companyComplete && payrollComplete && form8973Complete;

  const blockers: string[] = [];
  if (!companyComplete) blockers.push('Company information incomplete');
  if (!c?.ein) blockers.push('FEIN is required');
  if (!payrollComplete) blockers.push('Pay frequency not configured');
  if (!t?.state_registrations?.length) blockers.push('No state registrations configured');
  if (!form8973Complete) blockers.push('IRS Form 8973 must be signed by client before going live');

  const warnings: string[] = [];
  if (!t?.csa_uploaded) warnings.push('Client Service Agreement not uploaded');
  if (!t?.ach_authorized) warnings.push('ACH funding not authorized');
  if (!t?.workers_comp?.carrier) warnings.push('Workers comp carrier not specified');
  if (!hasEmployees) warnings.push('No employees imported');

  const tierInfo = c?.selected_tier ? BILLING_TIERS[c.selected_tier as keyof typeof BILLING_TIERS] : null;

  const handleLaunch = () => {
    onLaunch({
      launch_confirmed: true,
      form_8973_signed: signed,
      form_8973_signer_name: signerName.trim(),
      form_8973_signer_title: signerTitle.trim(),
      form_8973_signed_at: new Date().toISOString(),
      form_8973_contract_begin_date: contractBegin,
    });
  };


  return (
    <div className="space-y-5">
      {/* Launch readiness */}
      <Card className={canLaunch ? 'border-success/50' : 'border-destructive/50'}>
        <CardContent className="py-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${canLaunch ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {canLaunch
                ? <Rocket className="h-6 w-6 text-success" />
                : <AlertCircle className="h-6 w-6 text-destructive" />
              }
            </div>
            <div>
              <p className="text-base font-semibold">{canLaunch ? 'Ready to Launch' : 'Not Ready'}</p>
              <p className="text-sm text-muted-foreground">
                {canLaunch
                  ? `${warnings.length} warning(s) — you can still launch`
                  : `${blockers.length} blocker(s) must be resolved`
                }
              </p>
            </div>
          </div>
          {blockers.length > 0 && (
            <div className="mt-4 space-y-1">
              {blockers.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />{b}
                </div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-warning">
                  <AlertCircle className="h-3 w-3" />{w}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Summary */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <SectionHeader icon={Building2} title="Company Setup" step={1} onEdit={onEdit} status={companyComplete ? 'complete' : 'incomplete'} />
          <Separator />
          <InfoRow label="Legal Name" value={c?.legal_name} />
          <InfoRow label="DBA" value={c?.dba_name} />
          <InfoRow label="FEIN" value={c?.ein} />
          <InfoRow label="Entity Type" value={c?.entity_type} />
          <InfoRow label="State" value={c?.state_of_incorporation} />
          <InfoRow label="NAICS Code" value={c?.naics_code} />
          <InfoRow label="PEO Tier" value={tierInfo?.name} />
          {c?.selected_addons?.length ? (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Add-ons</span>
              <div className="flex gap-1">
                {c.selected_addons.map(a => (
                  <Badge key={a} variant="secondary" className="text-[10px]">
                    {BILLING_TIERS[a as keyof typeof BILLING_TIERS]?.name || a}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <InfoRow label="Primary Contact" value={c?.primary_contact?.name} />
          <InfoRow label="Contact Email" value={c?.primary_contact?.email} />
          {(c?.work_locations?.length || 0) > 0 && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Work Locations</span>
              <div className="flex gap-1">
                {c!.work_locations!.map((l, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{l.state}{l.city ? ` — ${l.city}` : ''}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Summary */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <SectionHeader icon={FileText} title="Tax & Compliance" step={2} onEdit={onEdit} status={taxComplete ? 'complete' : 'warning'} />
          <Separator />
          <InfoRow label="IRS Deposit Schedule" value={t?.irs_deposit_schedule === 'semi_weekly' ? 'Semi-Weekly' : t?.irs_deposit_schedule === 'monthly' ? 'Monthly' : undefined} />
          <InfoRow label="Prior Provider" value={t?.prior_payroll_provider} />
          <InfoRow label="State Registrations" value={`${t?.state_registrations?.length || 0} state(s)`} />
          <InfoRow label="WC Carrier" value={t?.workers_comp?.carrier} />
          <InfoRow label="CSA Status" value={t?.csa_uploaded ? '✓ Uploaded' : 'Not uploaded'} />
          <InfoRow label="ACH Authorization" value={t?.ach_authorized ? '✓ Authorized' : 'Not authorized'} />
        </CardContent>
      </Card>

      {/* Payroll Summary */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <SectionHeader icon={DollarSign} title="Payroll Configuration" step={3} onEdit={onEdit} status={payrollComplete ? 'complete' : 'incomplete'} />
          <Separator />
          <InfoRow label="Pay Frequency" value={p?.pay_frequency} />
          <InfoRow label="First Payroll Date" value={p?.first_payroll_date} />
          <InfoRow label="Earning Types" value={p?.default_earning_types?.join(', ')} />
          <InfoRow label="Deductions" value={p?.benefit_deductions?.join(', ') || 'None'} />
          <InfoRow label="Time Tracking" value={p?.time_tracking_method} />
        </CardContent>
      </Card>

      {/* Employee Summary */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <SectionHeader icon={Users} title="Employee Import" step={4} onEdit={onEdit} status={hasEmployees ? 'complete' : 'warning'} />
          <Separator />
          <InfoRow label="Import Method" value={e?.import_method} />
          <InfoRow label="Employee Count" value={e?.employee_data?.length || 0} />
          {hasEmployees && (
            <div className="rounded-md border overflow-auto max-h-48 mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="py-1.5 px-2 text-left font-medium">Name</th>
                    <th className="py-1.5 px-2 text-left font-medium">Title</th>
                    <th className="py-1.5 px-2 text-left font-medium">Pay Type</th>
                  </tr>
                </thead>
                <tbody>
                  {e!.employee_data!.slice(0, 10).map((emp, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 px-2">{emp.first_name} {emp.last_name}</td>
                      <td className="py-1.5 px-2">{emp.title || '—'}</td>
                      <td className="py-1.5 px-2">{emp.pay_type}</td>
                    </tr>
                  ))}
                  {(e!.employee_data!.length > 10) && (
                    <tr><td colSpan={3} className="py-1.5 px-2 text-muted-foreground">... and {e!.employee_data!.length - 10} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IRS Form 8973 — Required Client Signature */}
      <Card className={form8973Complete ? 'border-success/50' : 'border-warning/50'}>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">IRS Form 8973 — Client Signature</span>
              <Badge variant="outline" className="text-[10px] uppercase border-destructive/40 text-destructive">Required</Badge>
              {form8973Complete && <CheckCircle2 className="h-4 w-4 text-success" />}
            </div>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            By signing Form 8973, the client acknowledges the CPEO co-employment relationship with AtlasOne HR.
            The CPEO is responsible for federal employment tax obligations on wages paid under this contract.
            <span className="font-medium text-foreground"> A signed Form 8973 is required before going live.</span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contract_begin">Contract Begin Date *</Label>
              <Input
                id="contract_begin"
                type="date"
                value={contractBegin}
                onChange={(ev) => setContractBegin(ev.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client Legal Name</Label>
              <Input value={c?.legal_name || ''} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signer_name">Signer Name *</Label>
              <Input
                id="signer_name"
                value={signerName}
                onChange={(ev) => setSignerName(ev.target.value)}
                placeholder="Authorized client representative"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signer_title">Signer Title *</Label>
              <Input
                id="signer_title"
                value={signerTitle}
                onChange={(ev) => setSignerTitle(ev.target.value)}
                placeholder="e.g. CEO, CFO, Owner"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="ack_coemployment"
              checked={acknowledgeCoemployment}
              onCheckedChange={(v) => setAcknowledgeCoemployment(!!v)}
            />
            <Label htmlFor="ack_coemployment" className="text-xs font-normal cursor-pointer leading-relaxed">
              I acknowledge the CPEO co-employment relationship with AtlasOne HR and confirm I have authority to bind the company to this Form 8973 filing.
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="signed"
              checked={signed}
              onCheckedChange={(v) => setSigned(!!v)}
              disabled={!signerName.trim() || !signerTitle.trim() || !acknowledgeCoemployment}
            />
            <Label htmlFor="signed" className="text-xs font-medium cursor-pointer leading-relaxed flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5 text-primary" />
              Sign Form 8973 electronically as <span className="font-semibold">{signerName || '—'}</span>
              {signerTitle && <span className="text-muted-foreground">({signerTitle})</span>}
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          onClick={handleLaunch}
          disabled={!canLaunch || isLaunching}
          className="bg-success hover:bg-success/90 text-success-foreground"
        >
          <Rocket className="h-4 w-4 mr-1.5" />
          {isLaunching ? 'Launching...' : 'Launch Client'}
        </Button>
      </div>
    </div>
  );
}
