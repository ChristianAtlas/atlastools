import { useState } from 'react';
import { Search, Loader2, Filter } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useAuditLogs, formatAuditChanges, actionBadgeClass } from '@/hooks/useAuditLogs';
import { useDebounce } from '@/hooks/useDebounce';

const TABLE_OPTIONS = [
  { value: '', label: 'All Tables' },
  { value: 'employees', label: 'Employees' },
  { value: 'payroll_runs', label: 'Payroll Runs' },
  { value: 'companies', label: 'Companies' },
  { value: 'compensation_records', label: 'Compensation' },
  { value: 'employment_records', label: 'Employment' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'user_roles', label: 'User Roles' },
];

export default function AuditLog() {
  const [tableFilter, setTableFilter] = useState('');
  const { data: logs = [], isLoading } = useAuditLogs({
    tableName: tableFilter || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Track all user actions and data changes across the platform" />

      <div className="flex items-center gap-3 animate-in-up stagger-1">
        <select
          value={tableFilter}
          onChange={e => setTableFilter(e.target.value)}
          className="h-9 rounded-md border bg-card px-3 text-sm outline-none ring-ring focus:ring-2 transition-shadow"
        >
          {TABLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground ml-auto">
          {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No audit entries yet. Changes to tracked tables will appear here automatically.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Table</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map(entry => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs tabular-nums">
                    {new Date(entry.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{entry.user_email || 'System'}</p>
                      {entry.user_role && (
                        <p className="text-xs text-muted-foreground capitalize">{entry.user_role.replace('_', ' ')}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${actionBadgeClass(entry.action)}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="font-mono text-xs">{entry.table_name}</span>
                    <span className="text-xs text-muted-foreground/60 ml-1">#{entry.record_id.substring(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                    {formatAuditChanges(entry)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
