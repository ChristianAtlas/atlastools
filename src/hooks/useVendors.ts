import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VendorWorkerType = '1099_ic' | 'c2c_vendor';
export type VendorStatus = 'active' | 'inactive' | 'terminated' | 'pending';
export type VendorOnboardingStatus = 'not_started' | 'in_progress' | 'pending_w9' | 'complete';
export type VendorW9Status = 'not_collected' | 'pending_review' | 'on_file' | 'expired';
export type Vendor1099Category =
  | 'nec'
  | 'misc_rent'
  | 'misc_royalties'
  | 'misc_other_income'
  | 'misc_legal'
  | 'misc_prizes'
  | 'misc_medical'
  | 'misc_other';

export interface VendorRow {
  id: string;
  vid: string;
  company_id: string;
  worker_type: VendorWorkerType;
  is_c2c: boolean;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  business_name: string | null;
  contact_name: string | null;
  legal_name: string;
  tax_id_last4: string | null;
  tax_id_type: 'ssn' | 'ein' | 'itin' | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  status: VendorStatus;
  onboarding_status: VendorOnboardingStatus;
  w9_status: VendorW9Status;
  w9_collected_at: string | null;
  w9_expires_at: string | null;
  portal_access_enabled: boolean;
  backup_withholding_enabled: boolean;
  backup_withholding_rate: number | null;
  default_1099_category: Vendor1099Category;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  companies?: { name: string; cid: string } | null;
}

export interface VendorPriorYtdRow {
  id: string;
  vendor_id: string;
  company_id: string;
  reporting_year: number;
  category: Vendor1099Category;
  amount_cents: number;
  backup_withholding_cents: number;
  source_description: string | null;
  notes: string | null;
  entered_by_name: string | null;
  created_at: string;
}

export function useVendors(filters?: { companyId?: string; workerType?: VendorWorkerType; status?: VendorStatus }) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      let q = supabase
        .from('vendors' as any)
        .select('*, companies:company_id(name, cid)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (filters?.companyId) q = q.eq('company_id', filters.companyId);
      if (filters?.workerType) q = q.eq('worker_type', filters.workerType);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VendorRow[];
    },
  });
}

export function useVendor(id: string | undefined) {
  return useQuery({
    queryKey: ['vendor', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .select('*, companies:company_id(name, cid)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as VendorRow | null;
    },
  });
}

export function useVendorPriorYtd(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-prior-ytd', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_ytd_prior_earnings' as any)
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('reporting_year', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VendorPriorYtdRow[];
    },
  });
}

export interface CreateVendorInput {
  company_id: string;
  worker_type: VendorWorkerType;
  is_c2c: boolean;
  legal_name: string;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  business_name?: string | null;
  contact_name?: string | null;
  tax_id_type?: 'ssn' | 'ein' | 'itin' | null;
  tax_id_last4?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  default_1099_category?: Vendor1099Category;
  backup_withholding_enabled?: boolean;
  notes?: string | null;
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorInput) => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VendorRow> }) => {
      const { data, error } = await supabase
        .from('vendors' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VendorRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendor', vars.id] });
    },
  });
}

export function useAddPriorYtd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      vendor_id: string;
      company_id: string;
      reporting_year: number;
      category: Vendor1099Category;
      amount_cents: number;
      backup_withholding_cents?: number;
      source_description?: string | null;
      notes?: string | null;
      entered_by_name?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('vendor_ytd_prior_earnings' as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['vendor-prior-ytd', vars.vendor_id] }),
  });
}

export const VENDOR_1099_CATEGORIES: { value: Vendor1099Category; label: string; form: 'NEC' | 'MISC' }[] = [
  { value: 'nec', label: 'Nonemployee Compensation (services)', form: 'NEC' },
  { value: 'misc_rent', label: 'Rents', form: 'MISC' },
  { value: 'misc_royalties', label: 'Royalties', form: 'MISC' },
  { value: 'misc_other_income', label: 'Other Income', form: 'MISC' },
  { value: 'misc_legal', label: 'Gross proceeds to attorney', form: 'MISC' },
  { value: 'misc_prizes', label: 'Prizes & Awards', form: 'MISC' },
  { value: 'misc_medical', label: 'Medical & health care', form: 'MISC' },
  { value: 'misc_other', label: 'Other (MISC)', form: 'MISC' },
];