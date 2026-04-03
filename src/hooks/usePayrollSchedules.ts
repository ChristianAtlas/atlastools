import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PayrollScheduleRow {
  id: string;
  company_id: string;
  pay_frequency: string;
  auto_approve_enabled: boolean;
  timecard_deadline_day: string;
  timecard_deadline_time: string;
  approval_deadline_days_before: number;
  approval_deadline_time: string;
  expedited_wire_deadline_day: string;
  expedited_wire_deadline_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  companies?: { name: string } | null;
}

export function usePayrollSchedules(companyId?: string) {
  return useQuery({
    queryKey: ['payroll_schedules', companyId],
    queryFn: async () => {
      let query = supabase
        .from('payroll_schedules' as any)
        .select('*, companies(name)')
        .eq('is_active', true);
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PayrollScheduleRow[];
    },
  });
}

export function useUpsertPayrollSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<PayrollScheduleRow> & { company_id: string; pay_frequency: string }) => {
      const { data, error } = await supabase
        .from('payroll_schedules' as any)
        .upsert(body as any, { onConflict: 'company_id,pay_frequency' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll_schedules'] }),
  });
}
