import { useState } from 'react';
import { useCurrentVendor, useVendorBanking, useUpsertVendorBanking } from '@/hooks/useCurrentVendor';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

export default function ContractorBanking() {
  const { data: vendor } = useCurrentVendor();
  const { data: banking } = useVendorBanking(vendor?.id);
  const upsert = useUpsertVendorBanking();

  const [holder, setHolder] = useState('');
  const [type, setType] = useState<'checking' | 'savings'>('checking');
  const [routing, setRouting] = useState('');
  const [account, setAccount] = useState('');
  const [confirm, setConfirm] = useState('');

  if (!vendor) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  async function save() {
    if (!vendor) return;
    if (!/^\d{9}$/.test(routing)) return toast.error('Routing number must be 9 digits');
    if (!/^\d{4,17}$/.test(account)) return toast.error('Account number must be 4–17 digits');
    if (account !== confirm) return toast.error('Account numbers do not match');
    if (!holder.trim()) return toast.error('Account holder name required');
    try {
      await upsert.mutateAsync({
        vendor_id: vendor.id,
        company_id: vendor.company_id,
        account_holder_name: holder.trim(),
        account_type: type,
        routing_number: routing,
        account_number: account,
      });
      toast.success('Banking updated. Verification pending.');
      setRouting(''); setAccount(''); setConfirm('');
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <PageHeader title="Banking" description="ACH details for receiving payments" />

      {banking && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Current account</h2>
            <Badge variant={banking.verification_status === 'verified' ? 'default' : 'secondary'}>
              {banking.verification_status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {banking.account_holder_name} · {banking.account_type} · ••••{banking.account_number_last4} · routing ••••{banking.routing_number_last4}
          </p>
          <p className="text-xs text-muted-foreground">Last updated {new Date(banking.last_changed_at).toLocaleDateString()}</p>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-4 space-y-4">
        <h2 className="text-sm font-medium">{banking ? 'Replace account' : 'Add account'}</h2>
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Any change resets verification to <strong>pending</strong>. Atlas will re-verify before the next payment.</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Account holder name</Label><Input value={holder} onChange={(e) => setHolder(e.target.value)} /></div>
          <div>
            <Label>Account type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'checking' | 'savings')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Routing number</Label><Input value={routing} onChange={(e) => setRouting(e.target.value.replace(/\D/g, ''))} maxLength={9} /></div>
          <div><Label>Account number</Label><Input value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ''))} /></div>
          <div><Label>Confirm account number</Label><Input value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} /></div>
        </div>
        <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save banking'}</Button>
      </CardContent></Card>
    </div>
  );
}