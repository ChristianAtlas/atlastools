import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────
export type PTOType = 'vacation' | 'sick' | 'personal' | 'bereavement' | 'jury_duty' | 'holiday';
export type PTORequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'taken';
export type PTOLedgerType = 'accrual' | 'used' | 'adjustment' | 'carryover' | 'forfeited' | 'payout';

export interface PTOPolicy {
  id: string;
  company_id: string;
  pto_type: PTOType;
  name: string;
  accrual_rate: number;
  accrual_frequency: string;
  max_accrual_hours: number;
  max_carryover_hours: number;
  waiting_period_days: number;
  is_active: boolean;
}

export interface PTOBalanceEntry {
  id: string;
  employee_id: string;
  company_id: string;
  policy_id: string;
  entry_type: PTOLedgerType;
  hours: number;
  balance_after: number;
  effective_date: string;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface PTORequest {
  id: string;
  employee_id: string;
  company_id: string;
  policy_id: string;
  status: PTORequestStatus;
  start_date: string;
  end_date: string;
  hours: number;
  reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  // Joined
  employees?: { first_name: string; last_name: string; companies: { name: string } | null } | null;
  pto_policies?: { name: string; pto_type: PTOType } | null;
}

// ── Computed balance per policy for an employee ────────────
export interface PTOBalance {
  policy: PTOPolicy;
  accrued: number;
  used: number;
  pending: number;
  available: number;
}

// ── Hooks ──────────────────────────────────────────────────

export function usePTOPolicies(companyId?: string) {
  return useQuery({
    queryKey: ['pto_policies', companyId],
    queryFn: async () => {
      let q = supabase.from('pto_policies').select('*').eq('is_active', true).order('pto_type');
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PTOPolicy[];
    },
  });
}

export function usePTOBalances(employeeId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: ['pto_balances', employeeId, companyId],
    queryFn: async () => {
      // Get policies for the company
      const { data: policies, error: pErr } = await supabase
        .from('pto_policies')
        .select('*')
        .eq('company_id', companyId!)
        .eq('is_active', true);
      if (pErr) throw pErr;

      // Get latest ledger entry per policy (balance_after = current balance)
      const { data: ledger, error: lErr } = await supabase
        .from('pto_balance_ledger')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false });
      if (lErr) throw lErr;

      // Get pending requests
      const { data: pending, error: rErr } = await supabase
        .from('pto_requests')
        .select('policy_id, hours')
        .eq('employee_id', employeeId!)
        .in('status', ['pending', 'approved']);
      if (rErr) throw rErr;

      const typedPolicies = (policies ?? []) as unknown as PTOPolicy[];
      const typedLedger = (ledger ?? []) as unknown as PTOBalanceEntry[];
      const typedPending = (pending ?? []) as unknown as { policy_id: string; hours: number }[];

      const balances: PTOBalance[] = typedPolicies.map(policy => {
        // Find latest entry for this policy
        const latestEntry = typedLedger.find(e => e.policy_id === policy.id);
        const currentBalance = latestEntry ? Number(latestEntry.balance_after) : 0;

        // Sum accruals and usage from ledger
        const policyEntries = typedLedger.filter(e => e.policy_id === policy.id);
        const accrued = policyEntries
          .filter(e => e.entry_type === 'accrual' || e.entry_type === 'carryover')
          .reduce((sum, e) => sum + Number(e.hours), 0);
        const used = Math.abs(
          policyEntries
            .filter(e => e.entry_type === 'used')
            .reduce((sum, e) => sum + Number(e.hours), 0)
        );

        // Pending hours for this policy
        const pendingHours = typedPending
          .filter(r => r.policy_id === policy.id)
          .reduce((sum, r) => sum + Number(r.hours), 0);

        return {
          policy,
          accrued,
          used,
          pending: pendingHours,
          available: currentBalance - pendingHours,
        };
      });

      return balances;
    },
    enabled: !!employeeId && !!companyId,
  });
}

export function usePTORequests(opts: { employeeId?: string; companyId?: string; status?: PTORequestStatus } = {}) {
  const { employeeId, companyId, status } = opts;
  return useQuery({
    queryKey: ['pto_requests', employeeId, companyId, status],
    queryFn: async () => {
      let q = supabase
        .from('pto_requests')
        .select('*, employees(first_name, last_name, companies(name)), pto_policies(name, pto_type)')
        .order('start_date', { ascending: false });
      if (employeeId) q = q.eq('employee_id', employeeId);
      if (companyId) q = q.eq('company_id', companyId);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PTORequest[];
    },
  });
}

export function usePTOLedger(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['pto_ledger', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pto_balance_ledger')
        .select('*, pto_policies(name, pto_type)')
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as (PTOBalanceEntry & { pto_policies: { name: string; pto_type: PTOType } })[];
    },
    enabled: !!employeeId,
  });
}

export function useUpdatePTORequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: PTORequestStatus; reviewed_by?: string; reviewed_at?: string; review_notes?: string }) => {
      const { data, error } = await supabase
        .from('pto_requests')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pto_requests'] });
      qc.invalidateQueries({ queryKey: ['pto_balances'] });
    },
  });
}

/** Convert hours to days (8h = 1 day) */
export function hoursToDays(hours: number): string {
  const days = hours / 8;
  if (days === Math.floor(days)) return `${days}`;
  return days.toFixed(1);
}
