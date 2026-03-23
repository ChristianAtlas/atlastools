import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { usePayrollRuns, centsToUSD, type PayrollRunStatus } from '@/hooks/usePayrollRuns';
import { Plus, Clock, Loader2 } from 'lucide-react';

const workflowSteps = ['Time Review', 'Payroll Edit', 'Preview', 'Client Approval', 'Funding', 'Admin Approval', 'Submit'];

function stepIndex(status: PayrollRunStatus): number {
  const map: Record<string, number> = {
    draft: -1,
    time_review: 0,
    editing: 1,
    preview: 2,
    pending_client_approval: 3,
    client_approved: 3,
    funding: 4,
    pending_admin_approval: 5,
    admin_approved: 5,
    submitting: 6,
    submitted: 6,
    processing: 7,
    completed: 7,
    failed: -1,
    voided: -1,
    reversed: -1,
  };
  return map[status] ?? -1;
}

/** Map detailed status to a simpler badge label */
function badgeStatus(status: PayrollRunStatus): string {
  const map: Record<string, string> = {
    draft: 'draft',
    time_review: 'in_review',
    editing: 'in_review',
    preview: 'in_review',
    pending_client_approval: 'pending_approval',
    client_approved: 'approved',
    funding: 'in_review',
    pending_admin_approval: 'pending_approval',
    admin_approved: 'approved',
    submitting: 'processing',
    submitted: 'processing',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
    voided: 'suspended',
    reversed: 'suspended',
  };
  return map[status] ?? status;
}

export default function Payroll() {
  const navigate = useNavigate();
  const { data: runs = [], isLoading } = usePayrollRuns();

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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No payroll runs yet.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-in-up stagger-2">
          {runs.map(run => {
            const currentStep = stepIndex(run.status);
            const companyName = run.companies?.name ?? 'Unknown';
            const showStepper = !['completed', 'failed', 'voided', 'reversed'].includes(run.status);
            return (
              <div key={run.id} onClick={() => navigate(`/payroll/${run.id}`)} className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{companyName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {run.pay_period_start} — {run.pay_period_end} · Pay date: {run.pay_date}
                    </p>
                  </div>
                  <StatusBadge status={badgeStatus(run.status)} />
                </div>

                {showStepper && (
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
                    <p className="font-semibold tabular-nums">{centsToUSD(run.gross_pay_cents)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Pay</p>
                    <p className="font-semibold tabular-nums">{centsToUSD(run.net_pay_cents)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Employees</p>
                    <p className="font-semibold tabular-nums">{run.employee_count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
