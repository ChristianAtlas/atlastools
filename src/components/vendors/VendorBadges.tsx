import { Badge } from '@/components/ui/badge';
import type { VendorRow, VendorWorkerType, VendorW9Status, VendorStatus } from '@/hooks/useVendors';

export function VidBadge({ vid }: { vid: string | null }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-primary tabular-nums">
      {vid ?? '—'}
    </span>
  );
}

export function WorkerTypeBadge({ type, isC2C }: { type: VendorWorkerType; isC2C: boolean }) {
  if (type === 'c2c_vendor' || isC2C) {
    return <Badge variant="secondary" className="text-[10px]">C2C Vendor</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">1099 IC</Badge>;
}

export function W9StatusBadge({ status }: { status: VendorW9Status }) {
  const map: Record<VendorW9Status, { label: string; cls: string }> = {
    not_collected: { label: 'No W-9', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    pending_review: { label: 'W-9 review', cls: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
    on_file: { label: 'W-9 on file', cls: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
    expired: { label: 'W-9 expired', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const { label, cls } = map[status];
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>;
}

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  const map: Record<VendorStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    active: { label: 'Active', variant: 'default' },
    inactive: { label: 'Inactive', variant: 'secondary' },
    pending: { label: 'Pending', variant: 'outline' },
    terminated: { label: 'Terminated', variant: 'destructive' },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
}

export function VendorIdentityCell({ v }: { v: VendorRow }) {
  const display = v.is_c2c || v.worker_type === 'c2c_vendor'
    ? v.business_name || v.legal_name
    : `${v.first_name ?? ''} ${v.last_name ?? ''}`.trim() || v.legal_name;
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{display}</span>
      <span className="text-[11px] text-muted-foreground">{v.email ?? '—'}</span>
    </div>
  );
}