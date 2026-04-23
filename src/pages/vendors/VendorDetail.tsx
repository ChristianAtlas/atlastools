import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendor, useVendorPriorYtd, VENDOR_1099_CATEGORIES } from '@/hooks/useVendors';
import { VidBadge, WorkerTypeBadge, W9StatusBadge, VendorStatusBadge } from '@/components/vendors/VendorBadges';
import { VendorDocumentsTab } from '@/components/vendors/VendorDocumentsTab';

function fmtCents(c: number) {
  return (c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vendor, isLoading } = useVendor(id);
  const { data: prior } = useVendorPriorYtd(id);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!vendor) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Vendor not found.
        <div className="mt-3"><Button variant="outline" onClick={() => navigate('/vendors')}>Back to vendors</Button></div>
      </div>
    );
  }

  const display = vendor.is_c2c || vendor.worker_type === 'c2c_vendor'
    ? vendor.business_name || vendor.legal_name
    : `${vendor.first_name ?? ''} ${vendor.last_name ?? ''}`.trim() || vendor.legal_name;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to vendors
      </Button>

      <PageHeader
        title={display}
        description={vendor.companies?.name ? `${vendor.companies.name} · ${vendor.companies.cid}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <VidBadge vid={vendor.vid} />
            <WorkerTypeBadge type={vendor.worker_type} isC2C={vendor.is_c2c} />
            <W9StatusBadge status={vendor.w9_status} />
            <VendorStatusBadge status={vendor.status} />
          </div>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="tax">Tax & W-9</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="prior">Prior YTD</TabsTrigger>
          <TabsTrigger value="payments" disabled>Payments (Phase 2)</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Legal name" value={vendor.legal_name} />
            <Info label="Email" value={vendor.email} />
            <Info label="Phone" value={vendor.phone} />
            <Info label="Address" value={[vendor.address_line1, vendor.address_line2, [vendor.city, vendor.state, vendor.zip].filter(Boolean).join(', ')].filter(Boolean).join(' · ')} />
            <Info label="Onboarding" value={vendor.onboarding_status.replace('_', ' ')} />
            <Info label="Portal access" value={vendor.portal_access_enabled ? 'Enabled' : 'Disabled'} />
            <Info label="Notes" value={vendor.notes} />
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="Tax ID type" value={vendor.tax_id_type?.toUpperCase() ?? null} />
            <Info label="Last 4" value={vendor.tax_id_last4 ? `••• ••• ${vendor.tax_id_last4}` : null} />
            <Info label="Default 1099 category" value={VENDOR_1099_CATEGORIES.find((c) => c.value === vendor.default_1099_category)?.label ?? '—'} />
            <Info label="Backup withholding" value={vendor.backup_withholding_enabled ? `Enabled (${((vendor.backup_withholding_rate ?? 0) * 100).toFixed(0)}%)` : 'Disabled'} />
            <Info label="W-9 collected" value={vendor.w9_collected_at ? new Date(vendor.w9_collected_at).toLocaleDateString() : '—'} />
            <Info label="W-9 expires" value={vendor.w9_expires_at ?? '—'} />
            <p className="md:col-span-2 text-xs text-muted-foreground pt-2 border-t">
              Upload the signed W-9 from the Documents tab. Marking it as "on file" during upload updates the W-9 status here automatically.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-5">
            <VendorDocumentsTab vendor={vendor} />
          </Card>
        </TabsContent>

        <TabsContent value="prior">
          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-3">Prior year-to-date 1099 earnings</h3>
            {!prior || prior.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prior YTD entries recorded.</p>
            ) : (
              <div className="space-y-2">
                {prior.map((p) => (
                  <div key={p.id} className="flex justify-between items-center border-b pb-2 text-sm">
                    <div>
                      <div className="font-medium tabular-nums">{p.reporting_year} · {VENDOR_1099_CATEGORIES.find((c) => c.value === p.category)?.form ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{p.source_description ?? '—'} · entered by {p.entered_by_name ?? 'system'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{fmtCents(p.amount_cents)}</div>
                      {p.backup_withholding_cents > 0 && (
                        <div className="text-[11px] text-muted-foreground tabular-nums">BW {fmtCents(p.backup_withholding_cents)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}