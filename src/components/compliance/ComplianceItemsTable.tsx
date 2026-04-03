import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, AlertTriangle, XCircle, MoreHorizontal, Search, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useUpdateComplianceItem, type ComplianceItem } from '@/hooks/useCompliance';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  items: ComplianceItem[];
  loading?: boolean;
  showCompany?: boolean;
  showEntity?: boolean;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  compliant: { label: 'Compliant', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-muted text-muted-foreground' },
  at_risk: { label: 'At Risk', icon: AlertTriangle, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  non_compliant: { label: 'Non-Compliant', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  expired: { label: 'Expired', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  waived: { label: 'Waived', icon: CheckCircle2, className: 'bg-muted text-muted-foreground' },
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-muted text-muted-foreground',
};

export function ComplianceItemsTable({ items, loading, showCompany, showEntity }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const update = useUpdateComplianceItem();

  const filtered = items.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    update.mutate({
      id,
      status: newStatus,
      ...(newStatus === 'compliant' ? { completed_at: new Date().toISOString() } : {}),
    } as any);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">Loading compliance items…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              {showEntity && <TableHead>Entity</TableHead>}
              {showCompany && <TableHead>Company</TableHead>}
              <TableHead>State</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCompany ? 9 : 8} className="text-center text-muted-foreground py-12">
                  No compliance items found
                </TableCell>
              </TableRow>
            ) : filtered.map(item => {
              const sc = statusConfig[item.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
                      {item.blocker && <Badge variant="destructive" className="mt-1 text-[10px]">Blocks Payroll</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.category}</TableCell>
                  {showEntity && <TableCell className="text-muted-foreground text-sm capitalize">{item.entity_type}</TableCell>}
                  {showCompany && <TableCell className="text-muted-foreground text-sm">{item.company_id || '—'}</TableCell>}
                  <TableCell><Badge variant="outline" className="text-xs">{item.state_code || '—'}</Badge></TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', priorityColors[item.priority])}>{item.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs gap-1', sc.className)}>
                      <StatusIcon className="h-3 w-3" />
                      {sc.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'in_progress')}>Mark In Progress</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'compliant')}>Mark Compliant</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'at_risk')}>Flag At Risk</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'non_compliant')}>Flag Non-Compliant</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'waived')}>Waive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
