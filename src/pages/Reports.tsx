import { PageHeader } from '@/components/PageHeader';
import { BarChart3, Users, DollarSign, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const reports = [
  { id: 'r1', name: 'Payroll Summary', description: 'Gross/net pay breakdown by company and period', icon: DollarSign, category: 'Payroll' },
  { id: 'r2', name: 'Employee Census', description: 'Active headcount by company, department, and state', icon: Users, category: 'HR' },
  { id: 'r3', name: 'Invoice Aging', description: 'Outstanding invoices by age and status', icon: FileText, category: 'Billing' },
  { id: 'r4', name: 'Compliance Status', description: 'Open tasks and upcoming deadlines', icon: BarChart3, category: 'Compliance' },
];

export default function Reports() {
  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Generate and download platform reports" />

      <div className="grid gap-4 sm:grid-cols-2 animate-in-up stagger-1">
        {reports.map(report => (
          <div key={report.id} className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <report.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{report.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Download className="h-3 w-3 mr-1" />CSV
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Download className="h-3 w-3 mr-1" />PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
