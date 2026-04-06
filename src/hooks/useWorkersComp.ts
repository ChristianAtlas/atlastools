import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──

export interface WCPolicy {
  id: string;
  company_id: string;
  carrier_name: string;
  policy_number: string;
  effective_date: string;
  expiration_date: string;
  states_covered: string[];
  experience_mod: number;
  is_monopolistic: boolean;
  minimum_premium_cents: number;
  markup_type: string;
  markup_rate: number;
  markup_flat_cents: number;
  status: string;
  notes: string | null;
  state_fund_account: string | null;
  reporting_frequency: string | null;
  last_report_submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  company_name?: string;
  code_count?: number;
  assignment_count?: number;
}

export interface WCCode {
  id: string;
  policy_id: string;
  company_id: string;
  code: string;
  description: string;
  state: string;
  rate_per_hundred: number;
  effective_date: string;
  expiration_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WCAssignment {
  id: string;
  employee_id: string;
  company_id: string;
  wc_code_id: string;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joined
  employee_name?: string;
  employee_title?: string;
  wc_code?: string;
  wc_description?: string;
  wc_state?: string;
}

export interface WCPayrollCalc {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  company_id: string;
  wc_code_id: string;
  wc_code: string;
  wages_cents: number;
  rate_per_hundred: number;
  premium_cents: number;
  markup_rate: number;
  markup_cents: number;
  total_charge_cents: number;
  created_at: string;
}

export interface WCInvoiceItem {
  id: string;
  payroll_run_id: string;
  company_id: string;
  invoice_id: string | null;
  base_premium_cents: number;
  markup_cents: number;
  total_charge_cents: number;
  employee_count: number;
  created_at: string;
}

// ── Policies ──

export function useWCPolicies(companyId?: string) {
  return useQuery({
    queryKey: ['wc_policies', companyId],
    queryFn: async () => {
      let q = supabase.from('workers_comp_policies').select('*').order('created_at', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WCPolicy[];
    },
  });
}

export function useWCPolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['wc_policies', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('workers_comp_policies').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as unknown as WCPolicy;
    },
    enabled: !!id,
  });
}

export function useCreateWCPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (policy: Partial<WCPolicy>) => {
      const { data, error } = await supabase.from('workers_comp_policies').insert(policy as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc_policies'] }),
  });
}

export function useUpdateWCPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase.from('workers_comp_policies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc_policies'] }),
  });
}

// ── Codes ──

export function useWCCodes(policyId?: string, companyId?: string) {
  return useQuery({
    queryKey: ['wc_codes', policyId, companyId],
    queryFn: async () => {
      let q = supabase.from('workers_comp_codes').select('*').order('code');
      if (policyId) q = q.eq('policy_id', policyId);
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WCCode[];
    },
  });
}

export function useCreateWCCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: Partial<WCCode>) => {
      const { data, error } = await supabase.from('workers_comp_codes').insert(code as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc_codes'] }),
  });
}

export function useUpdateWCCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase.from('workers_comp_codes').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc_codes'] }),
  });
}

// ── Assignments ──

export function useWCAssignments(companyId?: string) {
  return useQuery({
    queryKey: ['wc_assignments', companyId],
    queryFn: async () => {
      let q = supabase.from('employee_wc_assignments').select('*').order('created_at', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WCAssignment[];
    },
  });
}

export function useCreateWCAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: Partial<WCAssignment>) => {
      const { data, error } = await supabase.from('employee_wc_assignments').insert(assignment as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc_assignments'] }),
  });
}

export function useUpdateWCAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase.from('employee_wc_assignments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc_assignments'] }),
  });
}

// ── Payroll Calculations ──

export function useWCPayrollCalcs(payrollRunId?: string, companyId?: string) {
  return useQuery({
    queryKey: ['wc_payroll_calcs', payrollRunId, companyId],
    queryFn: async () => {
      let q = supabase.from('wc_payroll_calculations').select('*').order('created_at', { ascending: false });
      if (payrollRunId) q = q.eq('payroll_run_id', payrollRunId);
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WCPayrollCalc[];
    },
  });
}

// ── Invoice Items ──

export function useWCInvoiceItems(companyId?: string) {
  return useQuery({
    queryKey: ['wc_invoice_items', companyId],
    queryFn: async () => {
      let q = supabase.from('wc_invoice_items').select('*').order('created_at', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WCInvoiceItem[];
    },
  });
}

// ── Dashboard Stats ──

export function useWCDashboardStats() {
  return useQuery({
    queryKey: ['wc_dashboard_stats'],
    queryFn: async () => {
      const [policiesRes, codesRes, assignmentsRes, employeesRes] = await Promise.all([
        supabase.from('workers_comp_policies').select('id, status, is_monopolistic, expiration_date, company_id'),
        supabase.from('workers_comp_codes').select('id, is_active'),
        supabase.from('employee_wc_assignments').select('id, employee_id, is_active'),
        supabase.from('employees').select('id, company_id').eq('status', 'active').is('deleted_at', null),
      ]);

      const policies = policiesRes.data ?? [];
      const assignments = assignmentsRes.data ?? [];
      const employees = employeesRes.data ?? [];

      const activePolicies = policies.filter(p => p.status === 'active').length;
      const assignedEmployeeIds = new Set(assignments.filter(a => a.is_active).map(a => a.employee_id));
      const assignedCount = assignedEmployeeIds.size;

      // Find employees in companies with WC policies but not assigned
      const companyIdsWithPolicies = new Set(policies.filter(p => p.status === 'active').map(p => p.company_id));
      const employeesNeedingWC = employees.filter(e => companyIdsWithPolicies.has(e.company_id) && !assignedEmployeeIds.has(e.id));
      const missingAssignments = employeesNeedingWC.length;

      const monopolisticCount = policies.filter(p => p.is_monopolistic && p.status === 'active').length;

      const now = new Date();
      const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const expiringSoon = policies.filter(p => {
        if (p.status !== 'active') return false;
        const exp = new Date(p.expiration_date);
        return exp <= in60Days && exp >= now;
      }).length;

      return {
        activePolicies,
        assignedCount,
        missingAssignments,
        monopolisticCount,
        expiringSoon,
      };
    },
  });
}

export function centsToUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100);
}
