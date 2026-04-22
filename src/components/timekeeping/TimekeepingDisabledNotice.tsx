import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function TimekeepingDisabledNotice({ context }: { context: 'employee' | 'admin' }) {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">Timekeeping is not enabled</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {context === 'employee'
            ? 'Your employer has not turned on the AtlasOne Timekeeping add-on. Please contact your administrator if you need to track hours.'
            : 'Enable the Timekeeping add-on for this client in Settings → Timekeeping. The add-on bills $8/month per active employee with time or PTO entries.'}
        </p>
      </CardContent>
    </Card>
  );
}