import { PageHeader } from '@/components/PageHeader';
import { auditLog } from '@/lib/mock-data';

export default function AuditLog() {
  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Track all user actions and changes" />

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Timestamp</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Entity</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {auditLog.map(entry => (
              <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs tabular-nums">
                  {new Date(entry.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 font-medium">{entry.userName}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{entry.entity} #{entry.entityId}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{entry.changes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
