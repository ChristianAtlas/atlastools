import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWCPolicies, useWCCodes, useWCAssignments, centsToUSD } from '@/hooks/useWorkersComp';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { BarChart3, FileText, AlertTriangle, Landmark } from 'lucide-react';

export function WCReportsTab() {
  const { data: policies = [] } = useWCPolicies();
  const { data: codes = [] } = useWCCodes();
  const { data: assignments = [] } = useWCAssignments();
  const { data: employees = [] } = useEmployees();
  const { data: companies = [] } = useCompanies();

  const companyMap = new Map(companies.map(c => [c.id, c.name]));
  const empMap = new Map(employees.map(e => [e.id, e]));
  const codeMap = new Map(codes.map(c => [c.id, c]));
  const activePolicies = policies.filter(p => p.status === 'active');
  const activeAssignments = assignments.filter(a => a.is_active);

  // Premium by Client
  const premiumByClient = activePolicies.map(p => {
    const policyCodes = codes.filter(c => c.policy_id === p.id && c.is_active);
    const policyAssigns = activeAssignments.filter(a => policyCodes.some(c => c.id === a.wc_code_id));
    let totalWages = 0;
    let totalPremium = 0;
    policyAssigns.forEach(a => {
      const emp = empMap.get(a.employee_id);
      const code = codeMap.get(a.wc_code_id);
      const wages = emp?.annual_salary_cents || (emp?.hourly_rate_cents || 0) * 2080;
      const premium = code ? Math.round((wages / 10000) * code.rate_per_hundred) : 0;
      totalWages += wages;
      totalPremium += premium;
    });
    const markup = Math.round(totalPremium * (p.markup_rate || 0));
    return {
      companyName: companyMap.get(p.company_id) || '—',
      employeeCount: policyAssigns.length,
      totalWages,
      totalPremium,
      markup,
      totalCharge: totalPremium + markup,
    };
  });

  // Missing assignments
  const assignedIds = new Set(activeAssignments.map(a => a.employee_id));
  const companyIdsWithPolicies = new Set(activePolicies.map(p => p.company_id));
  const missing = employees.filter(e => e.status === 'active' && companyIdsWithPolicies.has(e.company_id) && !assignedIds.has(e.id));

  // Monopolistic
  const monopolistic = activePolicies.filter(p => p.is_monopolistic);

  // Expiring
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiring = activePolicies.filter(p => {
    const exp = new Date(p.expiration_date);
    return exp <= in90 && exp >= now;
  });

  return (
    <div className="space-y-6">
      {/* Premium by Client */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> WC Premium by Client</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Annual Wages</TableHead>
                <TableHead className="text-right">Est. Premium</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-right">Total Charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {premiumByClient.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No data</TableCell></TableRow>
              ) : (
                <>
                  {premiumByClient.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.companyName}</TableCell>
                      <TableCell className="text-right">{r.employeeCount}</TableCell>
                      <TableCell className="text-right font-mono">{centsToUSD(r.totalWages)}</TableCell>
                      <TableCell className="text-right font-mono">{centsToUSD(r.totalPremium)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{centsToUSD(r.markup)}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{centsToUSD(r.totalCharge)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{premiumByClient.reduce((s, r) => s + r.employeeCount, 0)}</TableCell>
                    <TableCell className="text-right font-mono">{centsToUSD(premiumByClient.reduce((s, r) => s + r.totalWages, 0))}</TableCell>
                    <TableCell className="text-right font-mono">{centsToUSD(premiumByClient.reduce((s, r) => s + r.totalPremium, 0))}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{centsToUSD(premiumByClient.reduce((s, r) => s + r.markup, 0))}</TableCell>
                    <TableCell className="text-right font-mono">{centsToUSD(premiumByClient.reduce((s, r) => s + r.totalCharge, 0))}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Missing Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Missing WC Assignments ({missing.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {missing.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All employees assigned ✓</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {missing.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded bg-destructive/5 border border-destructive/20">
                    <div>
                      <p className="text-sm font-medium">{e.first_name} {e.last_name}</p>
                      <p className="text-xs text-muted-foreground">{companyMap.get(e.company_id) || '—'} · {e.title || 'No title'}</p>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monopolistic & Expiring */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-500" /> Monopolistic State Summary ({monopolistic.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {monopolistic.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No monopolistic state policies</p>
              ) : (
                <div className="space-y-2">
                  {monopolistic.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-amber-50 border border-amber-200">
                      <div>
                        <p className="text-sm font-medium">{companyMap.get(p.company_id) || '—'}</p>
                        <p className="text-xs text-amber-600">{p.states_covered?.join(', ')} · {p.reporting_frequency || '—'}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Monopolistic</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-orange-500" /> Policies Expiring (90 days) ({expiring.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {expiring.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No policies expiring soon</p>
              ) : (
                <div className="space-y-2">
                  {expiring.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-orange-50 border border-orange-200">
                      <div>
                        <p className="text-sm font-medium">{companyMap.get(p.company_id) || '—'}</p>
                        <p className="text-xs text-orange-600">{p.carrier_name} · {p.policy_number}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-600">Exp. {p.expiration_date}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
