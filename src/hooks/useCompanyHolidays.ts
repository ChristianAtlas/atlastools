import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyHoliday {
  id: string;
  company_id: string;
  name: string;
  date: string;
  is_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useCompanyHolidays(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company_holidays', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_holidays' as any)
        .select('*')
        .eq('company_id', companyId!)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CompanyHoliday[];
    },
    enabled: !!companyId,
  });
}

export function useCreateCompanyHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (holiday: Omit<CompanyHoliday, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('company_holidays' as any)
        .insert(holiday as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company_holidays'] }),
  });
}

export function useUpdateCompanyHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyHoliday> & { id: string }) => {
      const { data, error } = await supabase
        .from('company_holidays' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company_holidays'] }),
  });
}

export function useDeleteCompanyHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_holidays' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company_holidays'] }),
  });
}
