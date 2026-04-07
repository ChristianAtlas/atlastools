import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, FileText, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const MOCK_NOTICES = [
  { id: '1', cid: 'C2', companyName: 'Acme Corp', type: 'SUI Rate Discrepancy', source: 'State – CA', severity: 'warning', status: 'open', receivedDate: '2026-03-28', deadline: '2026-04-28', assignee: 'Tax Ops', tags: ['SUI'] },
  { id: '2', cid: 'C3', companyName: 'TechStart LLC', type: 'W-2 Rejection (EFW2)', source: 'SSA', severity: 'error', status: 'open', receivedDate: '2026-03-15', deadline: '2026-04-15', assignee: 'Tax Ops', tags: ['W-2', 'SSA'] },
  { id: '3', cid: 'C2', companyName: 'Acme Corp', type: 'FIRE File Rejection', source: 'IRS', severity: 'error', status: 'in_progress', receivedDate: '2026-03-10', deadline: '2026-04-10', assignee: 'Tax Ops', tags: ['1099', 'IRS'] },
  { id: '4', cid: 'C3', companyName: 'TechStart LLC', type: 'Missing Local Tax ID', source: 'System Detected', severity: 'warning', status: 'resolved', receivedDate: '2026-02-20', deadline: '2026-03-20', assignee: 'Onboarding', tags: ['Compliance'] },
  { id: '5', cid: 'C2', companyName: 'Acme Corp', type: '941-X Amendment Required', source: 'System Detected', severity: 'info', status: 'open', receivedDate: '2026-04-01', deadline: '2026-06-30', assignee: 'Tax Ops', tags: ['Amendment'] },
];

const severityClass: Record<string, string> = {
  error: 'border-destructive text-destructive',
  warning: 'border-amber-500 text-amber-600',
  info: 'border-primary text-primary',
};

const statusClass: Record<string, string> = {
  open: 'border-amber-500 text-amber-600',
  in_progress: 'border-primary text-primary',
  resolved: 'border-emerald-500 text-emerald-600',
};

export function TaxNoticesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = MOCK_NOTICES.filter(n => {
    if (statusFilter !== 'all' && n.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return n.cid.toLowerCase().includes(q) || n.companyName.toLowerCase().includes(q) || n.type.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search notices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {['all', 'open', 'in_progress', 'resolved'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax Notices</CardTitle>
          <CardDescription>IRS, SSA, state agency notices and system-detected issues</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>CID</TableHead>
                <TableHead>Notice Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(n => (
                <TableRow key={n.id}>
                  <TableCell>
                    <Badge variant="outline" className={severityClass[n.severity] ?? ''}>{n.severity}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{n.cid}</TableCell>
                  <TableCell className="font-medium text-sm">{n.type}</TableCell>
                  <TableCell className="text-sm">{n.source}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {n.tags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{n.receivedDate}</TableCell>
                  <TableCell className="text-sm">{n.deadline}</TableCell>
                  <TableCell className="text-sm">{n.assignee}</TableCell>
                  <TableCell><Badge variant="outline" className={statusClass[n.status] ?? ''}>{n.status.replace('_', ' ')}</Badge></TableCell>
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
