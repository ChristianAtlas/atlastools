import { Heart, Shield, Landmark, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { Loader2 } from 'lucide-react';

const mockBenefits = [
  {
    id: '1',
    name: 'Medical – PPO Gold',
    type: 'Medical',
    icon: Heart,
    employeeCost: 15200,
    employerCost: 45600,
    coverage: 'Employee + Spouse',
    carrier: 'Blue Cross Blue Shield',
    planId: 'PPO-GOLD-2026',
    status: 'enrolled',
  },
  {
    id: '2',
    name: 'Dental – Standard',
    type: 'Dental',
    icon: Shield,
    employeeCost: 3200,
    employerCost: 6400,
    coverage: 'Employee Only',
    carrier: 'Delta Dental',
    planId: 'DNT-STD-2026',
    status: 'enrolled',
  },
  {
    id: '3',
    name: '401(k) Retirement',
    type: 'Retirement',
    icon: Landmark,
    employeeCost: 0,
    employerCost: 0,
    coverage: '6% employee / 3% match',
    carrier: 'Fidelity',
    planId: '401K-2026',
    status: 'enrolled',
  },
];

const importantDates = [
  { label: 'Open Enrollment', date: 'Nov 1 – Nov 15, 2026' },
  { label: 'Benefits Effective', date: 'Jan 1, 2027' },
  { label: 'FSA Deadline', date: 'Dec 31, 2026' },
];

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function Benefits() {
  const { isLoading } = useCurrentEmployee();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalEmployeeCost = mockBenefits.reduce((s, b) => s + b.employeeCost, 0);
  const totalEmployerCost = mockBenefits.reduce((s, b) => s + b.employerCost, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Benefits" description="View your enrolled benefits and important dates" />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="animate-in-up">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Your Monthly Cost</p>
            <p className="text-lg font-semibold">{formatCurrency(totalEmployeeCost)}</p>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-1">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Employer Contribution</p>
            <p className="text-lg font-semibold">{formatCurrency(totalEmployerCost)}</p>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-2">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Benefits Value</p>
            <p className="text-lg font-semibold">{formatCurrency(totalEmployeeCost + totalEmployerCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Benefits */}
      <Card className="animate-in-up stagger-3">
        <CardHeader><CardTitle className="text-sm">Enrolled Benefits</CardTitle></CardHeader>
        <CardContent className="divide-y -mt-2">
          {mockBenefits.map(b => (
            <div key={b.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.carrier} · {b.coverage}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(b.employeeCost)}/mo</p>
                <p className="text-xs text-muted-foreground">Employer: {formatCurrency(b.employerCost)}/mo</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card className="animate-in-up stagger-4">
        <CardHeader><CardTitle className="text-sm">Important Dates</CardTitle></CardHeader>
        <CardContent className="space-y-3 -mt-2">
          {importantDates.map(d => (
            <div key={d.label} className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.date}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
