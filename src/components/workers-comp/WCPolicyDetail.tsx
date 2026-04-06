import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWCPolicy, useWCCodes, useWCAssignments, centsToUSD } from '@/hooks/useWorkersComp';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { ArrowLeft, Plus, Edit, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { WCPolicyDrawer } from './WCPolicyDrawer';
import { WCCodeDrawer } from './WCCodeDrawer';
import { WCAssignmentDrawer } from './WCAssignmentDrawer';

interface Props {
  policyId: string;
  onBack: () => void;
}

export function WCPolicyDetail({ policyId, onBack }: Props) {
  const { data: policy, isLoading } = useWCPolicy(policyId);
  const { data: codes = [] } = useWCCodes(policyId);
  const { data: allAssignments = [] } = useWCAssignments(policy?.company_id);
  const { data: companies = [] } = useCompanies();
  const { data: employees = [] } = useEmployees(policy?.company_id);

  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<any>(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);

  const companyName = companies.find(c => c.id === policy?.company_id)?.name || '—';
  const policyAssignments = allAssignments.filter(a => codes.some(c => c.id === a.wc_code_id));
  const codeMap = new Map(codes.map(c => [c.id, c]));
  const empMap = new Map(employees.map(e => [e.id, e]));

  if (isLoading || !policy) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;

  // Payroll exposure preview
  const exposureByCode = codes.filter(c => c.is_active).map(code => {
    const assignedEmps = policyAssignments.filter(a => a.wc_code_id === code.id && a.is_active);
    const totalWages = assignedEmps.reduce((sum, a) => {
      const emp = empMap.get(a.employee_id);
      return sum + (emp?.annual_salary_cents || (emp?.hourly_rate_cents || 0) * 2080);
    }, 0);
    const premium = Math.round((totalWages / 10000) * code.rate_per_hundred);
    const markup = Math.round(premium * (policy.markup_rate || 0));
    return { code, assignedCount: assignedEmps.length, totalWages, premium, markup, total: premium + markup };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{policy.carrier_name} — {policy.policy_number}</h2>
          <p className="text-sm text-muted-foreground">{companyName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditDrawerOpen(true)}>
          <Edit className="h-3.5 w-3.5 mr-1" /> Edit Policy
        </Button>
      </div>

      {/* Policy Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant="outline" className={`mt-1 capitalize ${policy.status === 'active' ? 'border-emerald-500 text-emerald-600' : 'border-muted-foreground'}`}>{policy.status}</Badge>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Experience Mod</p>
          <p className="text-lg font-semibold mt-1">{policy.experience_mod}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">Effective Period</p>
          <p className="text-sm font-medium mt-1">{format(new Date(policy.effective_date), 'MMM d, yyyy')} — {format(new Date(policy.expiration_date), 'MMM d, yyyy')}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 px-4">
          <p className="text-xs text-muted-foreground">States</p>
          <div className="flex flex-wrap gap-1 mt-1">{policy.states_covered?.map(s => (
            <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
          ))}</div>
        </CardContent></Card>
      </div>

      {policy.is_monopolistic && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Landmark className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700">Monopolistic State Policy</p>
              <p className="text-xs text-amber-600">State Fund Account: {policy.state_fund_account || '—'} · Reporting: {policy.reporting_frequency || '—'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="codes">WC Codes & Rates ({codes.length})</TabsTrigger>
          <TabsTrigger value="employees">Employee Assignments ({policyAssignments.length})</TabsTrigger>
          <TabsTrigger value="exposure">Payroll Exposure</TabsTrigger>
        </TabsList>

        <TabsContent value="codes">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Class Codes</CardTitle>
              <Button size="sm" onClick={() => { setEditingCode(null); setCodeDrawerOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1" /> Add Code</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Rate / $100</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No class codes added</TableCell></TableRow>
                  ) : codes.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell className="text-sm">{c.description}</TableCell>
                      <TableCell>{c.state}</TableCell>
                      <TableCell className="font-mono">${c.rate_per_hundred.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(c.effective_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${c.is_active ? 'border-emerald-500 text-emerald-600' : 'border-muted-foreground'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCode(c); setCodeDrawerOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Employee Assignments</CardTitle>
              <Button size="sm" onClick={() => setAssignDrawerOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Assign Employee</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>WC Code</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyAssignments.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No assignments</TableCell></TableRow>
                  ) : policyAssignments.map(a => {
                    const emp = empMap.get(a.employee_id);
                    const code = codeMap.get(a.wc_code_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{emp ? `${emp.first_name} ${emp.last_name}` : '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp?.title || '—'}</TableCell>
                        <TableCell className="font-mono">{code?.code || '—'} — {code?.description || ''}</TableCell>
                        <TableCell>{code?.state || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(a.effective_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${a.is_active ? 'border-emerald-500 text-emerald-600' : 'border-muted-foreground'}`}>
                            {a.is_active ? 'Active' : 'Ended'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exposure">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Payroll Exposure Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WC Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Annual Wages</TableHead>
                    <TableHead className="text-right">Est. Premium</TableHead>
                    <TableHead className="text-right">Markup</TableHead>
                    <TableHead className="text-right">Client Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exposureByCode.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No active codes</TableCell></TableRow>
                  ) : (
                    <>
                      {exposureByCode.map(e => (
                        <TableRow key={e.code.id}>
                          <TableCell className="font-mono font-medium">{e.code.code}</TableCell>
                          <TableCell className="text-sm">{e.code.description}</TableCell>
                          <TableCell className="text-right">{e.assignedCount}</TableCell>
                          <TableCell className="text-right font-mono">{centsToUSD(e.totalWages)}</TableCell>
                          <TableCell className="text-right font-mono">{centsToUSD(e.premium)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{centsToUSD(e.markup)}</TableCell>
                          <TableCell className="text-right font-mono font-medium">{centsToUSD(e.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">{exposureByCode.reduce((s, e) => s + e.assignedCount, 0)}</TableCell>
                        <TableCell className="text-right font-mono">{centsToUSD(exposureByCode.reduce((s, e) => s + e.totalWages, 0))}</TableCell>
                        <TableCell className="text-right font-mono">{centsToUSD(exposureByCode.reduce((s, e) => s + e.premium, 0))}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{centsToUSD(exposureByCode.reduce((s, e) => s + e.markup, 0))}</TableCell>
                        <TableCell className="text-right font-mono">{centsToUSD(exposureByCode.reduce((s, e) => s + e.total, 0))}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WCPolicyDrawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen} policy={policy} />
      <WCCodeDrawer open={codeDrawerOpen} onOpenChange={setCodeDrawerOpen} code={editingCode} policyId={policyId} companyId={policy.company_id} />
      <WCAssignmentDrawer open={assignDrawerOpen} onOpenChange={setAssignDrawerOpen} companyId={policy.company_id} codes={codes} />
    </div>
  );
}
