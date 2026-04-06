import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EarningDeductionType {
  id: string;
  name: string;
  code: string;
  category: 'earning' | 'deduction';
  subcategory: string;
  is_default: boolean;
  is_active: boolean;
  taxable: boolean;
  company_id: string | null;
  sort_order: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  scope: string;
  pay_behavior: string | null;
  calculation_method: string | null;
  default_rate: number | null;
  default_multiplier: number | null;
  worker_type: string | null;
  pay_run_types: string[] | null;
  reporting_w2_box: string | null;
  reporting_1099_type: string | null;
  reporting_box_code: string | null;
  reporting_box14_literal: string | null;
  special_flags: string[] | null;
  tax_federal_income: boolean;
  tax_social_security: boolean;
  tax_medicare: boolean;
  tax_futa: boolean;
  tax_state_income: boolean;
  tax_state_unemployment: boolean;
  tax_local: boolean;
  deduction_side: string | null;
  tax_treatment: string | null;
  annual_limit_cents: number | null;
  catch_up_eligible: boolean;
  catch_up_limit_cents: number | null;
  stop_at_goal: boolean;
  goal_amount_cents: number | null;
  garnishment_settings: any | null;
  priority_order: number;
  availability: string | null;
  gl_code: string | null;
  archived_at: string | null;
  used_by_clients_count: number;
  category_id: string | null;
}

export interface EarningDeductionCategory {
  id: string;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ClientEDOverride {
  id: string;
  company_id: string;
  earning_deduction_type_id: string;
  is_enabled: boolean;
  display_label_override: string | null;
  gl_code_override: string | null;
  frequency_eligibility: string[] | null;
  worker_type_override: string | null;
  pay_run_types_override: string[] | null;
  notes: string | null;
}

export function useEDCategories() {
  return useQuery({
    queryKey: ['ed_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('earning_deduction_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data ?? []) as unknown as EarningDeductionCategory[];
    },
  });
}

export function useEDTypes(companyId?: string | null) {
  return useQuery({
    queryKey: ['ed_types', companyId ?? 'enterprise'],
    queryFn: async () => {
      let query = supabase
        .from('earning_deduction_types')
        .select('*')
        .is('archived_at', null)
        .order('sort_order');

      if (companyId) {
        query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as EarningDeductionType[];
    },
  });
}

export function useClientEDOverrides(companyId: string | null) {
  return useQuery({
    queryKey: ['client_ed_overrides', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_earning_deduction_overrides')
        .select('*')
        .eq('company_id', companyId!);
      if (error) throw error;
      return (data ?? []) as unknown as ClientEDOverride[];
    },
  });
}

export function useCreateEDType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EarningDeductionType>) => {
      const { data, error } = await supabase
        .from('earning_deduction_types')
        .insert(body as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ed_types'] });
      toast.success('Type created successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEDType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EarningDeductionType> & { id: string }) => {
      const { error } = await supabase
        .from('earning_deduction_types')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ed_types'] });
      toast.success('Type updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useArchiveEDType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('earning_deduction_types')
        .update({ archived_at: new Date().toISOString(), is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ed_types'] });
      toast.success('Type archived');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useBulkUpdateEDTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<EarningDeductionType> }) => {
      const { error } = await supabase
        .from('earning_deduction_types')
        .update(updates as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ed_types'] });
      toast.success('Bulk update complete');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertClientEDOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<ClientEDOverride> & { company_id: string; earning_deduction_type_id: string }) => {
      const { error } = await supabase
        .from('client_earning_deduction_overrides')
        .upsert(body as any, { onConflict: 'company_id,earning_deduction_type_id' });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client_ed_overrides', vars.company_id] });
      toast.success('Override saved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteClientEDOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('client_earning_deduction_overrides')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return companyId;
    },
    onSuccess: (companyId) => {
      qc.invalidateQueries({ queryKey: ['client_ed_overrides', companyId] });
      toast.success('Override removed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Constants
export const CALCULATION_METHODS = [
  { value: 'flat', label: 'Flat Amount' },
  { value: 'hours_x_rate', label: 'Hours × Rate' },
  { value: 'multiplier_x_rate', label: 'Multiplier × Rate' },
  { value: 'percent', label: 'Percentage' },
  { value: 'employer_contribution', label: 'Employer Contribution' },
  { value: 'employer_match', label: 'Employer Match' },
  { value: 'employer_flat', label: 'Employer Flat Amount' },
  { value: 'cents_per_hour', label: 'Cents per Hour' },
  { value: 'goal', label: 'Goal Amount' },
  { value: 'disposable_earnings', label: 'Disposable Earnings Formula' },
  { value: 'reporting_only', label: 'Informational / Reporting Only' },
];

export const PAY_BEHAVIORS = [
  { value: 'paid', label: 'Paid to Employee' },
  { value: 'reported_only', label: 'Reported Only' },
  { value: 'memo', label: 'Memo / Non-Payable' },
];

export const WORKER_TYPES = [
  { value: 'both', label: 'W-2 & 1099' },
  { value: 'w2', label: 'W-2 Only' },
  { value: '1099', label: '1099 Only' },
];

export const DEDUCTION_SIDES = [
  { value: 'employee', label: 'Employee Deduction' },
  { value: 'employer', label: 'Employer Contribution' },
  { value: 'employer_memo', label: 'Employer Memo / Tracking Only' },
];

export const TAX_TREATMENTS = [
  { value: 'pre_tax', label: 'Pre-Tax' },
  { value: 'post_tax', label: 'Post-Tax' },
  { value: 'garnishment', label: 'Garnishment' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'informational', label: 'Informational Only' },
];

export const SCOPES = [
  { value: 'enterprise_standard', label: 'Enterprise Standard' },
  { value: 'enterprise_custom', label: 'Enterprise Custom' },
  { value: 'client_custom', label: 'Client Custom' },
];

export const AVAILABILITY_OPTIONS = [
  { value: 'all_clients', label: 'All Clients' },
  { value: 'selected_clients', label: 'Selected Clients Only' },
  { value: 'hidden', label: 'Hidden from Client Admins' },
];
