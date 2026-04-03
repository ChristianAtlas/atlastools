import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X, FileText, Shield, CreditCard, ChevronDown, ChevronRight } from 'lucide-react';
import type { WizardData } from '@/hooks/useClientOnboarding';
import { useToast } from '@/hooks/use-toast';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface StateReg {
  state: string;
  withholding_account: string;
  sui_account: string;
  sui_rate: number | undefined;
  filing_frequency: string;
  local_tax_ids: string;
  psd_codes: string;
}

interface Props {
  data: WizardData;
  onSave: (data: Partial<WizardData>) => void;
  onBack: () => void;
  isSaving: boolean;
}

export function TaxComplianceStep({ data, onSave, onBack, isSaving }: Props) {
  const { toast } = useToast();
  const t = data.tax || {};
  const companyState = data.company?.state_of_incorporation;
  const workStates = data.company?.work_locations?.map(l => l.state).filter(Boolean) || [];
  const allStates = [...new Set([companyState, ...workStates].filter(Boolean))] as string[];

  const [irsSchedule, setIrsSchedule] = useState<string>(t.irs_deposit_schedule || 'semi_weekly');
  const [priorProvider, setPriorProvider] = useState(t.prior_payroll_provider || '');
  const [stateRegs, setStateRegs] = useState<StateReg[]>(
    t.state_registrations?.length
      ? t.state_registrations.map(r => ({
          state: r.state,
          withholding_account: r.withholding_account || '',
          sui_account: r.sui_account || '',
          sui_rate: r.sui_rate,
          filing_frequency: r.filing_frequency || '',
          local_tax_ids: r.local_tax_ids || '',
          psd_codes: r.psd_codes || '',
        }))
      : allStates.map(s => ({
          state: s,
          withholding_account: '',
          sui_account: '',
          sui_rate: undefined,
          filing_frequency: '',
          local_tax_ids: '',
          psd_codes: '',
        }))
  );
  const [wcCarrier, setWcCarrier] = useState(t.workers_comp?.carrier || '');
  const [wcPolicy, setWcPolicy] = useState(t.workers_comp?.policy_number || '');
  const [wcCodes, setWcCodes] = useState(t.workers_comp?.class_codes || '');
  const [csaUploaded, setCsaUploaded] = useState(t.csa_uploaded || false);
  const [coempAcknowledged, setCoempAcknowledged] = useState(t.coemployment_acknowledged || false);
  const [achAuthorized, setAchAuthorized] = useState(t.ach_authorized || false);
  const [bankName, setBankName] = useState(t.funding_account?.bank_name || '');
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set(allStates.slice(0, 1)));

  const toggleState = (s: string) => {
    setExpandedStates(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const updateStateReg = (idx: number, field: keyof StateReg, value: string | number) => {
    setStateRegs(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addState = () => {
    setStateRegs(prev => [...prev, {
      state: '', withholding_account: '', sui_account: '',
      sui_rate: undefined, filing_frequency: '', local_tax_ids: '', psd_codes: '',
    }]);
  };

  const handleSubmit = () => {
    onSave({
      tax: {
        irs_deposit_schedule: irsSchedule as 'semi_weekly' | 'monthly',
        prior_payroll_provider: priorProvider || undefined,
        state_registrations: stateRegs.filter(r => r.state),
        workers_comp: { carrier: wcCarrier, policy_number: wcPolicy, class_codes: wcCodes },
        csa_uploaded: csaUploaded,
        coemployment_acknowledged: coempAcknowledged,
        ach_authorized: achAuthorized,
        funding_account: { bank_name: bankName },
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Federal */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Federal Tax Setup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>FEIN (confirmed)</Label>
              <Input value={data.company?.ein || ''} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>IRS Deposit Schedule</Label>
              <Select value={irsSchedule} onValueChange={setIrsSchedule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semi_weekly">Semi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Prior Payroll Provider</Label>
              <Input value={priorProvider} onChange={e => setPriorProvider(e.target.value)} placeholder="e.g. ADP, Gusto, Paychex..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* State Registrations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">State & Local Registrations</CardTitle>
            <Button variant="outline" size="sm" onClick={addState}><Plus className="h-3.5 w-3.5 mr-1" />Add State</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stateRegs.map((reg, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleState(`${i}`)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  {expandedStates.has(`${i}`) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{reg.state || 'Select State'}</span>
                  {reg.withholding_account && <Badge variant="secondary" className="text-[10px]">WH</Badge>}
                  {reg.sui_account && <Badge variant="secondary" className="text-[10px]">SUI</Badge>}
                </div>
                {stateRegs.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setStateRegs(prev => prev.filter((_, j) => j !== i)); }}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </button>
              {expandedStates.has(`${i}`) && (
                <div className="px-4 pb-4 border-t space-y-3 pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">State</Label>
                      <Select value={reg.state} onValueChange={v => updateStateReg(i, 'state', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Withholding Account #</Label>
                      <Input value={reg.withholding_account} onChange={e => updateStateReg(i, 'withholding_account', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">SUI Account #</Label>
                      <Input value={reg.sui_account} onChange={e => updateStateReg(i, 'sui_account', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">SUI Rate (%)</Label>
                      <Input type="number" step="0.01" value={reg.sui_rate ?? ''} onChange={e => updateStateReg(i, 'sui_rate', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Filing Frequency</Label>
                      <Select value={reg.filing_frequency} onValueChange={v => updateStateReg(i, 'filing_frequency', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Local Tax IDs</Label>
                      <Input value={reg.local_tax_ids} onChange={e => updateStateReg(i, 'local_tax_ids', e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                  {reg.state === 'PA' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">PSD Codes (PA only)</Label>
                      <Input value={reg.psd_codes} onChange={e => updateStateReg(i, 'psd_codes', e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Workers Comp */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Workers' Compensation</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Carrier</Label>
              <Input value={wcCarrier} onChange={e => setWcCarrier(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Policy Number</Label>
              <Input value={wcPolicy} onChange={e => setWcPolicy(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Class Codes</Label>
              <Input value={wcCodes} onChange={e => setWcCodes(e.target.value)} placeholder="e.g. 8810, 5606" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PEO Requirements */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />PEO Requirements & Funding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox checked={csaUploaded} onCheckedChange={v => setCsaUploaded(!!v)} />
              <div>
                <Label className="text-sm">Client Service Agreement</Label>
                <p className="text-xs text-muted-foreground">Upload or confirm CSA execution</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto text-xs">Upload CSA</Button>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={coempAcknowledged} onCheckedChange={v => setCoempAcknowledged(!!v)} />
              <div>
                <Label className="text-sm">Co-Employment Acknowledgement</Label>
                <p className="text-xs text-muted-foreground">Client understands co-employment relationship</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={achAuthorized} onCheckedChange={v => setAchAuthorized(!!v)} />
              <div>
                <Label className="text-sm">ACH Funding Authorization</Label>
                <p className="text-xs text-muted-foreground">Authorize payroll debit from client bank account</p>
              </div>
            </div>
          </div>
          {achAuthorized && (
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Chase, Bank of America" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save & Continue'}</Button>
      </div>
    </div>
  );
}
