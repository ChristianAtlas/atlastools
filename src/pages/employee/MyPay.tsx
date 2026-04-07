import { useState } from 'react';
import { Download, Mail, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

// Mock paystub data
const mockPaystubs = Array.from({ length: 6 }, (_, i) => {
  const payDate = subDays(new Date(), i * 14);
  return {
    id: `ps-${i}`,
    payDate: format(payDate, 'yyyy-MM-dd'),
    periodStart: format(subDays(payDate, 13), 'yyyy-MM-dd'),
    periodEnd: format(subDays(payDate, 1), 'yyyy-MM-dd'),
    grossPay: 385000,
    netPay: 278500,
    federalTax: 52500,
    stateTax: 18200,
    socialSecurity: 23870,
    medicare: 5582,
    healthInsurance: 6348,
    retirement401k: 0,
    regularHours: 80,
    overtimeHours: 0,
    regularRate: 4812,
  };
});

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function MyPay() {
  const { data: employee, isLoading } = useCurrentEmployee();
  const [selectedStub, setSelectedStub] = useState(mockPaystubs[0].id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stub = mockPaystubs.find(s => s.id === selectedStub) ?? mockPaystubs[0];

  // YTD totals
  const ytdGross = mockPaystubs.reduce((s, p) => s + p.grossPay, 0);
  const ytdNet = mockPaystubs.reduce((s, p) => s + p.netPay, 0);
  const ytdTax = mockPaystubs.reduce((s, p) => s + p.federalTax + p.stateTax + p.socialSecurity + p.medicare, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="My Pay" description="View your paystubs and earnings history" />

      {/* YTD Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="animate-in-up">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Gross Pay</p>
              <p className="text-lg font-semibold">{formatCurrency(ytdGross)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Net Pay</p>
              <p className="text-lg font-semibold">{formatCurrency(ytdNet)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="animate-in-up stagger-2">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-primary" style={{ background: 'var(--gradient-primary-subtle)' }}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Taxes</p>
              <p className="text-lg font-semibold">{formatCurrency(ytdTax)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paystub selector */}
      <Card className="animate-in-up stagger-3">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Paystub Detail</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedStub} onValueChange={setSelectedStub}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mockPaystubs.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {format(new Date(s.payDate), 'MMM d, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
              <Mail className="h-3.5 w-3.5" /> Email
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Period: {format(new Date(stub.periodStart), 'MMM d')} – {format(new Date(stub.periodEnd), 'MMM d, yyyy')}</span>
            <Badge variant="secondary" className="text-[10px]">Bi-Weekly</Badge>
          </div>

          <Tabs defaultValue="earnings" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="taxes">Taxes</TabsTrigger>
              <TabsTrigger value="deductions">Deductions</TabsTrigger>
            </TabsList>

            <TabsContent value="earnings" className="mt-4">
              <div className="space-y-2">
                <Row label="Regular Hours" detail={`${stub.regularHours} hrs @ ${formatCurrency(stub.regularRate)}/hr`} amount={stub.regularHours * stub.regularRate} />
                {stub.overtimeHours > 0 && (
                  <Row label="Overtime" detail={`${stub.overtimeHours} hrs`} amount={stub.overtimeHours * stub.regularRate * 1.5} />
                )}
                <div className="border-t pt-2 mt-2">
                  <Row label="Gross Pay" amount={stub.grossPay} bold />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="taxes" className="mt-4">
              <div className="space-y-2">
                <Row label="Federal Income Tax" amount={-stub.federalTax} />
                <Row label="State Income Tax" amount={-stub.stateTax} />
                <Row label="Social Security" amount={-stub.socialSecurity} />
                <Row label="Medicare" amount={-stub.medicare} />
                <div className="border-t pt-2 mt-2">
                  <Row label="Total Taxes" amount={-(stub.federalTax + stub.stateTax + stub.socialSecurity + stub.medicare)} bold />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deductions" className="mt-4">
              <div className="space-y-2">
                <Row label="Health Insurance" detail="Employee portion" amount={-stub.healthInsurance} />
                <Row label="401(k) Contribution" detail="6% pre-tax" amount={-stub.retirement401k} />
                <div className="border-t pt-2 mt-2">
                  <Row label="Total Deductions" amount={-(stub.healthInsurance + stub.retirement401k)} bold />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 rounded-lg p-4" style={{ background: 'var(--gradient-primary-subtle)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Net Pay</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(stub.netPay)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, detail, amount, bold }: { label: string; detail?: string; amount: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-sm ${bold ? 'font-semibold' : ''}`}>{label}</span>
        {detail && <span className="text-xs text-muted-foreground ml-2">{detail}</span>}
      </div>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold' : ''} ${amount < 0 ? 'text-destructive' : ''}`}>
        {amount < 0 ? '-' : ''}{formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}
