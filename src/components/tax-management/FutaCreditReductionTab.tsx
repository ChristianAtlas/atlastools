import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Info, Download, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';

const MOCK_FUTA_RATES = [
  { state: 'CA', stateName: 'California', standardCredit: 0.054, creditReduction: 0.021, effectiveRate: 0.027, year: 2025, status: 'credit_reduction' },
  { state: 'CT', stateName: 'Connecticut', standardCredit: 0.054, creditReduction: 0.021, effectiveRate: 0.027, year: 2025, status: 'credit_reduction' },
  { state: 'IL', stateName: 'Illinois', standardCredit: 0.054, creditReduction: 0.009, effectiveRate: 0.015, year: 2025, status: 'credit_reduction' },
  { state: 'NY', stateName: 'New York', standardCredit: 0.054, creditReduction: 0.012, effectiveRate: 0.018, year: 2025, status: 'credit_reduction' },
  { state: 'TX', stateName: 'Texas', standardCredit: 0.054, creditReduction: 0, effectiveRate: 0.006, year: 2025, status: 'standard' },
  { state: 'FL', stateName: 'Florida', standardCredit: 0.054, creditReduction: 0, effectiveRate: 0.006, year: 2025, status: 'standard' },
  { state: 'OH', stateName: 'Ohio', standardCredit: 0.054, creditReduction: 0.003, effectiveRate: 0.009, year: 2025, status: 'credit_reduction' },
];

const MOCK_CID_IMPACT = [
  { cid: 'C2', companyName: 'Acme Corp', affectedStates: ['CA', 'NY'], employeesImpacted: 15, additionalFutaCents: 3150000, status: 'calculated' },
  { cid: 'C3', companyName: 'TechStart LLC', affectedStates: ['CA'], employeesImpacted: 8, additionalFutaCents: 1260000, status: 'calculated' },
];

const fmt = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function FutaCreditReductionTab() {
  const [search, setSearch] = useState('');

  const reductionStates = MOCK_FUTA_RATES.filter(r => r.status === 'credit_reduction');
  const totalImpact = MOCK_CID_IMPACT.reduce((s, c) => s + c.additionalFutaCents, 0);

  const filteredRates = MOCK_FUTA_RATES.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.state.toLowerCase().includes(q) || r.stateName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Credit Reduction States" value={String(reductionStates.length)} icon={AlertTriangle} />
        <StatCard title="Impacted Clients" value={String(MOCK_CID_IMPACT.length)} icon={AlertTriangle} />
        <StatCard title="Total Additional FUTA" value={fmt(totalImpact)} icon={AlertTriangle} />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>FUTA Credit Reduction</AlertTitle>
        <AlertDescription className="text-sm">
          States that have not repaid federal unemployment loans are subject to FUTA credit reductions. Employers in these states pay a higher effective FUTA tax rate. The standard FUTA rate is 6.0% with a normal credit of 5.4%, yielding a net rate of 0.6%. Credit reduction states have a reduced credit, increasing the effective rate.
        </AlertDescription>
      </Alert>

      {/* State Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">FUTA Credit Reduction Rates (TY 2025)</CardTitle>
              <CardDescription>DOL Schedule of FUTA credit reduction states</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search states..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Standard Credit</TableHead>
                <TableHead>Credit Reduction</TableHead>
                <TableHead>Effective FUTA Rate</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRates.map(r => (
                <TableRow key={r.state}>
                  <TableCell className="font-medium">{r.state} – {r.stateName}</TableCell>
                  <TableCell className="tabular-nums">{(r.standardCredit * 100).toFixed(1)}%</TableCell>
                  <TableCell className={`tabular-nums ${r.creditReduction > 0 ? 'text-destructive font-medium' : ''}`}>
                    {r.creditReduction > 0 ? `${(r.creditReduction * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums font-semibold">{(r.effectiveRate * 100).toFixed(1)}%</TableCell>
                  <TableCell>{r.year}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === 'credit_reduction' ? 'border-destructive text-destructive' : 'border-emerald-500 text-emerald-600'}>
                      {r.status === 'credit_reduction' ? 'Credit Reduction' : 'Standard'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Client Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Impact Analysis</CardTitle>
          <CardDescription>Companies with employees in credit reduction states and estimated additional FUTA liability</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Affected States</TableHead>
                <TableHead>Employees Impacted</TableHead>
                <TableHead>Additional FUTA</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CID_IMPACT.map(c => (
                <TableRow key={c.cid}>
                  <TableCell className="font-mono text-sm font-medium">{c.cid}</TableCell>
                  <TableCell>{c.companyName}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.affectedStates.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{c.employeesImpacted}</TableCell>
                  <TableCell className="tabular-nums font-semibold text-destructive">{fmt(c.additionalFutaCents)}</TableCell>
                  <TableCell><Badge variant="outline" className="border-primary text-primary">{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
