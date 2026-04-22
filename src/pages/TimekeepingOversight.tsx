import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Clock, CheckCircle, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { useAllTKTimecards, useTKPricing } from '@/hooks/useTimekeeping';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

/** Hook: fetch enablement for all companies in one query. */
function useAllTKEnablement() {
  return useQuery({
    queryKey: ['tk_settings_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timekeeping_settings' as any)
        .select('company_id, is_enabled, enabled_at');
      if (error) throw error;
      return (data ?? []) as unknown as { company_id: string; is_enabled: boolean; enabled_at: string | null }[];
    },
  });
}

export default function TimekeepingOversight() {
  const { data: companies = [] } = useCompanies();
  const { data: enablement = [] } = useAllTKEnablement();
  const { data: timecards = [], isLoading } = useAllTKTimecards();
  const { data: pricing } = useTKPricing();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const enableMap = useMemo(() => {
    const m = new Map<string, { is_enabled: boolean; enabled_at: string | null }>();
    enablement.forEach(e => m.set(e.company_id, e));
    return m;
  }, [enablement]);

  // Aggregate per company
  const rows = useMemo(() => {
    return companies.map(c => {
      const tk = enableMap.get(c.id);
      const cards = timecards.filter(t => t.company_id === c.id);
      const submitted = cards.filter(t => t.status === 'submitted').length;
      const approved = cards.filter(t => t.status === 'approved').length;
      const open = cards.filter(t => t.status === 'open').length;
      const exceptions = cards.reduce((s, t) => s + (t.exception_count ?? 0), 0);
      return {
        id: c.id,
        name: c.name,
        cid: c.cid,
        is_enabled: !!tk?.is_enabled,
        enabled_at: tk?.enabled_at ?? null,
        employee_count: c.employee_count,
        submitted, approved, open, exceptions,
      };
    });
  }, [companies, enableMap, timecards]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter === 'active' && !r.is_enabled) return false;
      if (statusFilter === 'inactive' && r.is_enabled) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!r.name.toLowerCase().includes(term) && !r.cid.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => ({
    enabledClients: rows.filter(r => r.is_enabled).length,
    totalClients: rows.length,
    pendingApprovals: rows.reduce((s, r) => s + r.submitted, 0),
    exceptions: rows.reduce((s, r) => s + r.exceptions, 0),
  }), [rows]);

  const pricePerEmp = pricing ? (pricing.per_employee_cents / 100).toFixed(2) : '8.00';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timekeeping oversight"
        description="Cross-client visibility into timekeeping activation, approvals, and exceptions"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Building2} tone="info" label="Active clients" value={`${stats.enabledClients} / ${stats.totalClients}`} sub={`$${pricePerEmp}/active emp`} />
        <StatTile icon={Clock} tone="warning" label="Pending approvals" value={stats.pendingApprovals} sub="Awaiting manager" />
        <StatTile icon={AlertTriangle} tone="destructive" label="Exceptions" value={stats.exceptions} sub="Across all clients" />
        <StatTile icon={CheckCircle} tone="success" label="Approved this period" value={rows.reduce((s, r) => s + r.approved, 0)} sub="Ready for payroll" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by client or CID…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            <SelectItem value="active">Add-on active</SelectItem>
            <SelectItem value="inactive">Add-on inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Client</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Add-on</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Employees</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Open</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Submitted</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Approved</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Exceptions</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Activated</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No clients match.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{r.cid}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={r.is_enabled ? 'default' : 'secondary'}>{r.is_enabled ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.employee_count}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.open}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.submitted > 0 ? <span className="text-info font-medium">{r.submitted}</span> : 0}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.approved > 0 ? <span className="text-success font-medium">{r.approved}</span> : 0}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.exceptions > 0 ? <span className="text-destructive font-medium">{r.exceptions}</span> : 0}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {r.enabled_at ? format(new Date(r.enabled_at), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: number | string; sub?: string; tone: 'info' | 'success' | 'warning' | 'destructive' }) {
  const toneCls: Record<string, string> = {
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneCls[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}