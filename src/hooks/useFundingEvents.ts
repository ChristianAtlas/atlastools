import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FundingEventRow {
  id: string;
  company_id: string;
  payroll_run_id: string;
  method: string;
  amount_cents: number;
  status: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  wire_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFundingEvents(payrollRunId?: string) {
  return useQuery({
    queryKey: ['funding_events', payrollRunId],
    queryFn: async () => {
      let query = supabase.from('funding_events' as any).select('*');
      if (payrollRunId) query = query.eq('payroll_run_id', payrollRunId);
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as FundingEventRow[];
    },
    enabled: payrollRunId !== undefined,
  });
}

export function useCreateFundingEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<FundingEventRow>) => {
      const { data, error } = await supabase
        .from('funding_events' as any)
        .insert(body as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funding_events'] }),
  });
}

export function useConfirmFunding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, confirmedBy, wireReference }: { id: string; confirmedBy: string; wireReference?: string }) => {
      const { data, error } = await supabase
        .from('funding_events' as any)
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmed_by: confirmedBy,
          wire_reference: wireReference ?? null,
        } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funding_events'] });
      qc.invalidateQueries({ queryKey: ['payroll_runs'] });
    },
  });
}
