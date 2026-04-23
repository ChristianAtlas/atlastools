import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, User, FileSpreadsheet, Wallet, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useVendors, type VendorWorkerType, type VendorStatus } from '@/hooks/useVendors';
import { VidBadge, WorkerTypeBadge, W9StatusBadge, VendorStatusBadge, VendorIdentityCell } from '@/components/vendors/VendorBadges';

export default function Vendors() {
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | VendorWorkerType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | VendorStatus>('all');

  const companyScope = isSuperAdmin ? undefined : profile?.company_id ?? undefined;
  const { data: vendors, isLoading } = useVendors({
    companyId: companyScope,
    workerType: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const filtered = useMemo(() => {
    if (!vendors) return [];
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) =>
      [v.vid, v.legal_name, v.business_name, v.first_name, v.last_name, v.email]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [vendors, search]);

  const counts = useMemo(() => {
    const list = vendors ?? [];
    return {
      total: list.length,
      ic: list.filter((v) => v.worker_type === '1099_ic').length,
      c2c: list.filter((v) => v.worker_type === 'c2c_vendor').length,
      missingW9: list.filter((v) => v.w9_status === 'not_collected' || v.w9_status === 'expired').length,
    };
  }, [vendors]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors & Vendors"
        description="Manage 1099 independent contractors and C2C vendors (VID workers)"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/vendors/payments')}>
              <Wallet className="mr-2 h-4 w-4" />
              Payment runs
            </Button>
            <Button variant="outline" onClick={() => navigate('/vendors/1099-eligibility')}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              1099 eligibility
            </Button>
            <Button variant="outline" onClick={() => navigate('/vendors/1099-summary')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              1099 summary
            </Button>
            <Button onClick={() => navigate('/vendors/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add vendor
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total VID workers" value={counts.total} />
        <StatTile label="1099 contractors" value={counts.ic} icon={<User className="h-4 w-4 text-muted-foreground" />} />
        <StatTile label="C2C vendors" value={counts.c2c} icon={<Building2 className="h-4 w-4 text-muted-foreground" />} />
        <StatTile label="Missing W-9" value={counts.missingW9} highlight={counts.missingW9 > 0} />
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by VID, name, business, or email"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="1099_ic">1099 IC</SelectItem>
              <SelectItem value="c2c_vendor">C2C Vendor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VID</TableHead>
                <TableHead>Name / Business</TableHead>
                <TableHead>Type</TableHead>
                {isSuperAdmin && <TableHead>Client</TableHead>}
                <TableHead>W-9</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tax ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={isSuperAdmin ? 7 : 6}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center py-10 text-sm text-muted-foreground">
                    No vendors yet. Click <span className="font-medium">Add vendor</span> to onboard one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/vendors/${v.id}`)}
                  >
                    <TableCell><VidBadge vid={v.vid} /></TableCell>
                    <TableCell><VendorIdentityCell v={v} /></TableCell>
                    <TableCell><WorkerTypeBadge type={v.worker_type} isC2C={v.is_c2c} /></TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-xs text-muted-foreground">
                        {v.companies?.name ?? '—'}
                        {v.companies?.cid && <span className="ml-1 text-[10px]">({v.companies.cid})</span>}
                      </TableCell>
                    )}
                    <TableCell><W9StatusBadge status={v.w9_status} /></TableCell>
                    <TableCell><VendorStatusBadge status={v.status} /></TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {v.tax_id_last4 ? `••• ••• ${v.tax_id_last4}` : <span className="text-destructive">missing</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function StatTile({ label, value, icon, highlight }: { label: string; value: number; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${highlight ? 'text-destructive' : ''}`}>{value}</div>
    </Card>
  );
}