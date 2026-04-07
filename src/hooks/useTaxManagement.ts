import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// PEO-reporting states
export const PEO_SUI_STATES = [
  'AL','AZ','CO','DC','FL','GA','HI','ID','IL','IN','KS','MD','MO','MT',
  'NH','NJ','NM','NY','NC','OK','OR','TN','TX','UT','VA','WV','WY'
] as const;

export const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
] as const;

export const CLIENT_REPORTING_STATES = ALL_STATES.filter(
  s => !PEO_SUI_STATES.includes(s as any)
);

export const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DC:'Washington DC',DE:'Delaware',FL:'Florida',
  GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
};

export interface PeoSuiRate {
  id: string;
  state_code: string;
  rate: number;
  effective_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientSuiRate {
  id: string;
  company_id: string;
  state_code: string;
  rate: number;
  effective_date: string;
  end_date: string | null;
  uploaded_via: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuiAdjustment {
  id: string;
  company_id: string;
  state_code: string;
  adjustment_type: 'undercollection' | 'overcollection';
  old_rate: number;
  new_rate: number;
  effective_date: string;
  period_start: string;
  period_end: string;
  taxable_wages_cents: number;
  adjustment_cents: number;
  status: string;
  invoice_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── PEO SUI Rates ──
export function usePeoSuiRates() {
  return useQuery({
    queryKey: ['peo_sui_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('peo_sui_rates')
        .select('*')
        .order('state_code')
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PeoSuiRate[];
    },
  });
}

export function useUpsertPeoSuiRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: {
      id?: string;
      state_code: string;
      rate: number;
      effective_date: string;
      end_date?: string | null;
      notes?: string | null;
    }) => {
      if (rate.id) {
        const { id, ...updates } = rate;
        const { data, error } = await supabase
          .from('peo_sui_rates')
          .update(updates as any)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('peo_sui_rates')
          .insert(rate as any)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peo_sui_rates'] }),
  });
}

export function useDeletePeoSuiRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('peo_sui_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['peo_sui_rates'] }),
  });
}

// ── Client SUI Rates ──
export function useClientSuiRates(companyId?: string) {
  return useQuery({
    queryKey: ['client_sui_rates', companyId],
    queryFn: async () => {
      let query = supabase
        .from('client_sui_rates')
        .select('*')
        .order('state_code')
        .order('effective_date', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ClientSuiRate[];
    },
  });
}

export function useBulkUpsertClientSuiRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rates: Array<{
      company_id: string;
      state_code: string;
      rate: number;
      effective_date: string;
      uploaded_via?: string;
    }>) => {
      const { data, error } = await supabase
        .from('client_sui_rates')
        .upsert(rates as any[], { onConflict: 'company_id,state_code,effective_date' })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_sui_rates'] }),
  });
}

// ── SUI Adjustments ──
export function useSuiAdjustments(companyId?: string) {
  return useQuery({
    queryKey: ['sui_adjustments', companyId],
    queryFn: async () => {
      let query = supabase
        .from('sui_adjustments')
        .select('*')
        .order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SuiAdjustment[];
    },
  });
}

export function useCreateSuiAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (adj: Omit<SuiAdjustment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('sui_adjustments')
        .insert(adj as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sui_adjustments'] }),
  });
}

export function useUpdateSuiAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('sui_adjustments')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sui_adjustments'] }),
  });
}
