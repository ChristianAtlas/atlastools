import { Link } from 'react-router-dom';
import { CalendarDays, Clock, DollarSign, FileText, ArrowRight, Loader2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { usePTOBalances, hoursToDays } from '@/hooks/usePTO';
import { format, addDays, nextFriday } from 'date-fns';

export default function EmployeeDashboard() {
  const { data: employee, isLoading } = useCurrentEmployee();
  const { data: ptoBalances = [] } = usePTOBalances(employee?.id, employee?.company_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const firstName = employee?.first_name ?? 'there';
  const nextPayDate = nextFriday(new Date());
  const daysUntilPay = Math.ceil((nextPayDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Mock recent paystubs
  const recentPaystubs = [
    { id: '1', date: '2026-03-27', gross: 385000, net: 278500 },
    { id: '2', date: '2026-03-13', gross: 385000, net: 278500 },
  ];

  // Mock to-do items
  const todos = [
    { id: '1', label: 'Review and sign W-4 form', urgent: true },
    { id: '2', label: 'Complete direct deposit setup', urgent: false },
    { id: '3', label: 'Acknowledge employee handbook', urgent: false },
  ];

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`${employee?.title ?? 'Employee'} · ${employee?.companies?.name ?? ''}`}
      />

      {/* Top stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-in-up">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Pay Date</p>
              <p className="text-lg font-semibold">{format(nextPayDate, 'MMM d')}</p>
              <p className="text-xs text-muted-foreground">{daysUntilPay} days away</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in-up stagger-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PTO Available</p>
              <p className="text-lg font-semibold">
                {ptoBalances.length > 0
                  ? `${hoursToDays(ptoBalances.reduce((s, b) => s + b.available, 0))} days`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {ptoBalances.length > 0
                  ? `${hoursToDays(ptoBalances.reduce((s, b) => s + b.pending, 0))} pending`
                  : 'No policies'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in-up stagger-2">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hours This Period</p>
              <p className="text-lg font-semibold">80.0</p>
              <p className="text-xs text-muted-foreground">Standard</p>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-in-up stagger-3">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Documents</p>
              <p className="text-lg font-semibold">3</p>
              <p className="text-xs text-muted-foreground">Action needed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Paystubs */}
        <Card className="animate-in-up stagger-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">Recent Paystubs</CardTitle>
            <Link to="/my-pay" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="divide-y -mt-2">
            {recentPaystubs.map(stub => (
              <div key={stub.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{format(new Date(stub.date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">Gross: {formatCurrency(stub.gross)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(stub.net)}</p>
                  <p className="text-xs text-muted-foreground">Net pay</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* To-Do Items */}
        <Card className="animate-in-up stagger-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Action Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 -mt-2">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {todo.urgent && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgent</Badge>}
                  <span className="text-sm">{todo.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Verification letter CTA */}
      <Card className="animate-in-up stagger-4">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <h3 className="text-sm font-semibold">Employment Verification</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Generate a verification letter for your records</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/verification-letter">Generate Letter</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
