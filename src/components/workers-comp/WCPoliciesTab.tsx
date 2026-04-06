import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWCPolicies, useWCCodes, useWCAssignments } from '@/hooks/useWorkersComp';
import { useCompanies } from '@/hooks/useCompanies';
import { Plus, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { WCPolicyDrawer } from './WCPolicyDrawer';
import { WCPolicyDetail } from './WCPolicyDetail';

export function WCPoliciesTab() {
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [viewingPolicyId, setViewingPolicyId] = useState<string | null>(null);
  const { data: policies = [], isLoading } = useWCPolicies();
  const { data: companies = [] } = useCompanies();
  const { data: allCodes = [] } = useWCCodes();
  const { data: allAssignments = [] } = useWCAssignments();

  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  const filtered = policies.filter(p =>
    !search ||
    p.carrier_name.toLowerCase().includes(search.toLowerCase()) ||
    p.policy_number.toLowerCase().includes(search.toLowerCase()) ||
    (companyMap.get(p.company_id) || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'border-emerald-500 text-emerald-600 bg-emerald-50';
      case 'pending': return 'border-amber-500 text-amber-600 bg-amber-50';
      case 'expired': return 'border-destructive text-destructive bg-destructive/10';
      default: return 'border-muted-foreground text-muted-foreground';
    }
  };

  if (viewingPolicyId) {
    return <WCPolicyDetail policyId={viewingPolicyId} onBack={() => setViewingPolicyId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search policies…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditingPolicy(null); setDrawerOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Policy
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Policy #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>States</TableHead>
                <TableHead className="text-center">Codes</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No policies found</TableCell></TableRow>
              ) : filtered.map(p => {
                const codeCount = allCodes.filter(c => c.policy_id === p.id).length;
                const assignCount = allAssignments.filter(a => allCodes.some(c => c.policy_id === p.id && c.id === a.wc_code_id)).length;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewingPolicyId(p.id)}>
                    <TableCell className="font-medium text-sm">{companyMap.get(p.company_id) || '—'}</TableCell>
                    <TableCell className="text-sm">{p.carrier_name}</TableCell>
                    <TableCell className="text-sm font-mono">{p.policy_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(p.status)}`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(p.effective_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(p.expiration_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm">{p.states_covered?.join(', ')}</TableCell>
                    <TableCell className="text-center text-sm">{codeCount}</TableCell>
                    <TableCell className="text-center text-sm">{assignCount}</TableCell>
                    <TableCell>
                      {p.is_monopolistic && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Monopolistic</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setViewingPolicyId(p.id); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WCPolicyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        policy={editingPolicy}
      />
    </div>
  );
}
