import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Form8973Filing = {
  id: string;
  company_id: string;
  status: string;
  contract_begin_date: string;
  contract_end_date: string | null;
  is_new_contract: boolean;
  cpeo_name: string;
  cpeo_ein: string;
  client_legal_name: string | null;
  client_ein: string | null;
  client_address_line1: string | null;
  client_address_line2: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip: string | null;
  client_contact_name: string | null;
  client_contact_phone: string | null;
  client_contact_email: string | null;
  signature_requested_at: string | null;
  signature_requested_by: string | null;
  signed_at: string | null;
  signer_name: string | null;
  signer_title: string | null;
  submitted_to_irs_at: string | null;
  irs_confirmation_number: string | null;
  irs_response_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // joined
  company_name?: string;
  company_cid?: string;
  company_premier_date?: string | null;
};

export function useForm8973Filings() {
  return useQuery({
    queryKey: ['form_8973_filings'],
    queryFn: async () => {
      const { data: filings, error } = await supabase
        .from('form_8973_filings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Join company info
      const companyIds = [...new Set((filings ?? []).map(f => f.company_id))];
      let companiesMap = new Map<string, { name: string; cid: string; premier_date: string | null }>();
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, cid, premier_date')
          .in('id', companyIds);
        (companies ?? []).forEach(c => companiesMap.set(c.id, { name: c.name, cid: c.cid, premier_date: c.premier_date }));
      }

      return (filings ?? []).map(f => ({
        ...f,
        company_name: companiesMap.get(f.company_id)?.name,
        company_cid: companiesMap.get(f.company_id)?.cid,
        company_premier_date: companiesMap.get(f.company_id)?.premier_date,
      })) as Form8973Filing[];
    },
  });
}

export function useCreateForm8973() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filing: Partial<Form8973Filing>) => {
      const { company_name, company_cid, company_premier_date, ...rest } = filing as any;
      const { data, error } = await supabase.from('form_8973_filings').insert(rest).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form_8973_filings'] }),
  });
}

export function useUpdateForm8973() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Form8973Filing>) => {
      const { company_name, company_cid, company_premier_date, ...rest } = updates as any;
      const { data, error } = await supabase.from('form_8973_filings').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form_8973_filings'] }),
  });
}

export function useDeleteForm8973() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('form_8973_filings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form_8973_filings'] }),
  });
}

export const FORM_8973_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'border-muted-foreground text-muted-foreground' },
  { value: 'pending_signature', label: 'Pending Signature', color: 'border-amber-500 text-amber-600' },
  { value: 'signed', label: 'Signed', color: 'border-blue-500 text-blue-600' },
  { value: 'submitted', label: 'Submitted to IRS', color: 'border-indigo-500 text-indigo-600' },
  { value: 'accepted', label: 'Accepted', color: 'border-emerald-500 text-emerald-600' },
  { value: 'rejected', label: 'Rejected', color: 'border-destructive text-destructive' },
] as const;

export function getStatusConfig(status: string) {
  return FORM_8973_STATUSES.find(s => s.value === status) ?? FORM_8973_STATUSES[0];
}
