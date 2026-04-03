import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateComplianceLicense } from '@/hooks/useCompliance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'enterprise' | 'client';
  entityId?: string;
  companyId?: string;
}

const LICENSE_TYPES = [
  'peo_license', 'sui_account', 'state_withholding', 'workers_comp',
  'business_entity', 'cpeo', 'local_tax', 'other'
];

export function LicenseDialog({ open, onOpenChange, entityType, entityId, companyId }: Props) {
  const [licenseType, setLicenseType] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  const create = useCreateComplianceLicense();

  const handleSubmit = () => {
    if (!licenseType) return;
    create.mutate({
      entity_type: entityType,
      entity_id: entityId || 'atlasone',
      company_id: companyId || null,
      license_type: licenseType,
      state_code: stateCode || null,
      license_number: licenseNumber || null,
      issuing_authority: issuingAuthority || null,
      issue_date: issueDate || null,
      expiration_date: expirationDate || null,
      status: 'active',
      renewal_status: 'not_due',
      notes: notes || null,
    } as any, {
      onSuccess: () => {
        onOpenChange(false);
        setLicenseType(''); setStateCode(''); setLicenseNumber('');
        setIssuingAuthority(''); setIssueDate(''); setExpirationDate(''); setNotes('');
      },
    });
  };

  const formatType = (t: string) => t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add License / Registration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={licenseType} onValueChange={setLicenseType}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {LICENSE_TYPES.map(t => <SelectItem key={t} value={t}>{formatType(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={stateCode} onChange={e => setStateCode(e.target.value.toUpperCase())} maxLength={2} placeholder="TX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>License / Account #</Label>
              <Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Issuing Authority</Label>
              <Input value={issuingAuthority} onChange={e => setIssuingAuthority(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiration Date</Label>
              <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!licenseType || create.isPending}>
            {create.isPending ? 'Adding…' : 'Add License'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
