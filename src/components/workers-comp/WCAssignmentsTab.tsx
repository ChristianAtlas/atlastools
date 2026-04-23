import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWCAssignments, useWCCodes } from '@/hooks/useWorkersComp';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { Search, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { WCAssignmentDrawer } from './WCAssignmentDrawer';

export function WCAssignmentsTab() {
  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const { data: assignments = [], isLoading } = useWCAssignments();
  const { data: codes = [] } = useWCCodes();
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();

  const codeMap = new Map(codes.map(c => [c.id, c]));
  const empMap = new Map(employees.map(e => [e.id, e]));
  const companyMap = new Map(companies.map(c => [c.id, c.name]));

  // Find unassigned employees — any active employee whose company has any available code
  const assignedIds = new Set(assignments.filter(a => a.is_active).map(a => a.employee_id));
  // With a master PEO policy, every active W-2 employee needs an assignment.
  const unassigned = employees.filter(e => e.status === 'active' && !assignedIds.has(e.id));

  const enriched = assignments.map(a => {
    const emp = empMap.get(a.employee_id);
    const code = codeMap.get(a.wc_code_id);
    return {
      ...a,
      employeeName: emp ? `${emp.first_name} ${emp.last_name}` : '—',
      employeeTitle: emp?.title || '—',
      companyName: companyMap.get(a.company_id) || '—',
      wcCode: code?.code || '—',
      wcDesc: code?.description || '—',
      wcState: code?.state || '—',
    };
  });

  const filtered = enriched.filter(a =>
    !search ||
    a.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    a.wcCode.toLowerCase().includes(search.toLowerCase()) ||
    a.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {unassigned.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-3 px-4 flex items-start gap-3 justify-between">
           <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{unassigned.length} active employee(s) without WC assignments</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unassigned.slice(0, 5).map(e => `${e.first_name} ${e.last_name}`).join(', ')}
                {unassigned.length > 5 ? ` and ${unassigned.length - 5} more` : ''}
              </p>
            </div>
           </div>
           {unassigned[0] && (
             <Button size="sm" onClick={() => { setSelectedCompany(unassigned[0].company_id); setAssignOpen(true); }}>
               <Plus className="h-3.5 w-3.5 mr-1" /> Assign
             </Button>
           )}
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assignments…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>WC Code</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Effective</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No assignments found</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-sm">{a.employeeName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.employeeTitle}</TableCell>
                  <TableCell className="text-sm">{a.companyName}</TableCell>
                  <TableCell className="font-mono text-sm">{a.wcCode} — {a.wcDesc}</TableCell>
                  <TableCell>{a.wcState}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(a.effective_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${a.is_active ? 'border-emerald-500 text-emerald-600' : 'border-muted-foreground'}`}>
                      {a.is_active ? 'Active' : 'Ended'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WCAssignmentDrawer
        open={assignOpen}
        onOpenChange={setAssignOpen}
        companyId={selectedCompany}
        codes={codes.filter(c => !c.company_id || c.company_id === selectedCompany)}
      />
    </div>
  );
}
