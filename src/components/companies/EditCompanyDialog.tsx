import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUpdateCompany, type CompanyRow } from '@/hooks/useCompanies';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface Props {
  company: CompanyRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCompanyDialog({ company, open, onOpenChange }: Props) {
  const updateCompany = useUpdateCompany();

  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    dba_name: '',
    ein: '',
    entity_type: '',
    status: '' as CompanyRow['status'],
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    naics_code: '',
    business_description: '',
  });

  useEffect(() => {
    if (open && company) {
      setForm({
        name: company.name ?? '',
        legal_name: company.legal_name ?? '',
        dba_name: (company as any).dba_name ?? '',
        ein: company.ein ?? '',
        entity_type: (company as any).entity_type ?? '',
        status: company.status,
        address_line1: company.address_line1 ?? '',
        address_line2: company.address_line2 ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        zip: company.zip ?? '',
        primary_contact_name: company.primary_contact_name ?? '',
        primary_contact_email: company.primary_contact_email ?? '',
        primary_contact_phone: company.primary_contact_phone ?? '',
        naics_code: (company as any).naics_code ?? '',
        business_description: (company as any).business_description ?? '',
      });
    }
  }, [open, company]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    if (!form.ein.trim()) {
      toast.error('EIN is required');
      return;
    }
    if (!form.state) {
      toast.error('State is required');
      return;
    }
    if (!form.primary_contact_name.trim()) {
      toast.error('Primary contact name is required');
      return;
    }

    try {
      await updateCompany.mutateAsync({
        id: company.id,
        name: form.name.trim(),
        legal_name: form.legal_name.trim() || null,
        ein: form.ein.trim(),
        status: form.status,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim() || null,
        state: form.state,
        zip: form.zip.trim() || null,
        primary_contact_name: form.primary_contact_name.trim(),
        primary_contact_email: form.primary_contact_email.trim() || null,
        primary_contact_phone: form.primary_contact_phone.trim() || null,
      });
      toast.success('Company updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update company');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company — {company.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legal_name">Legal Name</Label>
                <Input id="legal_name" value={form.legal_name} onChange={e => set('legal_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dba_name">DBA Name</Label>
                <Input id="dba_name" value={form.dba_name} onChange={e => set('dba_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ein">EIN *</Label>
                <Input id="ein" value={form.ein} onChange={e => set('ein', e.target.value)} placeholder="XX-XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_type">Entity Type</Label>
                <Select value={form.entity_type} onValueChange={v => set('entity_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="s_corp">S-Corp</SelectItem>
                    <SelectItem value="c_corp">C-Corp</SelectItem>
                    <SelectItem value="sole_proprietor">Sole Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="naics_code">NAICS Code</Label>
                <Input id="naics_code" value={form.naics_code} onChange={e => set('naics_code', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_description">Business Description</Label>
              <Input id="business_description" value={form.business_description} onChange={e => set('business_description', e.target.value)} />
            </div>
          </TabsContent>

          {/* Address */}
          <TabsContent value="address" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input id="address_line1" value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input id="address_line2" value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={form.state} onValueChange={v => set('state', v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" value={form.zip} onChange={e => set('zip', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary_contact_name">Contact Name *</Label>
                <Input id="primary_contact_name" value={form.primary_contact_name} onChange={e => set('primary_contact_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_contact_email">Contact Email</Label>
                <Input id="primary_contact_email" type="email" value={form.primary_contact_email} onChange={e => set('primary_contact_email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_contact_phone">Contact Phone</Label>
                <Input id="primary_contact_phone" type="tel" value={form.primary_contact_phone} onChange={e => set('primary_contact_phone', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* Status */}
          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-2 max-w-xs">
              <Label>Company Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              {form.status === 'terminated' && form.status !== company.status && (
                <p className="text-xs text-destructive font-medium mt-1">
                  ⚠️ Terminating this company will also terminate all its employees.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateCompany.isPending}>
            {updateCompany.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
