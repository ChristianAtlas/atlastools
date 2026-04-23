import { useMemo, useState } from 'react';
import { Plus, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ELIGIBILITY_LABELS,
  evaluateVendorEligibility,
  useCreateVendorPayment,
  useVendors,
  VENDOR_1099_CATEGORIES,
  type Vendor1099Category,
  type VendorPaymentMethod,
} from '@/hooks/useVendors';

interface Props {
  runId: string;
  companyId: string;
  alreadyAddedVendorIds?: string[];
  trigger?: React.ReactNode;
}

const PAYMENT_METHODS: { value: VendorPaymentMethod; label: string }[] = [
  { value: 'ach', label: 'ACH (direct deposit)' },
  { value: 'check', label: 'Manual check' },
  { value: 'external', label: 'External / paid outside' },
];

export function AddVendorPaymentDialog({ runId, companyId, alreadyAddedVendorIds = [], trigger }: Props) {
  const [open, setOpen] = useState(false);
  const { data: vendors } = useVendors({ companyId });
  const create = useCreateVendorPayment();
  const { toast } = useToast();

  const [vendorId, setVendorId] = useState<string>('');
  const [gross, setGross] = useState('');
  const [bw, setBw] = useState('');
  const [category, setCategory] = useState<Vendor1099Category>('nec');
  const [method, setMethod] = useState<VendorPaymentMethod>('ach');
  const [reference, setReference] = useState('');
  const [memo, setMemo] = useState('');

  const enriched = useMemo(() => {
    return (vendors ?? []).map((v) => ({ v, e: evaluateVendorEligibility(v) }));
  }, [vendors]);

  const selectedVendor = enriched.find((x) => x.v.id === vendorId);

  const reset = () => {
    setVendorId(''); setGross(''); setBw(''); setCategory('nec'); setMethod('ach'); setReference(''); setMemo('');
  };

  const submit = async () => {
    if (!vendorId || !gross) {
      toast({ title: 'Missing fields', description: 'Pick a vendor and enter a gross amount.', variant: 'destructive' });
      return;
    }
    if (selectedVendor && !selectedVendor.e.eligible) {
      toast({
        title: 'Vendor blocked',
        description: selectedVendor.e.blockers.map((b) => ELIGIBILITY_LABELS[b]).join(', '),
        variant: 'destructive',
      });
      return;
    }
    const grossCents = Math.round(Number(gross) * 100);
    const bwCents = Math.round(Number(bw || '0') * 100);
    try {
      await create.mutateAsync({
        vendor_payment_run_id: runId,
        vendor_id: vendorId,
        company_id: companyId,
        gross_amount_cents: grossCents,
        backup_withholding_cents: bwCents,
        category,
        payment_method: method,
        check_number: method === 'check' ? reference || null : null,
        external_reference: method === 'external' ? reference || null : null,
        memo: memo || null,
      });
      toast({ title: 'Payment added' });
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add payment';
      toast({ title: 'Eligibility check failed', description: msg, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add vendor payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add vendor payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
              <SelectContent>
                {enriched
                  .filter((x) => !alreadyAddedVendorIds.includes(x.v.id))
                  .map(({ v, e }) => (
                    <SelectItem key={v.id} value={v.id} disabled={!e.eligible}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{v.vid}</span>
                        <span>{v.legal_name}</span>
                        {!e.eligible && <span className="text-xs text-destructive">· blocked</span>}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVendor && !selectedVendor.e.eligible && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium mb-1">
                <ShieldAlert className="h-4 w-4" /> Cannot pay this vendor
              </div>
              <ul className="text-xs space-y-0.5 ml-6 list-disc">
                {selectedVendor.e.blockers.map((b) => <li key={b}>{ELIGIBILITY_LABELS[b]}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gross amount (USD)</Label>
              <Input type="number" step="0.01" min="0" value={gross} onChange={(e) => setGross(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Backup withholding (USD)</Label>
              <Input type="number" step="0.01" min="0" value={bw} onChange={(e) => setBw(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>1099 category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Vendor1099Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDOR_1099_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.form} · {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as VendorPaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(method === 'check' || method === 'external') && (
            <div>
              <Label>{method === 'check' ? 'Check number' : 'External reference'}</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Memo / notes</Label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending || !vendorId || !gross}>
            {create.isPending ? 'Adding…' : 'Add payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}