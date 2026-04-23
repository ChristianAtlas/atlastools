import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Search, AlertTriangle, UserPlus, ShieldOff, CheckCircle2 } from 'lucide-react';
import { useWCAssignments, useWCCodes } from '@/hooks/useWorkersComp';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { WCAssignmentDrawer } from './WCAssignmentDrawer';

/**
 * WC Exceptions
 * Lists every active W-2 employee that has no active WC assignment
 * and is not flagged as exempt (owner/officer). Provides per-row
 * one-click assignment via the WCAssignmentDrawer.
 */
export function WCExceptionsTab() {
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCompany, setDrawerCompany] = useState<string>('');
  const [preselectIds, setPreselectIds] = useState<string[]>([]);

  const { data: employees = [], isLoading: loadingEmps } = useEmployees();
  const { data: assignments = [], isLoading: loadingAssigns } = useWCAssignments();
  const { data: codes = [] } = useWCCodes();
  const { data: companies = [] } = useCompanies();

  const companyMap = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const activeAssigned = useMemo(
    () => new Set(assignments.filter((a) => a.is_active).map((a) => a.employee_id)),
    [assignments],
  );

  // Exception = active W-2 employee, not exempt, no active assignment.
  const exceptions = useMemo(() => {
    return employees
      .filter((e: any) => {
        if (e.status !== 'active') return false;
        if (e.deleted_at) return false;
        if (e.wc_exempt) return false;
        return !activeAssigned.has(e.id);
      })
      .map((e: any) => ({
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        title: e.title || '—',
        company_id: e.company_id,
        company_name: companyMap.get(e.company_id) ?? '—',
        is_owner_officer: !!e.is_owner_officer,
      }));
  }, [employees, activeAssigned, companyMap]);

  const filtered = exceptions.filter((e) => {
    if (companyFilter !== 'all' && e.company_id !== companyFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.company_name.toLowerCase().includes(q)
    );
  });

  // Group exceptions by company so super admins can see the spread.
  const byCompany = useMemo(() => {
    const m = new Map<string, typeof exceptions>();
    for (const e of exceptions) {
      const list = m.get(e.company_id) ?? [];
      list.push(e);
      m.set(e.company_id, list);
    }
    return m;
  }, [exceptions]);

  const openAssign = (employeeIds: string[], companyId: string) => {
    setPreselectIds(employeeIds);
    setDrawerCompany(companyId);
    setDrawerOpen(true);
  };

  const isLoading = loadingEmps || loadingAssigns;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <Card
        className={
          exceptions.length === 0
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-destructive/50 bg-destructive/5'
        }
      >
        <CardContent className="pt-4 pb-3 px-4 flex items-start gap-3">
          {exceptions.length === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {exceptions.length === 0
                ? 'All active W-2 employees have a WC assignment or are exempt.'
                : `${exceptions.length} employee(s) across ${byCompany.size} client(s) missing a WC code`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exceptions block accurate WC billing on payroll. Assign a code or
              mark the employee exempt (owner/officer) to clear the exception.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee, title, or client…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {Array.from(byCompany.keys()).map((cid) => (
              <SelectItem key={cid} value={cid}>
                {companyMap.get(cid) ?? cid} ({byCompany.get(cid)?.length ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {companyFilter !== 'all' && filtered.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              openAssign(
                filtered.map((e) => e.id),
                companyFilter,
              )
            }
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Bulk assign ({filtered.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading exceptions…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <ShieldOff className="h-5 w-5 mx-auto mb-2 opacity-60" />
                    No outstanding WC exceptions.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-sm">{e.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.title}</TableCell>
                    <TableCell className="text-sm">{e.company_name}</TableCell>
                    <TableCell>
                      {e.is_owner_officer ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">
                          Owner / Officer
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
                          Missing WC
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => openAssign([e.id], e.company_id)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <WCAssignmentDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setPreselectIds([]);
        }}
        companyId={drawerCompany}
        codes={codes.filter((c) => !c.company_id || c.company_id === drawerCompany)}
        preselectEmployeeIds={preselectIds}
      />
    </div>
  );
}
