import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Eye, Clock, AlertTriangle, CheckCircle2, FileText, Upload } from 'lucide-react';
import { StatCard } from '@/components/StatCard';

const MOCK_CLAIMS = [
  { id: 'CLM-001', cid: 'C2', companyName: 'Acme Corp', employeeName: 'John Smith', mid: 'M5', claimType: 'UI Claim', dateReceived: '2026-03-20', deadline: '2026-04-10', status: 'pending_response', assignee: 'Tax Ops', state: 'CA' },
  { id: 'CLM-002', cid: 'C3', companyName: 'TechStart LLC', employeeName: 'Former Employee', mid: 'M14', claimType: 'Wage Audit', dateReceived: '2026-03-15', deadline: '2026-04-15', status: 'open', assignee: 'Payroll Ops', state: 'TX' },
  { id: 'CLM-003', cid: 'C2', companyName: 'Acme Corp', employeeName: 'Lisa Chen', mid: 'M8', claimType: 'UI Claim', dateReceived: '2026-02-28', deadline: '2026-03-20', status: 'closed', assignee: 'Tax Ops', state: 'NY' },
  { id: 'CLM-004', cid: 'C2', companyName: 'Acme Corp', employeeName: 'Mike Davis', mid: 'M7', claimType: 'Fraud Inquiry', dateReceived: '2026-04-01', deadline: '2026-04-21', status: 'open', assignee: 'Compliance', state: 'FL' },
];

const statusClass: Record<string, string> = {
  open: 'border-amber-500 text-amber-600',
  pending_response: 'border-primary text-primary',
  closed: 'border-emerald-500 text-emerald-600',
  won: 'border-emerald-500 text-emerald-600',
  lost: 'border-destructive text-destructive',
};

export function SuiClaimsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<typeof MOCK_CLAIMS[0] | null>(null);

  const activeClaims = MOCK_CLAIMS.filter(c => c.status !== 'closed' && c.status !== 'won' && c.status !== 'lost').length;
  const pendingResponse = MOCK_CLAIMS.filter(c => c.status === 'pending_response').length;
  const upcomingDeadlines = MOCK_CLAIMS.filter(c => {
    const dl = new Date(c.deadline);
    const now = new Date();
    const diff = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7 && c.status !== 'closed';
  }).length;

  const filtered = MOCK_CLAIMS.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.id.toLowerCase().includes(q) || c.cid.toLowerCase().includes(q) || c.employeeName.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Active Claims" value={String(activeClaims)} icon={AlertTriangle} />
        <StatCard title="Pending Response" value={String(pendingResponse)} icon={Clock} />
        <StatCard title="Deadlines This Week" value={String(upcomingDeadlines)} icon={Clock} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {['all', 'open', 'pending_response', 'closed'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <Button size="sm" className="ml-auto"><Plus className="h-4 w-4 mr-1" /> New Claim</Button>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SUI Claims</CardTitle>
          <CardDescription>UI claims, wage audits, and fraud inquiries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>CID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm font-medium">{c.id}</TableCell>
                  <TableCell className="font-mono text-sm">{c.cid}</TableCell>
                  <TableCell className="text-sm">{c.employeeName} <span className="text-muted-foreground">({c.mid})</span></TableCell>
                  <TableCell><Badge variant="outline">{c.claimType}</Badge></TableCell>
                  <TableCell className="font-medium">{c.state}</TableCell>
                  <TableCell className="text-sm">{c.dateReceived}</TableCell>
                  <TableCell className="text-sm">{c.deadline}</TableCell>
                  <TableCell className="text-sm">{c.assignee}</TableCell>
                  <TableCell><Badge variant="outline" className={statusClass[c.status] ?? ''}>{c.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => setSelectedClaim(c)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Claim {selectedClaim?.id}
              {selectedClaim && <Badge variant="outline" className={statusClass[selectedClaim.status] ?? ''}>{selectedClaim.status.replace('_', ' ')}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{selectedClaim.cid} – {selectedClaim.companyName}</span></div>
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{selectedClaim.employeeName} ({selectedClaim.mid})</span></div>
                <div><span className="text-muted-foreground">Claim Type:</span> <span className="font-medium">{selectedClaim.claimType}</span></div>
                <div><span className="text-muted-foreground">State:</span> <span className="font-medium">{selectedClaim.state}</span></div>
                <div><span className="text-muted-foreground">Received:</span> {selectedClaim.dateReceived}</div>
                <div><span className="text-muted-foreground">Deadline:</span> <span className="font-semibold">{selectedClaim.deadline}</span></div>
                <div><span className="text-muted-foreground">Assigned to:</span> {selectedClaim.assignee}</div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Case Timeline</Label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">{selectedClaim.dateReceived}</span> — Claim received
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">{selectedClaim.deadline}</span> — Response deadline
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Attachments</Label>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" /> State Notice.pdf</Button>
                  <Button variant="outline" size="sm" className="text-xs"><Upload className="h-3.5 w-3.5 mr-1" /> Upload</Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <Textarea className="mt-1" rows={3} placeholder="Add internal notes about this claim..." />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm">Submit Response</Button>
                <Button size="sm">Mark as Closed</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
