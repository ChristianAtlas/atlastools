import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import {
  useVendorPaymentRuns,
  useCreateVendorPaymentRun,
} from '@/hooks/useVendors';
import { useToast } from '@/hooks/use-toast';

const fmt = (c: number) => (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function NewRunDialog({ defaultCompanyId }: { defaultCompanyId?: string }) {
  const [open, setOpen] = useState(false);
  const { isSuperAdmin } = useAuth();
  const { data: companies } = useCompanies();
  const create = useCreateVendorPaymentRun();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companyId, setCompanyId] = useState<string>(defaultCompanyId ?? '');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');

  const submit = async () => {
    if (!companyId || !payDate) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    const run = await create.mutateAsync({
      company_id: companyId,
      pay_date: payDate,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      notes: notes || null,
      run_kind: 'standalone',
    });
    setOpen(false);
    navigate(`/vendors/payments/${run.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New vendor run</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New standalone vendor payment run</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {isSuperAdmin && (
            <div>
              <Label>Client</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {(companies ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.cid} · {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
            <div>
              <Label>Pay date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>Create run</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorPaymentRuns() {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const [search, setSearch] = useState('');
  const companyScope = isSuperAdmin ? undefined : profile?.company_id ?? undefined;
  const { data, isLoading } = useVendorPaymentRuns({ companyId: companyScope });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((r) =>
      [r.id, r.companies?.cid, r.companies?.name, r.notes].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))
    );
  }, [data, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor payment runs"
        description="Standalone vendor pay cycles. Ride-along runs are managed inside the corresponding payroll run."
        actions={<NewRunDialog defaultCompanyId={companyScope} />}
      />

      <Card className="p-4 flex items-center gap-3">
        <Input placeholder="Search by CID, client, notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No vendor payment runs yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pay date</TableHead>
                {!companyScope && <TableHead>Client</TableHead>}
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Vendors</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Backup WH</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/vendors/payments/${r.id}`)}>
                  <TableCell>{r.pay_date}</TableCell>
                  {!companyScope && (
                    <TableCell className="text-xs">
                      <div className="font-mono">{r.companies?.cid}</div>
                      <div className="text-muted-foreground">{r.companies?.name}</div>
                    </TableCell>
                  )}
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.run_kind}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{r.status}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{r.vendor_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.total_amount_cents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(r.total_backup_withholding_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}