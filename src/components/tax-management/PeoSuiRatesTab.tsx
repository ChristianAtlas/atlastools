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
import { Plus, Pencil, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  PEO_SUI_STATES,
  STATE_NAMES,
  usePeoSuiRates,
  useUpsertPeoSuiRate,
  useDeletePeoSuiRate,
  type PeoSuiRate,
} from '@/hooks/useTaxManagement';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function PeoSuiRatesTab() {
  const { data: rates = [], isLoading } = usePeoSuiRates();
  const upsertMutation = useUpsertPeoSuiRate();
  const deleteMutation = useDeletePeoSuiRate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PeoSuiRate | null>(null);
  const [form, setForm] = useState({ state_code: '', rate: '', effective_date: '', end_date: '', notes: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ state_code: '', rate: '', effective_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (r: PeoSuiRate) => {
    setEditing(r);
    setForm({
      state_code: r.state_code,
      rate: String(r.rate),
      effective_date: r.effective_date,
      end_date: r.end_date ?? '',
      notes: r.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.state_code || !form.rate || !form.effective_date) {
      toast.error('State, rate, and effective date are required');
      return;
    }
    try {
      await upsertMutation.mutateAsync({
        id: editing?.id,
        state_code: form.state_code,
        rate: parseFloat(form.rate),
        effective_date: form.effective_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      });
      toast.success(editing ? 'Rate updated' : 'Rate added');
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this rate?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Rate deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Group by state, show current rate (most recent effective_date <= today)
  const today = new Date().toISOString().slice(0, 10);
  const currentByState: Record<string, PeoSuiRate> = {};
  for (const r of rates) {
    if (r.effective_date <= today && (!currentByState[r.state_code] || r.effective_date > currentByState[r.state_code].effective_date)) {
      currentByState[r.state_code] = r;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              PEO SUI Rates
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  These are the SUI rates used for PEO-reporting states. We report under our own experience rate and apply our invisible markup for risk coverage.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>{PEO_SUI_STATES.length} PEO-reporting states</CardDescription>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Add Rate
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Current Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PEO_SUI_STATES.map(state => {
                  const current = currentByState[state];
                  return (
                    <TableRow key={state}>
                      <TableCell className="font-medium">
                        {state} <span className="text-muted-foreground text-xs">– {STATE_NAMES[state]}</span>
                      </TableCell>
                      <TableCell>
                        {current ? (
                          <Badge variant="outline">{(current.rate * 100).toFixed(3)}%</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{current?.effective_date ?? '—'}</TableCell>
                      <TableCell className="text-sm">{current?.end_date ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{current?.notes ?? ''}</TableCell>
                      <TableCell>
                        {current ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(current)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(current.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                            setEditing(null);
                            setForm({ state_code: state, rate: '', effective_date: new Date().toISOString().slice(0, 10), end_date: '', notes: '' });
                            setDialogOpen(true);
                          }}>
                            Set Rate
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

      {/* Rate history */}
      {rates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate History</CardTitle>
            <CardDescription>All PEO SUI rates including historical entries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.state_code}</TableCell>
                    <TableCell>{(r.rate * 100).toFixed(3)}%</TableCell>
                    <TableCell className="text-sm">{r.effective_date}</TableCell>
                    <TableCell className="text-sm">{r.end_date ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.notes ?? ''}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit PEO SUI Rate' : 'Add PEO SUI Rate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>State</Label>
              <Select value={form.state_code} onValueChange={v => setForm(f => ({ ...f, state_code: v }))} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {PEO_SUI_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s} – {STATE_NAMES[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rate (decimal, e.g. 0.027 = 2.7%)</Label>
              <Input type="number" step="0.001" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={form.effective_date} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
