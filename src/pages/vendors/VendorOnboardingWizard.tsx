import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import {
  useCreateVendor, useAddPriorYtd,
  VENDOR_1099_CATEGORIES,
  type VendorWorkerType, type Vendor1099Category,
} from '@/hooks/useVendors';

type WizardData = {
  worker_type: VendorWorkerType | null;
  company_id: string;
  // individual
  first_name: string;
  last_name: string;
  date_of_birth: string;
  // entity
  business_name: string;
  contact_name: string;
  // shared
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  tax_id_type: 'ssn' | 'ein' | 'itin';
  tax_id_full: string;
  default_1099_category: Vendor1099Category;
  backup_withholding_enabled: boolean;
  notes: string;
  prior_year: number;
  prior_amount: string;
  prior_category: Vendor1099Category;
  prior_backup_withholding: string;
};

const INITIAL: WizardData = {
  worker_type: null,
  company_id: '',
  first_name: '', last_name: '', date_of_birth: '',
  business_name: '', contact_name: '',
  email: '', phone: '',
  address_line1: '', address_line2: '', city: '', state: '', zip: '',
  tax_id_type: 'ssn', tax_id_full: '',
  default_1099_category: 'nec',
  backup_withholding_enabled: false,
  notes: '',
  prior_year: new Date().getFullYear(),
  prior_amount: '',
  prior_category: 'nec',
  prior_backup_withholding: '',
};

const STEPS = ['Type', 'Identity', 'Tax & address', 'Prior YTD', 'Review'];

function formatTaxId(raw: string, type: 'ssn' | 'ein' | 'itin'): string {
  const d = raw.replace(/\D/g, '').slice(0, 9);
  if (type === 'ein') {
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}-${d.slice(2)}`;
  }
  // SSN / ITIN: ###-##-####
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export default function VendorOnboardingWizard() {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    ...INITIAL,
    company_id: profile?.company_id ?? '',
  });

  const { data: companies } = useCompanies();
  const createVendor = useCreateVendor();
  const addPriorYtd = useAddPriorYtd();

  const isEntity = data.worker_type === 'c2c_vendor';

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  function canAdvance(): boolean {
    if (step === 0) return !!data.worker_type && !!data.company_id;
    if (step === 1) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
      const phoneOk = data.phone.replace(/\D/g, '').length >= 10;
      if (!emailOk || !phoneOk) return false;
      if (isEntity) return !!data.business_name.trim();
      return (
        !!data.first_name.trim() &&
        !!data.last_name.trim() &&
        !!data.date_of_birth.trim()
      );
    }
    if (step === 2) {
      const digits = data.tax_id_full.replace(/\D/g, '');
      return digits.length === 9;
    }
    return true;
  }

  async function handleSubmit() {
    if (!data.worker_type || !data.company_id) return;
    const legal_name = isEntity
      ? data.business_name.trim()
      : `${data.first_name.trim()} ${data.last_name.trim()}`.trim();

    try {
      const created = await createVendor.mutateAsync({
        company_id: data.company_id,
        worker_type: data.worker_type,
        is_c2c: isEntity,
        legal_name,
        first_name: isEntity ? null : data.first_name || null,
        last_name: isEntity ? null : data.last_name || null,
        date_of_birth: isEntity ? null : data.date_of_birth || null,
        business_name: isEntity ? data.business_name : null,
        contact_name: isEntity ? data.contact_name || null : null,
        email: data.email || null,
        phone: data.phone || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        tax_id_type: data.tax_id_type,
        tax_id_last4: data.tax_id_full.replace(/\D/g, '').slice(-4),
        default_1099_category: data.default_1099_category,
        backup_withholding_enabled: data.backup_withholding_enabled,
        notes: data.notes || null,
      });

      const priorAmount = parseFloat(data.prior_amount || '0');
      if (priorAmount > 0) {
        await addPriorYtd.mutateAsync({
          vendor_id: created.id,
          company_id: data.company_id,
          reporting_year: data.prior_year,
          category: data.prior_category,
          amount_cents: Math.round(priorAmount * 100),
          backup_withholding_cents: Math.round(parseFloat(data.prior_backup_withholding || '0') * 100),
          source_description: 'Onboarding entry',
          entered_by_name: profile?.full_name ?? null,
        });
      }

      toast.success(`Vendor ${created.vid} created`);
      navigate(`/vendors/${created.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create vendor');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Add a vendor" description="Onboard a 1099 contractor or C2C vendor" />

      <ol className="flex items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                i < step ? 'bg-primary text-primary-foreground'
                : i === step ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={i === step ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <Card className="p-6 space-y-5">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold">Who are you onboarding?</h3>
              <p className="text-sm text-muted-foreground">VID workers are paid as non-employees. Tax engine is bypassed.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TypeCard
                selected={data.worker_type === '1099_ic'}
                onClick={() => update({ worker_type: '1099_ic' })}
                icon={<User className="h-5 w-5" />}
                title="1099 Independent Contractor"
                desc="An individual paid by SSN, TIN, or ITIN. Eligible for portal access."
              />
              <TypeCard
                selected={data.worker_type === 'c2c_vendor'}
                onClick={() => update({ worker_type: 'c2c_vendor', tax_id_type: 'ein' })}
                icon={<Building2 className="h-5 w-5" />}
                title="C2C Vendor"
                desc="A business entity paid by EIN. Admin-managed only."
              />
            </div>

            {isSuperAdmin && (
              <div>
                <Label>Client</Label>
                <Select value={data.company_id} onValueChange={(v) => update({ company_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {companies?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.cid})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {isEntity ? (
              <>
                <Field label="Legal business name *">
                  <Input value={data.business_name} onChange={(e) => update({ business_name: e.target.value })} />
                </Field>
                <Field label="Primary contact name">
                  <Input value={data.contact_name} onChange={(e) => update({ contact_name: e.target.value })} />
                </Field>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Legal first name *">
                  <Input value={data.first_name} onChange={(e) => update({ first_name: e.target.value })} />
                </Field>
                <Field label="Legal last name *">
                  <Input value={data.last_name} onChange={(e) => update({ last_name: e.target.value })} />
                </Field>
                <Field label="Date of birth *">
                  <Input type="date" value={data.date_of_birth} onChange={(e) => update({ date_of_birth: e.target.value })} />
                </Field>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email *"><Input type="email" value={data.email} onChange={(e) => update({ email: e.target.value })} /></Field>
              <Field label="Phone *"><Input value={data.phone} onChange={(e) => update({ phone: e.target.value })} /></Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Tax ID type">
                <Select value={data.tax_id_type} onValueChange={(v) => update({ tax_id_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!isEntity && <SelectItem value="ssn">SSN</SelectItem>}
                    {!isEntity && <SelectItem value="itin">ITIN</SelectItem>}
                    <SelectItem value="ein">EIN</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={`Full ${data.tax_id_type.toUpperCase()} *`}
              >
                <Input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={data.tax_id_type === 'ein' ? '12-3456789' : '123-45-6789'}
                  maxLength={data.tax_id_type === 'ein' ? 10 : 11}
                  value={formatTaxId(data.tax_id_full, data.tax_id_type)}
                  onChange={(e) =>
                    update({ tax_id_full: e.target.value.replace(/\D/g, '').slice(0, 9) })
                  }
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Required for 1099 reporting. Only the last 4 digits are stored in plain text.
                </p>
              </Field>
              <Field label="Default 1099 category">
                <Select value={data.default_1099_category} onValueChange={(v) => update({ default_1099_category: v as Vendor1099Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_1099_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.form} · {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Address line 1"><Input value={data.address_line1} onChange={(e) => update({ address_line1: e.target.value })} /></Field>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="City"><Input value={data.city} onChange={(e) => update({ city: e.target.value })} /></Field>
              <Field label="State"><Input maxLength={2} value={data.state} onChange={(e) => update({ state: e.target.value.toUpperCase() })} /></Field>
              <Field label="ZIP"><Input value={data.zip} onChange={(e) => update({ zip: e.target.value })} /></Field>
              <Field label="Backup withholding">
                <div className="flex items-center h-10">
                  <Switch checked={data.backup_withholding_enabled} onCheckedChange={(v) => update({ backup_withholding_enabled: v })} />
                </div>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Prior year-to-date 1099 earnings</h3>
              <p className="text-sm text-muted-foreground">
                Optional. Enter wages this vendor was paid outside AtlasOne earlier this year.
                These are preserved for year-end reporting if AtlasOne files the 1099.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Reporting year">
                <Input type="number" value={data.prior_year} onChange={(e) => update({ prior_year: parseInt(e.target.value) || data.prior_year })} />
              </Field>
              <Field label="Category">
                <Select value={data.prior_category} onValueChange={(v) => update({ prior_category: v as Vendor1099Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_1099_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.form} · {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Prior amount paid (USD)">
                <Input inputMode="decimal" placeholder="0.00" value={data.prior_amount} onChange={(e) => update({ prior_amount: e.target.value })} />
              </Field>
              <Field label="Backup withholding (USD)">
                <Input inputMode="decimal" placeholder="0.00" value={data.prior_backup_withholding} onChange={(e) => update({ prior_backup_withholding: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes"><Textarea value={data.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Internal notes (optional)" /></Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Review &amp; create</h3>
            <ReviewRow label="Worker type" value={isEntity ? 'C2C Vendor' : '1099 Independent Contractor'} />
            <ReviewRow label="Legal name" value={isEntity ? data.business_name : `${data.first_name} ${data.last_name}`.trim()} />
            <ReviewRow
              label="Tax ID"
              value={`${data.tax_id_type.toUpperCase()} ••• ••• ${data.tax_id_full.replace(/\D/g, '').slice(-4) || '----'}`}
            />
            <ReviewRow label="Default 1099 category" value={VENDOR_1099_CATEGORIES.find((c) => c.value === data.default_1099_category)?.label ?? '—'} />
            <ReviewRow label="Backup withholding" value={data.backup_withholding_enabled ? 'Enabled (24%)' : 'Disabled'} />
            <ReviewRow
              label="Prior YTD"
              value={parseFloat(data.prior_amount || '0') > 0
                ? `$${parseFloat(data.prior_amount).toFixed(2)} (${data.prior_year})`
                : 'None entered'}
            />
            <p className="text-xs text-muted-foreground">
              On create, a VID will be assigned. W-9 status starts as <strong>Not collected</strong>.
              You can upload the W-9 from the vendor profile page next.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate('/vendors') : setStep(step - 1))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canAdvance()} onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createVendor.isPending}>
              {createVendor.isPending ? 'Creating…' : 'Create vendor'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TypeCard({ selected, onClick, icon, title, desc }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition-colors ${
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:bg-muted/40'
      }`}
    >
      <div className="flex items-center gap-2 font-medium text-sm">{icon}{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}