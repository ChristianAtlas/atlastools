import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimecardRow {
  id: string;
  employee_id: string;
  payroll_run_id: string;
  company_id: string;
  regular_hours: number;
  overtime_hours: number;
  pto_hours: number;
  holiday_hours: number;
  total_hours: number;
  approval_status: string;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: { first_name: string; last_name: string; title: string | null; email: string } | null;
  payroll_runs?: { pay_period_start: string; pay_period_end: string; pay_date: string; status: string } | null;
}

export function useTimecards(payrollRunId: string | undefined) {
  return useQuery({
    queryKey: ['timecards', payrollRunId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timecards' as any)
        .select('*, employees(first_name, last_name, title)')
        .eq('payroll_run_id', payrollRunId!)
        .order('employee_id');
      if (error) throw error;
      return (data ?? []) as unknown as TimecardRow[];
    },
    enabled: !!payrollRunId,
  });
}

/** Fetch all timecards for a company, optionally filtered by payroll run or status */
export function useCompanyTimecards(companyId: string | undefined, filters?: { payrollRunId?: string; status?: string }) {
  return useQuery({
    queryKey: ['company_timecards', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('timecards' as any)
        .select('*, employees(first_name, last_name, title, email), payroll_runs:payroll_run_id(pay_period_start, pay_period_end, pay_date, status)' as any)
        .eq('company_id', companyId!)
        .order('submitted_at', { ascending: false, nullsFirst: false });
      if (filters?.payrollRunId) query = query.eq('payroll_run_id', filters.payrollRunId);
      if (filters?.status && filters.status !== 'all') query = query.eq('approval_status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as TimecardRow[];
    },
    enabled: !!companyId,
  });
}

export function useUpdateTimecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TimecardRow>) => {
      const { data, error } = await supabase
        .from('timecards' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timecards'] });
      qc.invalidateQueries({ queryKey: ['company_timecards'] });
    },
  });
}

export function useApproveTimecards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, approvedBy }: { ids: string[]; approvedBy: string }) => {
      const { error } = await supabase
        .from('timecards' as any)
        .update({
          approval_status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timecards'] });
      qc.invalidateQueries({ queryKey: ['company_timecards'] });
    },
  });
}
