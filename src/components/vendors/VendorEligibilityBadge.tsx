import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ELIGIBILITY_LABELS, type VendorEligibility } from '@/hooks/useVendors';

export function VendorEligibilityBadge({ eligibility }: { eligibility: VendorEligibility }) {
  if (eligibility.eligible) {
    return (
      <Badge variant="outline" className="border-success text-success gap-1">
        <ShieldCheck className="h-3 w-3" /> Eligible
      </Badge>
    );
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="border-destructive text-destructive gap-1 cursor-help">
            <ShieldAlert className="h-3 w-3" /> Blocked · {eligibility.blockers.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <ul className="text-xs space-y-0.5">
            {eligibility.blockers.map((b) => <li key={b}>• {ELIGIBILITY_LABELS[b]}</li>)}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}