import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Eye } from 'lucide-react';

const MOCK_AMENDMENTS = [
  { id: '1', cid: 'C2', companyName: 'Acme Corp', formType: '941-X', quarter: 'Q1 2026', origin: 'System Detected', category: 'SUI Wage Correction', impactedEmployees: 3, amount: 245000, status: 'pending', createdDate: '2026-04-01' },
  { id: '2', cid: 'C3', companyName: 'TechStart LLC', formType: '941-X', quarter: 'Q4 2025', origin: 'Manual', category: 'Federal Income Tax', impactedEmployees: 1, amount: -85000, status: 'filed', createdDate: '2026-03-15' },
  { id: '3', cid: 'C2', companyName: 'Acme Corp', formType: 'State Amend', quarter: 'Q1 2026', origin: 'System Detected', category: 'State Income Tax – CA', impactedEmployees: 5, amount: 132000, status: 'pending', createdDate: '2026-04-02' },
  { id: '4', cid: 'C2', companyName: 'Acme Corp', formType: '944-X', quarter: 'Annual 2025', origin: 'Manual', category: 'Multi-State Wage Reconciliation', impactedEmployees: 12, amount: 0, status: 'in_review', createdDate: '2026-03-20' },
];

const fmt = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

const statusClass: Record<string, string> = {
  pending: 'border-amber-500 text-amber-600',
  in_review: 'border-primary text-primary',
  filed: 'border-emerald-500 text-emerald-600',
  rejected: 'border-destructive text-destructive',
};

export function AmendmentsTab() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_AMENDMENTS.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.cid.toLowerCase().includes(q) || a.companyName.toLowerCase().includes(q) || a.formType.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search amendments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Amendment</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax Amendments</CardTitle>
          <CardDescription>Federal 941-X, 944-X, state/local income tax corrections, SUI wage corrections, and multi-state reconciliations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CID</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Impacted EEs</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.cid}</TableCell>
                  <TableCell><Badge variant="outline">{a.formType}</Badge></TableCell>
                  <TableCell className="text-sm">{a.quarter}</TableCell>
                  <TableCell className="text-sm font-medium">{a.category}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{a.origin}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{a.impactedEmployees}</TableCell>
                  <TableCell className={`tabular-nums font-medium ${a.amount < 0 ? 'text-emerald-600' : ''}`}>
                    {a.amount === 0 ? '—' : fmt(a.amount)}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={statusClass[a.status] ?? ''}>{a.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-sm">{a.createdDate}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7"><Eye className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
