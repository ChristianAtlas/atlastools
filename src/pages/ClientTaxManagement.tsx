import { useState, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload, Plus, AlertTriangle, CheckCircle2, Info, Search, FileText, ExternalLink, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CLIENT_REPORTING_STATES, STATE_NAMES } from '@/hooks/useTaxManagement';

interface ClientSuiRateRow {
  id: string;
  company_id: string;
  state_code: string;
  rate: number;
  effective_date: string;
  end_date: string | null;
  account_number: string | null;
  rate_notice_path: string | null;
  uploaded_via: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function ClientTaxManagement() {
  const { role, profile } = useAuth();
  const qc = useQueryClient();

  const companyId = profile?.company_id;

  // Fetch client's SUI rates
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['client_sui_rates', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_sui_rates')
        .select('*')
        .eq('company_id', companyId!)
        .order('state_code')
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientSuiRateRow[];
    },
  });

  // Fetch employees for this company to detect missing states
  const { data: employees = [] } = useQuery({
    queryKey: ['company_employees_states', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, state, status')
        .eq('company_id', companyId!)
        .is('deleted_at', null)
        .in('status', ['active', 'onboarding']);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Compute current rates (most recent per state)
  const today = new Date().toISOString().slice(0, 10);
  const currentRates: Record<string, ClientSuiRateRow> = {};
  for (const r of rates.filter(r => r.effective_date <= today)) {
    if (!currentRates[r.state_code] || r.effective_date > currentRates[r.state_code].effective_date) {
      currentRates[r.state_code] = r;
    }
  }

  // Detect states with employees but no SUI rate (only client-reporting states)
  const employeeStates = new Set(
    employees
      .map(e => e.state?.toUpperCase())
      .filter((s): s is string => !!s && CLIENT_REPORTING_STATES.includes(s as any))
  );
  const coveredStates = new Set(Object.keys(currentRates));
  const missingStates = Array.from(employeeStates).filter(s => !coveredStates.has(s)).sort();

  // Add rate dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formState, setFormState] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState('');
  const [rateNoticeFile, setRateNoticeFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const resetForm = () => {
    setFormState('');
    setFormRate('');
    setFormAccountNumber('');
    setFormEffectiveDate(new Date().toISOString().slice(0, 10));
    setFormNotes('');
    setRateNoticeFile(null);
    setSubmitting(false);
  };

  const handleSubmitRate = async () => {
    if (!companyId) return;
    if (!formState) { toast.error('Please select a state'); return; }
    const rate = parseFloat(formRate);
    if (isNaN(rate) || rate < 0 || rate > 15) { toast.error('Rate must be between 0% and 15%'); return; }
    if (!formAccountNumber.trim()) { toast.error('Account number is required'); return; }
    if (!rateNoticeFile) { toast.error('Rate notice document is required'); return; }

    setSubmitting(true);
    try {
      // Upload rate notice file
      const filePath = `${companyId}/${formState}_${formEffectiveDate}_${Date.now()}.${rateNoticeFile.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('rate-notices')
        .upload(filePath, rateNoticeFile);
      if (uploadError) throw uploadError;

      // Insert rate record
      const { error: insertError } = await supabase
        .from('client_sui_rates')
        .insert({
          company_id: companyId,
          state_code: formState,
          rate: rate / 100, // convert percentage to decimal
          effective_date: formEffectiveDate,
          account_number: formAccountNumber.trim(),
          rate_notice_path: filePath,
          uploaded_via: 'client_portal',
          notes: formNotes || null,
        } as any);
      if (insertError) throw insertError;

      toast.success(`SUI rate for ${STATE_NAMES[formState] || formState} submitted successfully`);
      qc.invalidateQueries({ queryKey: ['client_sui_rates'] });
      setShowAddDialog(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit rate');
    } finally {
      setSubmitting(false);
    }
  };

  const displayRates = Object.values(currentRates).filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.state_code.toLowerCase().includes(q) ||
      (STATE_NAMES[r.state_code] || '').toLowerCase().includes(q) ||
      (r.account_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Management"
        description="Manage your SUI account numbers and rates for client-reporting states"
      />

      {/* Missing State Registrations Alert */}
      {missingStates.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>State Registrations Required</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              You have employees in the following states but no SUI account registered. Please register with the state unemployment agency and enter your rate.
            </p>
            <div className="flex flex-wrap gap-2">
              {missingStates.map(state => (
                <Badge key={state} variant="destructive" className="text-xs">
                  {state} — {STATE_NAMES[state] || state}
                </Badge>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setFormState(missingStates[0]);
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Missing Rate
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active SUI Accounts</CardDescription>
            <CardTitle className="text-2xl">{Object.keys(currentRates).length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">States with registered rates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Employee States</CardDescription>
            <CardTitle className="text-2xl">{employeeStates.size}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Client-reporting states with employees</p>
          </CardContent>
        </Card>
        <Card className={missingStates.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Missing Registrations</CardDescription>
            <CardTitle className={`text-2xl ${missingStates.length > 0 ? 'text-destructive' : ''}`}>
              {missingStates.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {missingStates.length > 0 ? 'Action required — register and submit rates' : 'All states covered'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Rates */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your SUI Rates
            </CardTitle>
            <CardDescription>
              Manage SUI account numbers and rates for client-reporting states
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search state, account..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={() => { resetForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : displayRates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No SUI rates on file yet.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Your First Rate
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Rate Notice</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRates.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.state_code}
                      <span className="text-muted-foreground text-xs ml-1">— {STATE_NAMES[r.state_code]}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.account_number || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{(r.rate * 100).toFixed(3)}%</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.effective_date}</TableCell>
                    <TableCell>
                      {r.rate_notice_path ? (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">None</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {r.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info about client-reporting states */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Client-Reporting States
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            In these states, your company reports SUI under your own account number and experience rate. You are required to register with each state where you have employees and provide your rate notice.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CLIENT_REPORTING_STATES.map(s => {
              const hasCoverage = coveredStates.has(s);
              const hasEmployees = employeeStates.has(s);
              return (
                <Badge
                  key={s}
                  variant={hasEmployees && !hasCoverage ? 'destructive' : hasCoverage ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {s}
                </Badge>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Badge className="h-3 w-6 text-[10px]">XX</Badge> Rate on file</span>
            <span className="flex items-center gap-1"><Badge variant="destructive" className="h-3 w-6 text-[10px]">XX</Badge> Missing — employees present</span>
            <span className="flex items-center gap-1"><Badge variant="secondary" className="h-3 w-6 text-[10px]">XX</Badge> No employees</span>
          </div>
        </CardContent>
      </Card>

      {/* Add Rate Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add SUI Rate</DialogTitle>
            <DialogDescription>
              Enter your SUI account number and rate. A rate notice document is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>State *</Label>
              <Select value={formState} onValueChange={setFormState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_REPORTING_STATES.map(s => (
                    <SelectItem key={s} value={s}>
                      {s} — {STATE_NAMES[s]}
                      {missingStates.includes(s) && ' ⚠️'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SUI Account Number *</Label>
              <Input
                placeholder="e.g. 123-456-789"
                value={formAccountNumber}
                onChange={e => setFormAccountNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rate (%) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  max="15"
                  placeholder="e.g. 2.700"
                  value={formRate}
                  onChange={e => setFormRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Enter as percentage</p>
              </div>
              <div className="space-y-2">
                <Label>Effective Date *</Label>
                <Input
                  type="date"
                  value={formEffectiveDate}
                  onChange={e => setFormEffectiveDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rate Notice Document *</Label>
              <div
                className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {rateNoticeFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="truncate max-w-[200px]">{rateNoticeFile.name}</span>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">Click to upload rate notice</p>
                    <p className="text-xs text-muted-foreground">PDF, JPG, PNG accepted</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setRateNoticeFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitRate} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
