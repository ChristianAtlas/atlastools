import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AccrualMethod = 'per_hour_worked' | 'per_pay_period' | 'annual_allowance';
export type ResetSchedule = 'calendar_year' | 'hire_date' | 'custom_date';
export type UnusedHoursPolicy = 'clear' | 'carryover';
export type PolicyType = 'pto' | 'vacation' | 'sick' | 'custom';

export interface TimeOffPolicy {
  id: string;
  company_id: string;
  name: string;
  policy_type: PolicyType;
  accrual_method: AccrualMethod;
  accrual_rate: number;
  eligible_earning_codes: string[];
  balance_cap_hours: number | null;
  annual_accrual_cap_hours: number | null;
  reset_schedule: ResetSchedule;
  custom_reset_date: string | null;
  unused_hours_policy: UnusedHoursPolicy;
  carryover_max_hours: number | null;
  waiting_period_days: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeOffPolicyInput = Omit<TimeOffPolicy, 'id' | 'created_at' | 'updated_at'>;

export function useTimeOffPolicies(companyId?: string) {
  return useQuery({
    queryKey: ['time_off_policies', companyId],
    queryFn: async () => {
      let q = supabase.from('time_off_policies').select('*').order('name');
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TimeOffPolicy[];
    },
  });
}

export function useCreateTimeOffPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TimeOffPolicyInput) => {
      const { data, error } = await supabase
        .from('time_off_policies')
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_off_policies'] });
      toast.success('Time off policy created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTimeOffPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TimeOffPolicyInput>) => {
      const { data, error } = await supabase
        .from('time_off_policies')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_off_policies'] });
      toast.success('Time off policy updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteTimeOffPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_off_policies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time_off_policies'] });
      toast.success('Time off policy deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
