import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const mockPTORequests = [
  { id: 'pto1', employee: 'Carlos Ramirez', company: 'Meridian Construction', type: 'Vacation', startDate: '2025-03-24', endDate: '2025-03-28', days: 5, status: 'pending' as const },
  { id: 'pto2', employee: 'Kevin Park', company: 'Pacific Staffing Group', type: 'Sick', startDate: '2025-03-19', endDate: '2025-03-19', days: 1, status: 'approved' as const },
  { id: 'pto3', employee: 'Marcus Williams', company: 'Harborview Hospitality', type: 'Personal', startDate: '2025-04-01', endDate: '2025-04-02', days: 2, status: 'pending' as const },
];

import { StatusBadge } from '@/components/StatusBadge';

export default function PTO() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="PTO Management"
        description="Time-off requests and balances"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Request</Button>}
      />

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden animate-in-up stagger-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Dates</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Days</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockPTORequests.map(req => (
              <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{req.employee}</td>
                <td className="px-4 py-3 text-muted-foreground">{req.company}</td>
                <td className="px-4 py-3 text-muted-foreground">{req.type}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{req.startDate} — {req.endDate}</td>
                <td className="px-4 py-3 tabular-nums">{req.days}</td>
                <td className="px-4 py-3"><StatusBadge status={req.status === 'approved' ? 'approved' : 'pending_approval'} /></td>
                <td className="px-4 py-3">
                  {req.status === 'pending' && (
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs">Approve</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive">Deny</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
