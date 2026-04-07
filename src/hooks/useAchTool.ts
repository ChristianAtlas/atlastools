import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AchTransaction {
  id: string;
  direction: 'credit' | 'debit';
  entity_type: 'company' | 'employee';
  entity_id: string;
  entity_label: string;
  amount_cents: number;
  collection_date: string;
  settle_date: string;
  internal_note: string | null;
  status: string;
  nacha_generated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAchTransactions() {
  return useQuery({
    queryKey: ['ach_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ach_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AchTransaction[];
    },
  });
}

export function useCreateAchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (txn: Omit<AchTransaction, 'id' | 'created_at' | 'updated_at' | 'nacha_generated_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('ach_transactions')
        .insert({ ...txn, status: 'pending' } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ach_transactions'] }),
  });
}

export function useUpdateAchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('ach_transactions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ach_transactions'] }),
  });
}

/** Calculate settle date = collection_date + 4 business days */
export function calculateSettleDate(collectionDate: string): string {
  const d = new Date(collectionDate + 'T12:00:00');
  let businessDays = 0;
  while (businessDays < 4) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) businessDays++;
  }
  return d.toISOString().slice(0, 10);
}
