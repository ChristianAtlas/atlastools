import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useCreateWCCode, useUpdateWCCode, useDeleteWCCode, WCCode } from '@/hooks/useWorkersComp';
import { useWCCodeRateHistory } from '@/hooks/useWorkersComp';
import { toast } from 'sonner';
import { Trash2, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code?: WCCode | null;
  policyId: string;
  companyId: string;
}

export function WCCodeDrawer({ open, onOpenChange, code, policyId, companyId }: Props) {
  const isEdit = !!code;
  const create = useCreateWCCode();
  const update = useUpdateWCCode();
  const remove = useDeleteWCCode();

  const [form, setForm] = useState({
    code: '',
    description: '',
    state: '',
    rate_per_hundred: 0,
    rate_basis: 'per_hundred' as 'per_hundred' | 'per_hour',
    internal_markup_rate: 0,
    markup_rate_override: null as number | null,
    effective_date: new Date().toISOString().slice(0, 10),
    expiration_date: '',
    is_active: true,
    notes: '',
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { data: rateHistory = [] } = useWCCodeRateHistory(isEdit ? code?.id : undefined);

  useEffect(() => {
    if (code) {
      setForm({
        code: code.code,
        description: code.description,
        state: code.state,
        rate_per_hundred: code.rate_per_hundred,
        rate_basis: code.rate_basis || 'per_hundred',
        internal_markup_rate: code.internal_markup_rate || 0,
        markup_rate_override: code.markup_rate_override ?? null,
        effective_date: code.effective_date,
        expiration_date: code.expiration_date || '',
        is_active: code.is_active,
        notes: code.notes || '',
      });
    } else {
      setForm({ code: '', description: '', state: '', rate_per_hundred: 0, rate_basis: 'per_hundred', internal_markup_rate: 0, markup_rate_override: null, effective_date: new Date().toISOString().slice(0, 10), expiration_date: '', is_active: true, notes: '' });
    }
    setConfirmDelete(false);
    setShowHistory(false);
  }, [code, open]);

  const handleSave = async () => {
    if (!form.code || !form.description || !form.state) {
      toast.error('Fill all required fields');
      return;
    }
    try {
      const payload = {
        ...form,
        policy_id: policyId,
        company_id: companyId,
        expiration_date: form.expiration_date || null,
      };
      if (isEdit) {
        await update.mutateAsync({ id: code!.id, ...payload });
        toast.success('Class code updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Class code added');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await remove.mutateAsync(code!.id);
      toast.success('Class code removed');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit' : 'Add'} WC Class Code</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>WC Code *</Label>
              <Input placeholder="e.g. 8810" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
            </div>
            <div>
              <Label>State *</Label>
              <Select value={form.state} onValueChange={v => setForm(p => ({ ...p, state: v }))}>
                <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description *</Label>
            <Input placeholder="e.g. Clerical Office Employees" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <Separator />

          <div>
            <Label>Rate Basis</Label>
            <Select value={form.rate_basis} onValueChange={(v: 'per_hundred' | 'per_hour') => setForm(p => ({ ...p, rate_basis: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_hundred">Rate per $100 Wages</SelectItem>
                <SelectItem value="per_hour">Rate per Hour Worked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{form.rate_basis === 'per_hundred' ? 'Rate per $100 Wages' : 'Rate per Hour Worked'}</Label>
            <Input type="number" step="0.01" value={form.rate_per_hundred} onChange={e => setForm(p => ({ ...p, rate_per_hundred: parseFloat(e.target.value) || 0 }))} />
          </div>

          <div>
            <Label>Internal Markup %</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Hidden markup applied on top of the base rate. Not visible to clients.</p>
            <Input type="number" step="0.1" placeholder="e.g. 1.5" value={form.internal_markup_rate} onChange={e => setForm(p => ({ ...p, internal_markup_rate: parseFloat(e.target.value) || 0 }))} />
          </div>

          <div>
            <Label>Markup Override (optional)</Label>
            <p className="text-[11px] text-muted-foreground mb-1">Per-code markup override. Leave blank to use policy default.</p>
            <Input type="number" step="0.1" placeholder="Inherit from policy" value={form.markup_rate_override ?? ''} onChange={e => setForm(p => ({ ...p, markup_rate_override: e.target.value ? parseFloat(e.target.value) : null }))} />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea placeholder="Internal notes…" className="min-h-[60px]" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effective_date} onChange={e => setForm(p => ({ ...p, effective_date: e.target.value }))} />
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input type="date" value={form.expiration_date} onChange={e => setForm(p => ({ ...p, expiration_date: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={create.isPending || update.isPending}>
              {isEdit ? 'Update Code' : 'Add Code'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>

          {isEdit && (
            <div className="pt-2 space-y-3">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHistory(!showHistory)}>
                <History className="h-3.5 w-3.5 mr-1.5" />
                {showHistory ? 'Hide' : 'Show'} Rate History
              </Button>

              {showHistory && (
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y text-xs">
                  {rateHistory.length === 0 ? (
                    <p className="py-3 text-center text-muted-foreground">No rate history</p>
                  ) : rateHistory.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="font-mono tabular-nums">${Number(r.rate_per_hundred).toFixed(2)}</span>
                        <span className="text-muted-foreground ml-1">{r.rate_basis === 'per_hour' ? '/hr' : '/$100'}</span>
                        <span className="text-muted-foreground ml-2">+{(r.markup_rate * 100).toFixed(2)}%</span>
                      </div>
                      <div className="text-right text-muted-foreground">
                        {format(new Date(r.effective_date), 'MMM d, yyyy')}
                        {r.end_date ? (
                          <span> — {format(new Date(r.end_date), 'MMM d, yyyy')}</span>
                        ) : (
                          <Badge variant="outline" className="ml-1 text-[9px] border-emerald-500 text-emerald-600">Current</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDelete}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {confirmDelete ? 'Confirm Delete' : 'Delete Code'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
