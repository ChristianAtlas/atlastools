import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateCompany, type CompanyRow } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { useForm8973Filings, useCreateForm8973 } from '@/hooks/useForm8973';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, FileText, Users } from 'lucide-react';

interface Props {
  company: CompanyRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OffboardCompanyDialog({ company, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const updateCompany = useUpdateCompany();
  const createFiling = useCreateForm8973();
  const { data: employees = [] } = useEmployees(company.id);
  const { data: filings = [] } = useForm8973Filings();

  const activeEmployeeCount = useMemo(
    () => employees.filter(e => e.status === 'active').length,
    [employees],
  );

  const existingFiling = useMemo(
    () => filings.find(f => f.company_id === company.id),
    [filings, company.id],
  );

  const today = new Date().toISOString().slice(0, 10);
  const [terminationDate, setTerminationDate] = useState(today);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const expectedConfirm = `TERMINATE ${company.cid}`;
  const canSubmit =
    !!terminationDate &&
    reason.trim().length >= 5 &&
    confirmText === expectedConfirm &&
    acknowledge &&
    !submitting;

  const handleOffboard = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // 1. Terminate the company (DB trigger cascades to employees)
      await updateCompany.mutateAsync({
        id: company.id,
        status: 'terminated',
      });

      // 2. Auto-generate Form 8973 termination filing
      let filingMsg = '';
      if (existingFiling) {
        filingMsg = ' (existing Form 8973 record retained)';
      } else {
        await createFiling.mutateAsync({
          company_id: company.id,
          contract_begin_date: company.created_at?.slice(0, 10) || today,
          contract_end_date: terminationDate,
          is_new_contract: false,
          cpeo_name: '',
          cpeo_ein: '',
          client_legal_name: company.legal_name || company.name,
          client_ein: company.ein,
          client_address_line1: company.address_line1,
          client_address_line2: company.address_line2,
          client_city: company.city,
          client_state: company.state,
          client_zip: company.zip,
          client_contact_name: company.primary_contact_name,
          client_contact_phone: company.primary_contact_phone,
          client_contact_email: company.primary_contact_email,
          status: 'draft',
          notes: `Termination reason: ${reason.trim()}\n\nIRS Form 8973 must be filed within 30 days of contract end date (${terminationDate}). Only the CPEO signature is required for termination filings.`,
        });
        filingMsg = ' Form 8973 termination filing created in Compliance Center.';
      }

      toast.success(
        `${company.name} terminated. ${activeEmployeeCount} employee${activeEmployeeCount === 1 ? '' : 's'} offboarded.${filingMsg}`,
      );
      onOpenChange(false);
      // Take admin to compliance > Form 8973 to complete signing/submission
      if (!existingFiling) {
        setTimeout(() => navigate('/compliance?tab=form8973'), 400);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to offboard company');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Offboard Company
          </DialogTitle>
          <DialogDescription>
            Permanently terminate <span className="font-semibold text-foreground">{company.name}</span> ({company.cid}) from the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Impact summary */}
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2 text-sm">
            <p className="font-medium text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              This action cannot be undone
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-5 list-disc">
              <li className="flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                <span><strong className="tabular-nums text-foreground">{activeEmployeeCount}</strong> active employee{activeEmployeeCount === 1 ? '' : 's'} will be terminated</span>
              </li>
              <li className="flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                <span>{existingFiling ? 'Existing Form 8973 will be retained' : 'A Form 8973 termination filing will be auto-generated'}</span>
              </li>
              <li>Payroll runs and active services will be halted</li>
            </ul>
          </div>

          {/* Termination date */}
          <div className="space-y-1.5">
            <Label htmlFor="termination_date">Contract End Date *</Label>
            <Input
              id="termination_date"
              type="date"
              value={terminationDate}
              onChange={e => setTerminationDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              IRS requires Form 8973 to be filed within 30 days of this date.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Termination Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Brief reason for termination (will be recorded in audit log and Form 8973 notes)"
              rows={3}
            />
          </div>

          {/* Acknowledge */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="acknowledge"
              checked={acknowledge}
              onCheckedChange={(v) => setAcknowledge(!!v)}
            />
            <Label htmlFor="acknowledge" className="text-xs font-normal cursor-pointer leading-relaxed">
              I confirm I have authority to offboard this client and acknowledge that all employees, payroll, and active services will be terminated.
            </Label>
          </div>

          {/* Type-to-confirm */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm">
              Type <span className="font-mono text-destructive">{expectedConfirm}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={expectedConfirm}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleOffboard} disabled={!canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Offboard Company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
