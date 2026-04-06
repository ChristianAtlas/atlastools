import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWCDashboardStats, useWCPolicies } from '@/hooks/useWorkersComp';
import { ShieldCheck, Users, AlertTriangle, Landmark, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export function WCDashboard() {
  const { data: stats, isLoading: statsLoading } = useWCDashboardStats();
  const { data: policies = [] } = useWCPolicies();

  const activePolicies = policies.filter(p => p.status === 'active');
  const expiringPolicies = activePolicies.filter(p => {
    const exp = new Date(p.expiration_date);
    const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    return exp <= in60 && exp >= new Date();
  });

  const cards = [
    { label: 'Active Policies', value: stats?.activePolicies ?? 0, icon: ShieldCheck, color: 'text-emerald-500' },
    { label: 'Employees Assigned', value: stats?.assignedCount ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'Missing Assignments', value: stats?.missingAssignments ?? 0, icon: AlertTriangle, color: stats?.missingAssignments ? 'text-destructive' : 'text-muted-foreground', alert: (stats?.missingAssignments ?? 0) > 0 },
    { label: 'Monopolistic Clients', value: stats?.monopolisticCount ?? 0, icon: Landmark, color: 'text-amber-500' },
    { label: 'Expiring Soon', value: stats?.expiringSoon ?? 0, icon: Clock, color: stats?.expiringSoon ? 'text-orange-500' : 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map(c => (
          <Card key={c.label} className={c.alert ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardContent className="pt-5 pb-4 px-4">
              <div className="flex items-center justify-between mb-2">
                <c.icon className={`h-5 w-5 ${c.color}`} />
                {c.alert && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Action Required</Badge>}
              </div>
              <p className="text-2xl font-bold text-foreground">{statsLoading ? '…' : c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Alerts & Exceptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.missingAssignments ?? 0) > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{stats?.missingAssignments} employees without WC codes</p>
                  <p className="text-xs text-muted-foreground">Payroll cannot process without WC assignments</p>
                </div>
              </div>
            )}
            {expiringPolicies.map(p => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Clock className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Policy {p.policy_number} expiring {format(new Date(p.expiration_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{p.carrier_name}</p>
                </div>
              </div>
            ))}
            {(stats?.missingAssignments ?? 0) === 0 && expiringPolicies.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No active alerts</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Policies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Policy Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePolicies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No active policies. Add a policy to get started.</p>
            ) : (
              <div className="space-y-2">
                {activePolicies.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.carrier_name}</p>
                      <p className="text-xs text-muted-foreground">{p.policy_number} · {p.states_covered?.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.is_monopolistic && <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Monopolistic</Badge>}
                      <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">Active</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
