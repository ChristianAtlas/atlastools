import { useEffect, useState } from 'react';
import { useCurrentVendor, useUpdateContractorProfile } from '@/hooks/useCurrentVendor';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';

export default function ContractorProfile() {
  const { data: vendor } = useCurrentVendor();
  const update = useUpdateContractorProfile();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (vendor) setForm({
      first_name: vendor.first_name ?? '',
      last_name: vendor.last_name ?? '',
      business_name: vendor.business_name ?? '',
      contact_name: vendor.contact_name ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address_line1: vendor.address_line1 ?? '',
      address_line2: vendor.address_line2 ?? '',
      city: vendor.city ?? '',
      state: vendor.state ?? '',
      zip: vendor.zip ?? '',
      date_of_birth: vendor.date_of_birth ?? '',
    });
  }, [vendor]);

  if (!vendor) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const isC2C = vendor.is_c2c || vendor.worker_type === 'c2c_vendor';

  async function save() {
    if (!vendor) return;
    try {
      await update.mutateAsync({
        vendorId: vendor.id,
        updates: { ...form, date_of_birth: isC2C ? null : (form.date_of_birth || null) },
      });
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="My profile" description="Tax ID, status, and W-9 are managed by your administrator." />
      <Card><CardContent className="p-4 grid gap-4 md:grid-cols-2">
        {isC2C ? (
          <>
            <div><Label>Business name</Label><Input value={form.business_name} onChange={f('business_name')} /></div>
            <div><Label>Contact name</Label><Input value={form.contact_name} onChange={f('contact_name')} /></div>
          </>
        ) : (
          <>
            <div><Label>First name</Label><Input value={form.first_name} onChange={f('first_name')} /></div>
            <div><Label>Last name</Label><Input value={form.last_name} onChange={f('last_name')} /></div>
            <div><Label>Date of birth</Label><Input type="date" value={form.date_of_birth} onChange={f('date_of_birth')} /></div>
          </>
        )}
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={f('email')} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={f('phone')} /></div>
        <div className="md:col-span-2"><Label>Address line 1</Label><Input value={form.address_line1} onChange={f('address_line1')} /></div>
        <div className="md:col-span-2"><Label>Address line 2</Label><Input value={form.address_line2} onChange={f('address_line2')} /></div>
        <div><Label>City</Label><Input value={form.city} onChange={f('city')} /></div>
        <div><Label>State</Label><Input value={form.state} onChange={f('state')} maxLength={2} /></div>
        <div><Label>ZIP</Label><Input value={form.zip} onChange={f('zip')} /></div>
      </CardContent></Card>
      <Button onClick={save} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
    </div>
  );
}