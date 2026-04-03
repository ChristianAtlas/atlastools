import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, X, MapPin } from 'lucide-react';
import { validateEIN, type WizardData } from '@/hooks/useClientOnboarding';
import { BILLING_TIERS } from '@/lib/billing-config';
import { useToast } from '@/hooks/use-toast';

const ENTITY_TYPES = ['LLC', 'S-Corp', 'C-Corp', 'Partnership', 'Sole Proprietorship', 'Non-Profit'];
const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface Props {
  data: WizardData;
  onSave: (data: Partial<WizardData>) => void;
  isSaving: boolean;
}

export function CompanySetupStep({ data, onSave, isSaving }: Props) {
  const { toast } = useToast();
  const c = data.company || {} as NonNullable<WizardData['company']>;

  const [form, setForm] = useState({
    legal_name: c.legal_name || '',
    dba_name: c.dba_name || '',
    ein: c.ein || '',
    entity_type: c.entity_type || '',
    state_of_incorporation: c.state_of_incorporation || '',
    date_of_incorporation: c.date_of_incorporation || '',
    naics_code: c.naics_code || '',
    business_description: c.business_description || '',
    selected_tier: c.selected_tier || 'peo_basic',
    selected_addons: c.selected_addons || [] as string[],
    benefit_type: c.benefit_type || 'atlasone' as 'atlasone' | 'external' | 'none',
    mailing_same_as_physical: c.mailing_same_as_physical ?? true,
  });

  const [address, setAddress] = useState(c.physical_address || { line1: '', line2: '', city: '', state: '', zip: '' });
  const [mailingAddress, setMailingAddress] = useState(c.mailing_address || { line1: '', line2: '', city: '', state: '', zip: '' });
  const [primaryContact, setPrimaryContact] = useState(c.primary_contact || { name: '', email: '', phone: '' });
  const [payrollContact, setPayrollContact] = useState(c.payroll_contact || { name: '', email: '', phone: '' });
  const [hrContact, setHrContact] = useState(c.hr_contact || { name: '', email: '', phone: '' });
  const [financeContact, setFinanceContact] = useState(c.finance_contact || { name: '', email: '', phone: '' });
  const [workLocations, setWorkLocations] = useState(c.work_locations || [{ state: '', city: '' }]);
  const [showContacts, setShowContacts] = useState(false);

  const handleSubmit = () => {
    if (!form.legal_name || !form.ein || !form.entity_type || !form.state_of_incorporation) {
      toast({ title: 'Missing required fields', description: 'Please fill in Legal Name, FEIN, Entity Type, and State.', variant: 'destructive' });
      return;
    }
    if (!validateEIN(form.ein)) {
      toast({ title: 'Invalid FEIN', description: 'Format must be XX-XXXXXXX', variant: 'destructive' });
      return;
    }
    if (!address.line1 || !address.city || !address.state || !address.zip) {
      toast({ title: 'Missing address', description: 'Physical address is required.', variant: 'destructive' });
      return;
    }
    if (!primaryContact.name || !primaryContact.email) {
      toast({ title: 'Missing contact', description: 'Primary contact name and email are required.', variant: 'destructive' });
      return;
    }

    onSave({
      company: {
        ...form,
        physical_address: address,
        mailing_address: form.mailing_same_as_physical ? address : mailingAddress,
        primary_contact: primaryContact,
        payroll_contact: payrollContact.name ? payrollContact : undefined,
        hr_contact: hrContact.name ? hrContact : undefined,
        finance_contact: financeContact.name ? financeContact : undefined,
        work_locations: workLocations.filter(w => w.state),
      },
    });
  };

  const toggleAddon = (slug: string) => {
    setForm(prev => ({
      ...prev,
      selected_addons: prev.selected_addons.includes(slug)
        ? prev.selected_addons.filter(a => a !== slug)
        : [...prev.selected_addons, slug],
    }));
  };

  return (
    <div className="space-y-5">
      {/* PEO Tier Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            PEO Tier & Add-ons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(BILLING_TIERS).filter(([, t]) => !t.isAddon).map(([slug, tier]) => (
              <button
                key={slug}
                onClick={() => setForm(p => ({ ...p, selected_tier: slug }))}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  form.selected_tier === slug
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <p className="text-sm font-semibold">{tier.name}</p>
                <p className="text-lg font-bold text-primary">
                  ${tier.pricePerEmployee}{tier.perEmployee ? '/ee/mo' : '/mo'}
                </p>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Optional Add-ons</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BILLING_TIERS).filter(([, t]) => t.isAddon).map(([slug, tier]) => (
                <button
                  key={slug}
                  onClick={() => toggleAddon(slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.selected_addons.includes(slug)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  {tier.name} (+${tier.pricePerEmployee}/ee)
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Legal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Legal Company Name *</Label>
              <Input value={form.legal_name} onChange={e => setForm(p => ({ ...p, legal_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>DBA Name</Label>
              <Input value={form.dba_name} onChange={e => setForm(p => ({ ...p, dba_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>FEIN * (XX-XXXXXXX)</Label>
              <Input value={form.ein} onChange={e => setForm(p => ({ ...p, ein: e.target.value }))} placeholder="12-3456789" />
            </div>
            <div className="space-y-1.5">
              <Label>Entity Type *</Label>
              <Select value={form.entity_type} onValueChange={v => setForm(p => ({ ...p, entity_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State of Incorporation *</Label>
              <Select value={form.state_of_incorporation} onValueChange={v => setForm(p => ({ ...p, state_of_incorporation: v }))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Incorporation</Label>
              <Input type="date" value={form.date_of_incorporation} onChange={e => setForm(p => ({ ...p, date_of_incorporation: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>NAICS Code</Label>
              <Input value={form.naics_code} onChange={e => setForm(p => ({ ...p, naics_code: e.target.value }))} placeholder="e.g. 541511" />
            </div>
            <div className="space-y-1.5">
              <Label>Benefit Offerings</Label>
              <Select value={form.benefit_type} onValueChange={v => setForm(p => ({ ...p, benefit_type: v as 'atlasone' | 'external' | 'none' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="atlasone">AtlasOne Benefits Package</SelectItem>
                  <SelectItem value="external">Bring Your Own Benefits</SelectItem>
                  <SelectItem value="none">No Benefits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label>Business Description</Label>
            <Textarea value={form.business_description} onChange={e => setForm(p => ({ ...p, business_description: e.target.value }))} rows={2} />
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Addresses</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Physical Address *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Address Line 1" value={address.line1} onChange={e => setAddress(p => ({ ...p, line1: e.target.value }))} />
              <Input placeholder="Address Line 2" value={address.line2} onChange={e => setAddress(p => ({ ...p, line2: e.target.value }))} />
              <Input placeholder="City" value={address.city} onChange={e => setAddress(p => ({ ...p, city: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={address.state} onValueChange={v => setAddress(p => ({ ...p, state: v }))}>
                  <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="ZIP" value={address.zip} onChange={e => setAddress(p => ({ ...p, zip: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.mailing_same_as_physical}
              onCheckedChange={(v) => setForm(p => ({ ...p, mailing_same_as_physical: !!v }))}
            />
            <Label className="text-sm">Mailing address same as physical</Label>
          </div>
          {!form.mailing_same_as_physical && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Mailing Address</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Address Line 1" value={mailingAddress.line1} onChange={e => setMailingAddress(p => ({ ...p, line1: e.target.value }))} />
                <Input placeholder="Address Line 2" value={mailingAddress.line2} onChange={e => setMailingAddress(p => ({ ...p, line2: e.target.value }))} />
                <Input placeholder="City" value={mailingAddress.city} onChange={e => setMailingAddress(p => ({ ...p, city: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={mailingAddress.state} onValueChange={v => setMailingAddress(p => ({ ...p, state: v }))}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="ZIP" value={mailingAddress.zip} onChange={e => setMailingAddress(p => ({ ...p, zip: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Locations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Work Locations (Multi-State)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workLocations.map((loc, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={loc.state} onValueChange={v => {
                const updated = [...workLocations];
                updated[i] = { ...updated[i], state: v };
                setWorkLocations(updated);
              }}>
                <SelectTrigger className="w-32"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Input
                placeholder="City (optional)"
                value={loc.city || ''}
                onChange={e => {
                  const updated = [...workLocations];
                  updated[i] = { ...updated[i], city: e.target.value };
                  setWorkLocations(updated);
                }}
                className="flex-1"
              />
              {workLocations.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setWorkLocations(workLocations.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setWorkLocations([...workLocations, { state: '', city: '' }])}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Location
          </Button>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Primary Contact *</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Full Name" value={primaryContact.name} onChange={e => setPrimaryContact(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Email" type="email" value={primaryContact.email} onChange={e => setPrimaryContact(p => ({ ...p, email: e.target.value }))} />
              <Input placeholder="Phone" value={primaryContact.phone} onChange={e => setPrimaryContact(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <Button variant="link" size="sm" onClick={() => setShowContacts(!showContacts)} className="text-xs px-0">
            {showContacts ? 'Hide' : 'Add'} additional contacts (Payroll, HR, Finance)
          </Button>
          {showContacts && (
            <div className="space-y-4">
              {[
                { label: 'Payroll Contact', state: payrollContact, setter: setPayrollContact },
                { label: 'HR Contact', state: hrContact, setter: setHrContact },
                { label: 'Finance/Billing Contact', state: financeContact, setter: setFinanceContact },
              ].map(({ label, state, setter }) => (
                <div key={label}>
                  <Label className="text-xs text-muted-foreground mb-2 block">{label}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Full Name" value={state.name} onChange={e => setter(p => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Email" type="email" value={state.email} onChange={e => setter(p => ({ ...p, email: e.target.value }))} />
                    <Input placeholder="Phone" value={state.phone} onChange={e => setter(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
