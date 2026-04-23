import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { useVendorDocuments } from '@/hooks/useVendors';
import { useVendorBanking } from '@/hooks/useCurrentVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import { Check, Circle, ArrowRight, FileText, AlertCircle, CheckCircle2, User, Banknote, Upload, Clock } from 'lucide-react';

export default function ContractorOnboarding() {
  const { data: vendor } = useCurrentVendor();
  const { data: docs } = useVendorDocuments(vendor?.id);
  const { data: banking } = useVendorBanking(vendor?.id);

  if (!vendor) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const profileComplete = !!(vendor.email && vendor.phone && vendor.address_line1 && vendor.city && vendor.state && vendor.zip);
  const w9Complete = vendor.w9_status === 'on_file' && (docs ?? []).some((d) => d.document_type === 'w9' && d.is_active_w9);
  const bankingComplete = !!banking;

  type Step = {
    id: string;
    label: string;
    description: string;
    done: boolean;
    to: string;
    cta: string;
    icon: typeof User;
  };
  const steps: Step[] = [
    {
      id: 'profile',
      label: 'Complete your profile',
      description: 'Confirm contact info and mailing address used on your 1099.',
      done: profileComplete,
      to: '/contractor/profile',
      cta: profileComplete ? 'Review profile' : 'Complete profile',
      icon: User,
    },
    {
      id: 'w9',
      label: 'Upload your W-9',
      description: 'IRS Form W-9 is required before any payment can be issued.',
      done: w9Complete,
      to: '/contractor/documents?type=w9',
      cta: w9Complete ? 'Replace W-9' : 'Upload W-9',
      icon: FileText,
    },
    {
      id: 'banking',
      label: 'Add your banking details',
      description: 'Direct-deposit account so we can pay you electronically.',
      done: bankingComplete,
      to: '/contractor/banking',
      cta: bankingComplete ? 'Update banking' : 'Add banking',
      icon: Banknote,
    },
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
  const allComplete = completedSteps === steps.length && missingRequired.length === 0;
  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="Get started" description="Complete these steps to start receiving payments" />

      {allComplete ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">You're all set</p>
              <p className="text-xs text-muted-foreground">
                Your onboarding is complete. You're eligible to receive payments.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/contractor">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : nextStep ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Next step</p>
              <p className="text-sm font-medium">{nextStep.label}</p>
              <p className="text-xs text-muted-foreground">{nextStep.description}</p>
            </div>
            <Button asChild size="sm">
              <Link to={nextStep.to}>{nextStep.cta}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Onboarding progress</CardTitle>
            <div className="flex items-center gap-2">
              {allComplete ? (
                <Badge className="gap-1"><Check className="h-3 w-3" /> Complete</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" /> In progress
                </Badge>
              )}
              <span className="text-xs text-muted-foreground tabular-nums">{completedSteps} of {steps.length}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPct} />
          <div className="divide-y -mx-2">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-start gap-3 px-2 py-3">
                  <div className="mt-0.5">
                    {s.done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <p className={`text-sm font-medium ${s.done ? 'text-muted-foreground' : ''}`}>{s.label}</p>
                      {s.done ? (
                        <Badge className="text-[10px] gap-0.5"><Check className="h-3 w-3" /> Complete</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Action needed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={s.done ? 'outline' : 'default'}
                    className="shrink-0"
                  >
                    <Link to={s.to}>
                      {s.cta}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
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
                    <CheckCircle2 className="h-5 w-5 text-primary" />
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
                    {d.onFile && <Badge className="text-[10px] gap-0.5"><Check className="h-3 w-3" /> On file</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant={d.onFile ? 'ghost' : d.required ? 'default' : 'outline'}
                  className="shrink-0"
                >
                  <Link to={`/contractor/documents?type=${d.type}`}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {d.onFile ? 'Replace' : 'Upload'}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}