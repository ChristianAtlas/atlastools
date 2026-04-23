import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { useVendorDocuments } from '@/hooks/useVendors';
import { useVendorBanking } from '@/hooks/useCurrentVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import { Check, Circle, ArrowRight, FileText, AlertCircle } from 'lucide-react';

export default function ContractorOnboarding() {
  const { data: vendor } = useCurrentVendor();
  const { data: docs } = useVendorDocuments(vendor?.id);
  const { data: banking } = useVendorBanking(vendor?.id);

  if (!vendor) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const profileComplete = !!(vendor.email && vendor.phone && vendor.address_line1 && vendor.city && vendor.state && vendor.zip);
  const w9Complete = vendor.w9_status === 'on_file' && (docs ?? []).some((d) => d.document_type === 'w9' && d.is_active_w9);
  const bankingComplete = !!banking;

  const steps = [
    { id: 'profile', label: 'Complete your profile', done: profileComplete, to: '/contractor/profile' },
    { id: 'w9', label: 'Upload your W-9', done: w9Complete, to: '/contractor/documents' },
    { id: 'banking', label: 'Add your banking details', done: bankingComplete, to: '/contractor/banking' },
  ];

  // Required documents differ by worker type. C2C vendors typically need a COI; individuals need a W-9.
  const requiredDocs: Array<{ type: string; label: string; description: string; required: boolean }> = [
    {
      type: 'w9',
      label: vendor.is_c2c ? 'W-9 (entity)' : 'W-9',
      description: 'IRS Form W-9 for tax reporting',
      required: true,
    },
    {
      type: 'coi',
      label: 'Certificate of Insurance (COI)',
      description: vendor.is_c2c
        ? 'Required for C2C vendors performing work on-site or via contract'
        : 'Recommended if you carry your own liability insurance',
      required: vendor.is_c2c,
    },
    {
      type: 'contract',
      label: 'Signed contract / MSA',
      description: 'Master service agreement or signed engagement letter',
      required: false,
    },
  ];

  const docStatuses = requiredDocs.map((d) => {
    const onFile = (docs ?? []).some((row: any) => {
      if (d.type === 'w9') return row.document_type === 'w9' && row.is_active_w9;
      return row.document_type === d.type && !row.deleted_at;
    });
    return { ...d, onFile };
  });

  const missingRequired = docStatuses.filter((d) => d.required && !d.onFile);
  const completedSteps = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="Get started" description="Complete these steps to start receiving payments" />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Onboarding progress</CardTitle>
            <span className="text-xs text-muted-foreground tabular-nums">{completedSteps} of {steps.length}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPct} />
          <div className="divide-y -mx-2">
            {steps.map((s) => (
              <Link key={s.id} to={s.to} className="flex items-center gap-3 px-2 py-3 hover:bg-muted/30 rounded">
                {s.done ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <span className={`flex-1 text-sm ${s.done ? 'text-muted-foreground line-through' : 'font-medium'}`}>{s.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Required documents</CardTitle>
            {missingRequired.length > 0 ? (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" /> {missingRequired.length} missing
              </Badge>
            ) : (
              <Badge className="gap-1"><Check className="h-3 w-3" /> All collected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {docStatuses.map((d) => (
              <div key={d.type} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5">
                  {d.onFile ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : d.required ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{d.label}</p>
                    {d.required && !d.onFile && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                    {!d.required && !d.onFile && <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                    {d.onFile && <Badge className="text-[10px]">On file</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                </div>
                {!d.onFile && (
                  <Link
                    to={`/contractor/documents?type=${d.type}`}
                    className="text-xs font-medium text-primary inline-flex items-center gap-1 shrink-0"
                  >
                    <FileText className="h-3.5 w-3.5" /> Upload
                  </Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}