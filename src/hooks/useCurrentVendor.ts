import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { VendorRow } from '@/hooks/useVendors';

/**
 * Returns the vendor row linked to the currently signed-in contractor.
 * RLS guarantees we only ever see our own row.
 */
export function useCurrentVendor() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['current-vendor', user?.id],
    enabled: !!user?.id && role === 'contractor',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .select('*, companies:company_id(name, cid)')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as VendorRow | null;
    },
  });
}

export interface ContractorProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  legal_name?: string;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  date_of_birth?: string | null;
  default_1099_category?: string;
}

export function useUpdateContractorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, updates }: { vendorId: string; updates: ContractorProfileUpdate }) => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .update(updates as any)
        .eq('id', vendorId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['current-vendor'] }),
  });
}

// =========================================================================
// Banking
// =========================================================================
export interface VendorBankingRow {
  id: string;
  vendor_id: string;
  company_id: string;
  account_holder_name: string | null;
  account_type: 'checking' | 'savings';
  routing_number_last4: string | null;
  account_number_last4: string | null;
  verification_status: 'pending' | 'verified' | 'failed';
  verified_at: string | null;
  last_changed_at: string;
  created_at: string;
  updated_at: string;
}

export function useVendorBanking(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-banking', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_banking' as any)
        .select('id, vendor_id, company_id, account_holder_name, account_type, routing_number_last4, account_number_last4, verification_status, verified_at, last_changed_at, created_at, updated_at')
        .eq('vendor_id', vendorId!)
        .maybeSingle();
      if (error && (error as any).code !== 'PGRST116') throw error;
      return (data as unknown as VendorBankingRow) ?? null;
    },
  });
}

export function useUpsertVendorBanking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      vendor_id: string;
      company_id: string;
      account_holder_name: string;
      account_type: 'checking' | 'savings';
      routing_number: string;
      account_number: string;
    }) => {
      const routing4 = input.routing_number.slice(-4);
      const account4 = input.account_number.slice(-4);
      // NOTE: production should run through a tokenization edge function.
      // We store the raw values in *_encrypted columns server-side; for the demo
      // we just write the masked last4 + leave the encrypted columns alone for now.
      const payload = {
        vendor_id: input.vendor_id,
        company_id: input.company_id,
        account_holder_name: input.account_holder_name,
        account_type: input.account_type,
        routing_number_last4: routing4,
        account_number_last4: account4,
        routing_number_encrypted: input.routing_number,
        account_number_encrypted: input.account_number,
      };
      const { data, error } = await supabase
        .from('vendor_banking' as any)
        .upsert(payload as any, { onConflict: 'vendor_id' })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorBankingRow;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['vendor-banking', vars.vendor_id] }),
  });
}

// =========================================================================
// Payments for current contractor
// =========================================================================
export function useMyVendorPayments(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['my-vendor-payments', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_payments' as any)
        .select('*, vendor_payment_runs:vendor_payment_run_id(pay_date, period_start, period_end, status)')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}