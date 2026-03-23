import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PayrollRunStatus =
  | 'draft' | 'time_review' | 'editing' | 'preview'
  | 'pending_client_approval' | 'client_approved'
  | 'funding' | 'pending_admin_approval' | 'admin_approved'
  | 'submitting' | 'submitted' | 'processing'
  | 'completed' | 'failed' | 'voided' | 'reversed';

export type PayrollRunType = 'regular' | 'off_cycle' | 'bonus' | 'commission' | 'reimbursement' | 'correction';

export interface PayrollRunRow {
  id: string;
  company_id: string;
  run_type: PayrollRunType;
  status: PayrollRunStatus;
  pay_frequency: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  check_date: string | null;
  submission_deadline: string | null;
  submitted_at: string | null;
  employee_count: number;
  gross_pay_cents: number;
  net_pay_cents: number;
  employer_taxes_cents: number;
  employer_benefits_cents: number;
  workers_comp_cents: number;
  total_employer_cost_cents: number;
  client_approved_by: string | null;
  client_approved_at: string | null;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  provider_batch_id: string | null;
  provider_status: string | null;
  provider_response: Record<string, unknown> | null;
  parent_run_id: string | null;
  void_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  created_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields
  companies?: { name: string } | null;
}

export interface PayrollRunEmployeeRow {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  company_id: string;
  status: string;
  regular_hours: number;
  overtime_hours: number;
  pto_hours: number;
  holiday_hours: number;
  regular_pay_cents: number;
  overtime_pay_cents: number;
  bonus_cents: number;
  commission_cents: number;
  reimbursement_cents: number;
  other_earnings_cents: number;
  gross_pay_cents: number;
  federal_tax_cents: number;
  state_tax_cents: number;
  local_tax_cents: number;
  social_security_cents: number;
  medicare_cents: number;
  benefits_deduction_cents: number;
  retirement_deduction_cents: number;
  garnishment_cents: number;
  other_deductions_cents: number;
  total_deductions_cents: number;
  net_pay_cents: number;
  employer_fica_cents: number;
  employer_futa_cents: number;
  employer_sui_cents: number;
  employer_benefits_cents: number;
  workers_comp_cents: number;
  total_employer_cost_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  employees?: { first_name: string; last_name: string; pay_type: string; title: string | null } | null;
}

export function usePayrollRuns(companyId?: string) {
  return useQuery({
    queryKey: ['payroll_runs', companyId],
    queryFn: async () => {
      let query = supabase
        .from('payroll_runs')
        .select('*, companies(name)')
        .is('deleted_at', null)
        .order('pay_date', { ascending: false });
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PayrollRunRow[];
    },
  });
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: ['payroll_runs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*, companies(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as PayrollRunRow;
    },
    enabled: !!id,
  });
}

export function usePayrollRunEmployees(runId: string | undefined) {
  return useQuery({
    queryKey: ['payroll_run_employees', runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_run_employees')
        .select('*')
        .eq('payroll_run_id', runId!)
        .order('employee_id');
      const { data: d, error: e } = { data, error };
      if (e) throw e;
      return (d ?? []) as unknown as PayrollRunEmployeeRow[];
    },
    enabled: !!runId,
  });
}

export function useUpdatePayrollRunStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, ...extras }: { id: string; status: PayrollRunStatus } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .update({ status, ...extras } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll_runs'] }),
  });
}

/** Convert cents to formatted USD */
export function centsToUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}
