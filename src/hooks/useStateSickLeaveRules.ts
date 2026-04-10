import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StateSickLeaveRule {
  id: string;
  state_code: string;
  state_name: string;
  law_name: string;
  max_use_hours_per_year: number | null;
  accrual_rate_hours: number;
  accrual_per_hours_worked: number;
  is_active: boolean;
  notes: string | null;
  effective_date: string | null;
  carryover_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export function useStateSickLeaveRules() {
  return useQuery({
    queryKey: ['state_sick_leave_rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('state_sick_leave_rules')
        .select('*')
        .order('state_name');
      if (error) throw error;
      return (data ?? []) as unknown as StateSickLeaveRule[];
    },
  });
}

export function useUpdateStateSickLeaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<StateSickLeaveRule, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('state_sick_leave_rules')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['state_sick_leave_rules'] });
      toast.success('State sick leave rule updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateStateSickLeaveRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<StateSickLeaveRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('state_sick_leave_rules')
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['state_sick_leave_rules'] });
      toast.success('State sick leave rule created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
