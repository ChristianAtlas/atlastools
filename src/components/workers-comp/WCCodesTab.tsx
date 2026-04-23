import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWCCodes } from '@/hooks/useWorkersComp';
import { useCompanies } from '@/hooks/useCompanies';
import { WCCodeDrawer } from './WCCodeDrawer';
import { WCBulkUploadDialog } from './WCBulkUploadDialog';
import { Search, Plus, Pencil, Upload } from 'lucide-react';
import { format } from 'date-fns';
import type { WCCode } from '@/hooks/useWorkersComp';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

export function WCCodesTab() {
  const [search, setSearch] = useState('');
  const { data: codes = [], isLoading } = useWCCodes();
  const { data: companies = [] } = useCompanies();
  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<WCCode | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const filtered = codes.filter(c =>
    !search ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()) ||
    c.state.toLowerCase().includes(search.toLowerCase()) ||
    (companyMap.get(c.company_id) || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (code: WCCode) => {
    setEditingCode(code);
    setDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingCode(null);
    setDrawerOpen(true);
  };

  // Derive a default policyId/companyId from existing codes or first company
  const defaultPolicyId = editingCode?.policy_id || codes[0]?.policy_id || '';
  const defaultCompanyId = editingCode?.company_id || codes[0]?.company_id || companies[0]?.id || '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search codes…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />Bulk Upload
        </Button>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1.5" />Add Code
        </Button>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lock className="h-3 w-3" /> Rates and markup are visible to super admins only and never exposed to clients.
      </p>

      <Card>
        <CardContent className="p-0">
          <TooltipProvider><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No class codes found</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(c)}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell className="text-sm">{c.description}</TableCell>
                  <TableCell className="text-sm">
                    {c.company_id ? (
                      <Badge variant="outline" className="text-[10px]">Client: {companyMap.get(c.company_id) || '—'}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-primary text-primary">AtlasOne PEO</Badge>
                    )}
                  </TableCell>
                  <TableCell>{c.state}</TableCell>
                  <TableCell className="font-mono tabular-nums">${Number(c.rate_per_hundred).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(c.rate_basis || 'per_hundred') === 'per_hundred' ? '/ $100' : '/ hour'}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{((c.markup_rate_override ?? c.internal_markup_rate ?? 0.015) * 100).toFixed(2)}%</span>
                      </TooltipTrigger>
                      <TooltipContent>Hidden from client. Defaults to 1.5%.</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.effective_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${c.is_active ? 'border-emerald-500 text-emerald-600' : 'border-muted-foreground'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleEdit(c); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></TooltipProvider>
        </CardContent>
      </Card>

      <WCCodeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        code={editingCode}
        policyId={defaultPolicyId}
        companyId={defaultCompanyId}
      />

      <WCBulkUploadDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        policyId={defaultPolicyId}
        companyId={defaultCompanyId}
      />
    </div>
  );
}
