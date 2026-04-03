import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EligibilityStatus =
  | 'eligible'
  | 'blocked_onboarding'
  | 'blocked_compliance'
  | 'blocked_missing_pay_data'
  | 'blocked_employment_status'
  | 'excluded_off_cycle'
  | 'processed';

export interface EmployeeEligibility {
  employee_id: string;
  status: EligibilityStatus;
  reasons: string[];
  onboarding_complete: boolean;
  compliance_clear: boolean;
  has_pay_data: boolean;
  employment_active: boolean;
}

/**
 * Checks payroll eligibility for all employees in a payroll run by cross-referencing
 * compliance_items, onboarding_tasks, and employee status.
 */
export function usePayrollEligibility(companyId: string | undefined, employeeIds: string[]) {
  return useQuery({
    queryKey: ['payroll_eligibility', companyId, employeeIds],
    queryFn: async () => {
      if (!companyId || employeeIds.length === 0) return [];

      // Fetch all relevant data in parallel
      const [complianceRes, employeesRes, onboardingRes] = await Promise.all([
        supabase
          .from('compliance_items')
          .select('entity_id, status, blocker, title, category')
          .eq('entity_type', 'employee')
          .eq('company_id', companyId)
          .in('entity_id', employeeIds)
          .in('status', ['pending', 'in_progress', 'overdue']),
        supabase
          .from('employees')
          .select('id, status, pay_type, annual_salary_cents, hourly_rate_cents')
          .in('id', employeeIds),
        supabase
          .from('onboarding_sessions')
          .select('employee_id, status')
          .eq('company_id', companyId)
          .in('employee_id', employeeIds),
      ]);

      const complianceByEmp = new Map<string, Array<{ title: string; blocker: boolean }>>();
      for (const item of (complianceRes.data ?? []) as any[]) {
        const list = complianceByEmp.get(item.entity_id) || [];
        list.push({ title: item.title, blocker: item.blocker ?? false });
        complianceByEmp.set(item.entity_id, list);
      }

      const employeeMap = new Map<string, any>();
      for (const emp of (employeesRes.data ?? []) as any[]) {
        employeeMap.set(emp.id, emp);
      }

      const onboardingByEmp = new Map<string, string>();
      for (const ob of (onboardingRes.data ?? []) as any[]) {
        onboardingByEmp.set(ob.employee_id, ob.status);
      }

      const results: EmployeeEligibility[] = [];

      for (const empId of employeeIds) {
        const emp = employeeMap.get(empId);
        const compliance = complianceByEmp.get(empId) || [];
        const obStatus = onboardingByEmp.get(empId);
        const reasons: string[] = [];

        // Check employment status
        const employmentActive = emp?.status === 'active';
        if (!employmentActive) {
          reasons.push(`Employment status: ${emp?.status ?? 'unknown'}`);
        }

        // Check onboarding completion
        const onboardingComplete = !obStatus || obStatus === 'completed';
        if (obStatus && obStatus !== 'completed') {
          reasons.push(`Onboarding incomplete (${obStatus})`);
        }

        // Check compliance blockers
        const blockingCompliance = compliance.filter(c => c.blocker);
        const complianceClear = blockingCompliance.length === 0;
        if (!complianceClear) {
          for (const bc of blockingCompliance) {
            reasons.push(`Compliance: ${bc.title}`);
          }
        }

        // Check pay data
        const hasPayData = emp?.pay_type === 'salary'
          ? (emp?.annual_salary_cents ?? 0) > 0
          : (emp?.hourly_rate_cents ?? 0) > 0;
        if (!hasPayData) {
          reasons.push('Missing pay rate data');
        }

        let status: EligibilityStatus = 'eligible';
        if (!employmentActive) status = 'blocked_employment_status';
        else if (!onboardingComplete) status = 'blocked_onboarding';
        else if (!complianceClear) status = 'blocked_compliance';
        else if (!hasPayData) status = 'blocked_missing_pay_data';

        results.push({
          employee_id: empId,
          status,
          reasons,
          onboarding_complete: onboardingComplete,
          compliance_clear: complianceClear,
          has_pay_data: hasPayData,
          employment_active: employmentActive,
        });
      }

      return results;
    },
    enabled: !!companyId && employeeIds.length > 0,
  });
}

export function getEligibilityBadgeProps(status: EligibilityStatus): { label: string; className: string } {
  switch (status) {
    case 'eligible': return { label: 'Eligible', className: 'bg-success/10 text-success' };
    case 'blocked_onboarding': return { label: 'Blocked – Onboarding', className: 'bg-destructive/10 text-destructive' };
    case 'blocked_compliance': return { label: 'Blocked – Compliance', className: 'bg-destructive/10 text-destructive' };
    case 'blocked_missing_pay_data': return { label: 'Blocked – Missing Pay Data', className: 'bg-warning/10 text-warning' };
    case 'blocked_employment_status': return { label: 'Blocked – Employment', className: 'bg-destructive/10 text-destructive' };
    case 'excluded_off_cycle': return { label: 'Off-Cycle', className: 'bg-warning/10 text-warning' };
    case 'processed': return { label: 'Processed', className: 'bg-success/10 text-success' };
    default: return { label: status, className: 'bg-muted text-muted-foreground' };
  }
}
