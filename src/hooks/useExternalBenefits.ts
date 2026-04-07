import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExternalBenefitRow {
  id: string;
  employee_id: string;
  company_id: string;
  carrier_name: string;
  plan_type: string;
  ee_deduction_cents: number;
  er_contribution_cents: number;
  er_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useExternalBenefits(companyId?: string | null) {
  return useQuery({
    queryKey: ['external_benefit_deductions', companyId],
    queryFn: async () => {
      let query = supabase
        .from('external_benefit_deductions')
        .select('*')
        .eq('is_active', true);
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ExternalBenefitRow[];
    },
    enabled: !!companyId,
  });
}

export function useUpsertExternalBenefit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      id?: string;
      employee_id: string;
      company_id: string;
      carrier_name: string;
      plan_type: string;
      ee_deduction_cents: number;
      er_contribution_cents: number;
      er_verified: boolean;
    }) => {
      if (row.id) {
        const { data, error } = await supabase
          .from('external_benefit_deductions')
          .update({
            carrier_name: row.carrier_name,
            plan_type: row.plan_type,
            ee_deduction_cents: row.ee_deduction_cents,
            er_contribution_cents: row.er_contribution_cents,
            er_verified: row.er_verified,
          })
          .eq('id', row.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('external_benefit_deductions')
          .insert({
            employee_id: row.employee_id,
            company_id: row.company_id,
            carrier_name: row.carrier_name,
            plan_type: row.plan_type,
            ee_deduction_cents: row.ee_deduction_cents,
            er_contribution_cents: row.er_contribution_cents,
            er_verified: row.er_verified,
            is_active: true,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external_benefit_deductions'] });
    },
  });
}

export function useSaveAllExternalBenefits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Array<{
      id?: string;
      employee_id: string;
      company_id: string;
      carrier_name: string;
      plan_type: string;
      ee_deduction_cents: number;
      er_contribution_cents: number;
      er_verified: boolean;
    }>) => {
      // Process each row: update existing or insert new
      const results = [];
      for (const row of rows) {
        if (row.ee_deduction_cents === 0 && row.er_contribution_cents === 0 && !row.carrier_name && !row.plan_type) {
          // Skip empty rows
          continue;
        }
        if (row.id) {
          const { data, error } = await supabase
            .from('external_benefit_deductions')
            .update({
              carrier_name: row.carrier_name,
              plan_type: row.plan_type,
              ee_deduction_cents: row.ee_deduction_cents,
              er_contribution_cents: row.er_contribution_cents,
              er_verified: row.er_verified,
            })
            .eq('id', row.id)
            .select()
            .single();
          if (error) throw error;
          results.push(data);
        } else {
          const { data, error } = await supabase
            .from('external_benefit_deductions')
            .insert({
              employee_id: row.employee_id,
              company_id: row.company_id,
              carrier_name: row.carrier_name,
              plan_type: row.plan_type,
              ee_deduction_cents: row.ee_deduction_cents,
              er_contribution_cents: row.er_contribution_cents,
              er_verified: row.er_verified,
              is_active: true,
            })
            .select()
            .single();
          if (error) throw error;
          results.push(data);
        }
      }
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external_benefit_deductions'] });
    },
  });
}
