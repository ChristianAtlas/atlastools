import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const { impersonating, stopImpersonation, isImpersonating } = useImpersonation();

  if (!isImpersonating || !impersonating) return null;

  const roleLabel = impersonating.role === 'client_admin' ? 'Client Admin' : 'Employee';

  return (
    <div className="bg-warning/15 border-b border-warning/30 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Eye className="h-4 w-4 text-warning" />
        <span className="font-medium">Viewing as:</span>
        <span>{impersonating.name}</span>
        <span className="text-muted-foreground">({roleLabel}{impersonating.companyName ? ` · ${impersonating.companyName}` : ''})</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1 hover:bg-warning/20"
        onClick={stopImpersonation}
      >
        <X className="h-3.5 w-3.5" />
        Exit View
      </Button>
    </div>
  );
}
