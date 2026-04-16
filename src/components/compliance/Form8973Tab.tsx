import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useForm8973Filings, useCreateForm8973, getStatusConfig } from '@/hooks/useForm8973';
import { useCompanies } from '@/hooks/useCompanies';
import { Form8973DetailDialog } from './Form8973DetailDialog';
import { TicketsList } from './TicketsList';
import { Search, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Form8973Filing } from '@/hooks/useForm8973';

export function Form8973Tab() {
  const [search, setSearch] = useState('');
  const { data: filings = [], isLoading } = useForm8973Filings();
  const { data: companies = [] } = useCompanies();
  const createFiling = useCreateForm8973();

  const [detailFiling, setDetailFiling] = useState<Form8973Filing | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const filtered = filings.filter(f =>
    !search ||
    (f.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.company_cid || '').toLowerCase().includes(search.toLowerCase()) ||
    (f.client_ein || '').toLowerCase().includes(search.toLowerCase()) ||
    f.status.toLowerCase().includes(search.toLowerCase())
  );

  // Companies without a filing
  const filedCompanyIds = new Set(filings.map(f => f.company_id));
  const missingCompanies = companies.filter(c => !filedCompanyIds.has(c.id) && c.status !== 'terminated');

  const handleOpenDetail = (filing: Form8973Filing) => {
    setDetailFiling(filing);
    setDetailOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedCompanyId) {
      toast.error('Select a company');
      return;
    }
    const company = companies.find(c => c.id === selectedCompanyId);
    if (!company) return;

    try {
      await createFiling.mutateAsync({
        company_id: company.id,
        contract_begin_date: (company as any).premier_date || new Date().toISOString().slice(0, 10),
        is_new_contract: true,
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
      });
      toast.success('Form 8973 filing created');
      setCreateOpen(false);
      setSelectedCompanyId('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">IRS Form 8973 — CPEO/Customer Reporting</h3>
          <p className="text-sm text-muted-foreground">
            Mandatory filing for each client joining the platform. Tracks contract start, worksite employer signature, and IRS submission.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />New Filing
        </Button>
      </div>

      {/* Actionable tickets for missing/unsigned filings */}
      <div className="grid gap-3 md:grid-cols-2">
        <TicketsList source="form_8973_missing" title="Missing Form 8973" showSync />
        <TicketsList source="form_8973_unsigned" title="Awaiting client signature" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search filings…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client (CID)</TableHead>
                <TableHead>EIN</TableHead>
                <TableHead>Contract Begin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>IRS Submitted</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No Form 8973 filings found</TableCell></TableRow>
              ) : filtered.map(f => {
                const sc = getStatusConfig(f.status);
                return (
                  <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetail(f)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{f.company_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{f.company_cid}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{f.client_ein || '—'}</TableCell>
                    <TableCell className="text-sm">{format(new Date(f.contract_begin_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {f.signed_at ? (
                        <span className="text-emerald-600">{format(new Date(f.signed_at), 'MMM d, yyyy')}</span>
                      ) : f.signature_requested_at ? (
                        <span className="text-amber-600">Pending</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {f.submitted_to_irs_at ? format(new Date(f.submitted_to_irs_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(f.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Form8973DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        filing={detailFiling}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Form 8973 Filing</DialogTitle>
            <DialogDescription>Select the client company to initiate their Form 8973 filing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client Company</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select company…" /></SelectTrigger>
                <SelectContent>
                  {companies
                    .filter(c => c.status !== 'terminated')
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.cid})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedCompanyId && filedCompanyIds.has(selectedCompanyId) && (
                <p className="text-xs text-amber-600 mt-1">This company already has a filing. Creating another will add a second record.</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleCreate} disabled={createFiling.isPending}>
                {createFiling.isPending ? 'Creating…' : 'Create Filing'}
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
