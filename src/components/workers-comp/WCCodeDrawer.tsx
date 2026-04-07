import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useCreateWCCode, useUpdateWCCode, useDeleteWCCode, WCCode } from '@/hooks/useWorkersComp';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

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
    effective_date: new Date().toISOString().slice(0, 10),
    expiration_date: '',
    is_active: true,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (code) {
      setForm({
        code: code.code,
        description: code.description,
        state: code.state,
        rate_per_hundred: code.rate_per_hundred,
        rate_basis: code.rate_basis || 'per_hundred',
        internal_markup_rate: code.internal_markup_rate || 0,
        effective_date: code.effective_date,
        expiration_date: code.expiration_date || '',
        is_active: code.is_active,
      });
    } else {
      setForm({ code: '', description: '', state: '', rate_per_hundred: 0, rate_basis: 'per_hundred', internal_markup_rate: 0, effective_date: new Date().toISOString().slice(0, 10), expiration_date: '', is_active: true });
    }
    setConfirmDelete(false);
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
            <div className="pt-2">
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
