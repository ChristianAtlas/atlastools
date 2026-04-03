import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useUpdateComplianceLicense, type ComplianceLicense } from '@/hooks/useCompliance';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface Props {
  licenses: ComplianceLicense[];
  loading?: boolean;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  expiring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  not_required: 'bg-muted text-muted-foreground',
};

const formatType = (t: string) => t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function LicensesTable({ licenses, loading }: Props) {
  const update = useUpdateComplianceLicense();

  if (loading) return <div className="p-12 text-center text-muted-foreground text-sm">Loading licenses…</div>;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>State</TableHead>
            <TableHead>License / Account #</TableHead>
            <TableHead>Authority</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Renewal</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {licenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-12">No licenses or registrations found</TableCell>
            </TableRow>
          ) : licenses.map(lic => {
            const daysToExpire = lic.expiration_date ? differenceInDays(new Date(lic.expiration_date), new Date()) : null;
            const expirationWarning = daysToExpire !== null && daysToExpire <= 90 && daysToExpire > 0;
            const isExpired = daysToExpire !== null && daysToExpire <= 0;

            return (
              <TableRow key={lic.id}>
                <TableCell className="font-medium text-sm">{formatType(lic.license_type)}</TableCell>
                <TableCell><Badge variant="outline">{lic.state_code || '—'}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">{lic.license_number || lic.account_number || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{lic.issuing_authority || '—'}</TableCell>
                <TableCell className="text-sm">
                  {lic.expiration_date ? (
                    <span className={cn(isExpired && 'text-red-600 font-medium', expirationWarning && 'text-amber-600 font-medium')}>
                      {format(new Date(lic.expiration_date), 'MMM d, yyyy')}
                      {daysToExpire !== null && daysToExpire <= 90 && (
                        <span className="block text-xs">
                          {isExpired ? 'EXPIRED' : `${daysToExpire}d remaining`}
                        </span>
                      )}
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs', statusStyles[lic.status])}>{formatType(lic.status)}</Badge>
                </TableCell>
                <TableCell>
                  {lic.renewal_status ? (
                    <Badge variant="outline" className="text-xs">{formatType(lic.renewal_status)}</Badge>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => update.mutate({ id: lic.id, renewal_status: 'in_progress' } as any)}>Start Renewal</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: lic.id, renewal_status: 'submitted' } as any)}>Mark Submitted</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: lic.id, renewal_status: 'approved', status: 'active' } as any)}>Mark Approved</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: lic.id, status: 'expired' } as any)}>Mark Expired</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
