import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { useVendorDocuments } from '@/hooks/useVendors';
import { useVendorBanking } from '@/hooks/useCurrentVendor';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import { Check, Circle, ArrowRight } from 'lucide-react';

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

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <PageHeader title="Get started" description="Complete these steps to start receiving payments" />
      <Card><CardContent className="p-0 divide-y">
        {steps.map((s) => (
          <Link key={s.id} to={s.to} className="flex items-center gap-3 p-4 hover:bg-muted/30">
            {s.done ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            <span className={`flex-1 text-sm ${s.done ? 'text-muted-foreground line-through' : 'font-medium'}`}>{s.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </CardContent></Card>
    </div>
  );
}