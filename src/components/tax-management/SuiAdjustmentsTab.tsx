import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Info, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  STATE_NAMES,
  ALL_STATES,
  useSuiAdjustments,
  useCreateSuiAdjustment,
  useUpdateSuiAdjustment,
} from '@/hooks/useTaxManagement';
import { useCompanies } from '@/hooks/useCompanies';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function centsToUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-amber-500 text-amber-600',
  invoiced: 'border-blue-500 text-blue-600',
  credited: 'border-emerald-500 text-emerald-600',
  resolved: 'border-muted-foreground text-muted-foreground',
};

export function SuiAdjustmentsTab() {
  const { data: adjustments = [], isLoading } = useSuiAdjustments();
  const { data: companies = [] } = useCompanies();
  const createMutation = useCreateSuiAdjustment();
  const updateMutation = useUpdateSuiAdjustment();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    company_id: '',
    state_code: '',
    old_rate: '',
    new_rate: '',
    effective_date: '',
    period_start: '',
    period_end: '',
    taxable_wages_cents: '',
    notes: '',
  });

  const computeAdjustment = () => {
    const oldRate = parseFloat(form.old_rate);
    const newRate = parseFloat(form.new_rate);
    const wages = parseInt(form.taxable_wages_cents);
    if (isNaN(oldRate) || isNaN(newRate) || isNaN(wages)) return null;
    const diff = (newRate - oldRate) * wages;
    return Math.round(diff);
  };

  const openNew = () => {
    setForm({
      company_id: '', state_code: '', old_rate: '', new_rate: '',
      effective_date: '', period_start: '', period_end: '',
      taxable_wages_cents: '', notes: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const adj = computeAdjustment();
    if (!form.company_id || !form.state_code || adj === null || !form.effective_date || !form.period_start || !form.period_end) {
      toast.error('All fields required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        company_id: form.company_id,
        state_code: form.state_code,
        adjustment_type: adj > 0 ? 'undercollection' : 'overcollection',
        old_rate: parseFloat(form.old_rate),
        new_rate: parseFloat(form.new_rate),
        effective_date: form.effective_date,
        period_start: form.period_start,
        period_end: form.period_end,
        taxable_wages_cents: parseInt(form.taxable_wages_cents),
        adjustment_cents: Math.abs(adj),
        status: 'pending',
        invoice_id: null,
        notes: form.notes || null,
        created_by: null,
      });
      toast.success('SUI adjustment created');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleResolve = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, status });
      toast.success(`Adjustment marked as ${status}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = adjustments.filter(a => {
    if (!search) return true;
    const company = companies.find(c => c.id === a.company_id);
    const q = search.toLowerCase();
    return (
      a.state_code.toLowerCase().includes(q) ||
      company?.name.toLowerCase().includes(q) ||
      company?.cid.toLowerCase().includes(q) ||
      a.adjustment_type.includes(q)
    );
  });

  const adjValue = computeAdjustment();

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>SUI Adjustment Logic</AlertTitle>
        <AlertDescription>
          <strong>Undercollection:</strong> When a client's SUI rate increases retroactively, a separate SUI adjustment invoice is generated to collect the difference.<br />
          <strong>Overcollection:</strong> When a client's SUI rate decreases retroactively, a credit line item is applied to their next payroll invoice automatically.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">SUI Adjustments</CardTitle>
            <CardDescription>Track under/over-collections from backdated rate changes</CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> New Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SUI adjustments found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Old Rate → New Rate</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Taxable Wages</TableHead>
                  <TableHead>Adjustment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => {
                  const company = companies.find(c => c.id === a.company_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.adjustment_type === 'undercollection' ? (
                          <div className="flex items-center gap-1 text-amber-600">
                            <ArrowUpCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Under</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <ArrowDownCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Over</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{company?.cid}</span>
                        <span className="text-muted-foreground text-xs ml-1">– {company?.name}</span>
                      </TableCell>
                      <TableCell className="font-medium">{a.state_code}</TableCell>
                      <TableCell className="text-sm">
                        {(a.old_rate * 100).toFixed(3)}% → {(a.new_rate * 100).toFixed(3)}%
                      </TableCell>
                      <TableCell className="text-xs">{a.period_start} – {a.period_end}</TableCell>
                      <TableCell className="text-sm">{centsToUSD(a.taxable_wages_cents)}</TableCell>
                      <TableCell className="font-semibold">
                        {a.adjustment_type === 'undercollection' ? '+' : '−'}{centsToUSD(a.adjustment_cents)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[a.status] ?? ''}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-7 text-xs"
                              onClick={() => handleResolve(a.id, a.adjustment_type === 'undercollection' ? 'invoiced' : 'credited')}
                            >
                              {a.adjustment_type === 'undercollection' ? 'Invoice' : 'Credit'}
                            </Button>
                          </div>
                        )}
                        {(a.status === 'invoiced' || a.status === 'credited') && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => handleResolve(a.id, 'resolved')}
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create SUI Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={v => setForm(f => ({ ...f, company_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.status === 'active').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.cid} – {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>State</Label>
              <Select value={form.state_code} onValueChange={v => setForm(f => ({ ...f, state_code: v }))}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {ALL_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s} – {STATE_NAMES[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Old Rate (decimal)</Label>
                <Input type="number" step="0.001" value={form.old_rate} onChange={e => setForm(f => ({ ...f, old_rate: e.target.value }))} />
              </div>
              <div>
                <Label>New Rate (decimal)</Label>
                <Input type="number" step="0.001" value={form.new_rate} onChange={e => setForm(f => ({ ...f, new_rate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Taxable Wages (cents)</Label>
              <Input type="number" value={form.taxable_wages_cents} onChange={e => setForm(f => ({ ...f, taxable_wages_cents: e.target.value }))} placeholder="e.g. 5000000 = $50,000" />
            </div>
            {adjValue !== null && (
              <Alert className={adjValue > 0 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}>
                <AlertTitle className="text-sm">
                  {adjValue > 0 ? '⬆ Undercollection' : '⬇ Overcollection'}
                </AlertTitle>
                <AlertDescription className="font-semibold">
                  {centsToUSD(Math.abs(adjValue))} {adjValue > 0 ? 'to collect via adjustment invoice' : 'to credit on next payroll invoice'}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
