import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  company_id: string | null;
  created_at: string;
}

interface UseAuditLogsOptions {
  tableName?: string;
  recordId?: string;
  limit?: number;
}

export function useAuditLogs(opts: UseAuditLogsOptions = {}) {
  const { tableName, recordId, limit = 100 } = opts;
  return useQuery({
    queryKey: ['audit_logs', tableName, recordId, limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (tableName) query = query.eq('table_name', tableName);
      if (recordId) query = query.eq('record_id', recordId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AuditLogRow[];
    },
  });
}

/** Format changed fields into a readable summary */
export function formatAuditChanges(entry: AuditLogRow): string {
  if (entry.action === 'INSERT') return 'Record created';
  if (entry.action === 'DELETE') return 'Record deleted';
  if (!entry.changed_fields?.length) return '—';
  
  const summaries: string[] = [];
  for (const field of entry.changed_fields.slice(0, 4)) {
    const oldVal = entry.old_data?.[field];
    const newVal = entry.new_data?.[field];
    const label = field.replace(/_/g, ' ');
    if (oldVal != null && newVal != null) {
      summaries.push(`${label}: ${String(oldVal)} → ${String(newVal)}`);
    } else if (newVal != null) {
      summaries.push(`${label} set to ${String(newVal)}`);
    } else {
      summaries.push(`${label} cleared`);
    }
  }
  if (entry.changed_fields.length > 4) {
    summaries.push(`+${entry.changed_fields.length - 4} more`);
  }
  return summaries.join('; ');
}

/** Map action to badge style */
export function actionBadgeClass(action: string): string {
  switch (action) {
    case 'INSERT': return 'bg-success/10 text-success';
    case 'UPDATE': return 'bg-info/10 text-info';
    case 'DELETE': return 'bg-destructive/10 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
}
