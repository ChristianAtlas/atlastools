import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { payrollRuns } from '@/lib/mock-data';
import { Plus, Clock } from 'lucide-react';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const workflowSteps = ['Time Review', 'Payroll Edit', 'Preview', 'Client Approval', 'Funding', 'Admin Approval', 'Submit'];

function stepIndex(status: string) {
  const map: Record<string, number> = { draft: 0, in_review: 1, pending_approval: 3, approved: 5, processing: 6, completed: 7, failed: -1 };
  return map[status] ?? 0;
}

export default function Payroll() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Payroll Runs"
        description="Manage payroll workflows across all companies"
        actions={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Payroll Run</Button>}
      />

      {/* Cutoff notice */}
      <div className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm animate-in-up stagger-1">
        <Clock className="h-4 w-4 text-warning shrink-0" />
        <p><span className="font-medium">Payroll cutoff:</span> Tuesday 6:00 PM EST. Submissions after cutoff roll to next pay period.</p>
      </div>

      <div className="space-y-4 animate-in-up stagger-2">
        {payrollRuns.map(run => {
          const currentStep = stepIndex(run.status);
          return (
            <div key={run.id} className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{run.companyName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {run.payPeriodStart} — {run.payPeriodEnd} · Pay date: {run.payDate}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>

              {/* Workflow stepper */}
              {run.status !== 'completed' && run.status !== 'failed' && (
                <div className="mt-4 flex items-center gap-1">
                  {workflowSteps.map((step, i) => (
                    <div key={step} className="flex items-center gap-1 flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`h-1.5 w-full rounded-full ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
                        <span className={`text-[10px] mt-1 ${i <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {step}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Gross Pay</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(run.grossPay)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Pay</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(run.netPay)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="font-semibold tabular-nums">{run.employeeCount}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
