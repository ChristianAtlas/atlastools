import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateForm8973, useDeleteForm8973, FORM_8973_STATUSES, getStatusConfig } from '@/hooks/useForm8973';
import type { Form8973Filing } from '@/hooks/useForm8973';
import { toast } from 'sonner';
import { Trash2, Send, CheckCircle2, FileSignature } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filing: Form8973Filing | null;
}

export function Form8973DetailDialog({ open, onOpenChange, filing }: Props) {
  const update = useUpdateForm8973();
  const remove = useDeleteForm8973();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState({
    cpeo_name: '',
    cpeo_ein: '',
    client_legal_name: '',
    client_ein: '',
    client_address_line1: '',
    client_address_line2: '',
    client_city: '',
    client_state: '',
    client_zip: '',
    client_contact_name: '',
    client_contact_phone: '',
    client_contact_email: '',
    contract_begin_date: '',
    contract_end_date: '',
    is_new_contract: true,
    signer_name: '',
    signer_title: '',
    irs_confirmation_number: '',
    notes: '',
    status: 'draft',
  });

  useEffect(() => {
    if (filing) {
      setForm({
        cpeo_name: filing.cpeo_name || '',
        cpeo_ein: filing.cpeo_ein || '',
        client_legal_name: filing.client_legal_name || '',
        client_ein: filing.client_ein || '',
        client_address_line1: filing.client_address_line1 || '',
        client_address_line2: filing.client_address_line2 || '',
        client_city: filing.client_city || '',
        client_state: filing.client_state || '',
        client_zip: filing.client_zip || '',
        client_contact_name: filing.client_contact_name || '',
        client_contact_phone: filing.client_contact_phone || '',
        client_contact_email: filing.client_contact_email || '',
        contract_begin_date: filing.contract_begin_date || '',
        contract_end_date: filing.contract_end_date || '',
        is_new_contract: filing.is_new_contract,
        signer_name: filing.signer_name || '',
        signer_title: filing.signer_title || '',
        irs_confirmation_number: filing.irs_confirmation_number || '',
        notes: filing.notes || '',
        status: filing.status,
      });
    }
    setConfirmDelete(false);
  }, [filing, open]);

  if (!filing) return null;

  const set = (key: string, val: string | boolean) => setForm(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: filing.id,
        ...form,
        contract_end_date: form.contract_end_date || null,
      });
      toast.success('Filing updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRequestSignature = async () => {
    try {
      await update.mutateAsync({
        id: filing.id,
        status: 'pending_signature',
        signature_requested_at: new Date().toISOString(),
      });
      toast.success('Signature requested — status updated to Pending Signature');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMarkSigned = async () => {
    if (!form.signer_name) {
      toast.error('Enter signer name before marking as signed');
      return;
    }
    try {
      await update.mutateAsync({
        id: filing.id,
        status: 'signed',
        signed_at: new Date().toISOString(),
        signer_name: form.signer_name,
        signer_title: form.signer_title,
      });
      toast.success('Filing marked as signed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmitToIRS = async () => {
    try {
      await update.mutateAsync({
        id: filing.id,
        status: 'submitted',
        submitted_to_irs_at: new Date().toISOString(),
      });
      toast.success('Filing marked as submitted to IRS');
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
      await remove.mutateAsync(filing.id);
      toast.success('Filing deleted');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sc = getStatusConfig(form.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            IRS Form 8973 — {filing.company_name || 'Filing'}
            <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Timeline summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Premier Date</p>
              <p className="text-sm font-medium mt-0.5">
                {filing.company_premier_date ? format(new Date(filing.company_premier_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sig Requested</p>
              <p className="text-sm font-medium mt-0.5">
                {filing.signature_requested_at ? format(new Date(filing.signature_requested_at), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Signed</p>
              <p className="text-sm font-medium mt-0.5">
                {filing.signed_at ? format(new Date(filing.signed_at), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">IRS Submitted</p>
              <p className="text-sm font-medium mt-0.5">
                {filing.submitted_to_irs_at ? format(new Date(filing.submitted_to_irs_at), 'MMM d, yyyy') : '—'}
              </p>
            </div>
          </div>

          {/* Workflow actions */}
          <div className="flex flex-wrap gap-2">
            {form.status === 'draft' && (
              <Button size="sm" variant="outline" onClick={handleRequestSignature}>
                <Send className="h-3.5 w-3.5 mr-1.5" />Send for Signature
              </Button>
            )}
            {(form.status === 'draft' || form.status === 'pending_signature') && (
              <Button size="sm" variant="outline" onClick={handleMarkSigned}>
                <FileSignature className="h-3.5 w-3.5 mr-1.5" />Mark Signed
              </Button>
            )}
            {form.status === 'signed' && (
              <Button size="sm" variant="outline" onClick={handleSubmitToIRS}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Submit to IRS
              </Button>
            )}
          </div>

          <Separator />

          {/* CPEO Information */}
          <div>
            <h4 className="text-sm font-semibold mb-3">CPEO Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CPEO Name</Label>
                <Input value={form.cpeo_name} onChange={e => set('cpeo_name', e.target.value)} placeholder="AtlasOne PEO" />
              </div>
              <div>
                <Label>CPEO EIN</Label>
                <Input value={form.cpeo_ein} onChange={e => set('cpeo_ein', e.target.value)} placeholder="XX-XXXXXXX" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Client/Worksite Employer Information */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Worksite Employer Information</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Legal Name</Label>
                  <Input value={form.client_legal_name} onChange={e => set('client_legal_name', e.target.value)} />
                </div>
                <div>
                  <Label>EIN</Label>
                  <Input value={form.client_ein} onChange={e => set('client_ein', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Address Line 1</Label>
                <Input value={form.client_address_line1} onChange={e => set('client_address_line1', e.target.value)} />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input value={form.client_address_line2} onChange={e => set('client_address_line2', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={form.client_city} onChange={e => set('client_city', e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.client_state} onChange={e => set('client_state', e.target.value)} maxLength={2} />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input value={form.client_zip} onChange={e => set('client_zip', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={form.client_contact_name} onChange={e => set('client_contact_name', e.target.value)} />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input value={form.client_contact_phone} onChange={e => set('client_contact_phone', e.target.value)} />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input value={form.client_contact_email} onChange={e => set('client_contact_email', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contract Dates */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Contract Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contract Begin Date</Label>
                <Input type="date" value={form.contract_begin_date} onChange={e => set('contract_begin_date', e.target.value)} />
              </div>
              <div>
                <Label>Contract End Date</Label>
                <Input type="date" value={form.contract_end_date} onChange={e => set('contract_end_date', e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Filing Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORM_8973_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Signature */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Worksite Employer Signature</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Signer Name</Label>
                <Input value={form.signer_name} onChange={e => set('signer_name', e.target.value)} placeholder="e.g. John Smith" />
              </div>
              <div>
                <Label>Signer Title</Label>
                <Input value={form.signer_title} onChange={e => set('signer_title', e.target.value)} placeholder="e.g. CEO" />
              </div>
            </div>
          </div>

          <Separator />

          {/* IRS Submission */}
          <div>
            <h4 className="text-sm font-semibold mb-3">IRS Submission</h4>
            <div>
              <Label>IRS Confirmation Number</Label>
              <Input value={form.irs_confirmation_number} onChange={e => set('irs_confirmation_number', e.target.value)} placeholder="If submitted, enter confirmation #" />
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Internal notes…" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDelete}
            disabled={remove.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {confirmDelete ? 'Confirm Delete' : 'Delete Filing'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
