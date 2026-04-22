import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type PunchType = 'clock_in' | 'clock_out' | 'meal_start' | 'meal_end' | 'break_start' | 'break_end';

export interface TKSettings {
  id: string;
  company_id: string;
  is_enabled: boolean;
  enabled_at: string | null;
  workweek_start_day: number;
  pay_period_type: string;
  require_geolocation: boolean;
  require_job_selection: boolean;
  allow_manual_entry: boolean;
  allow_self_correct_missed_punch: boolean;
  meal_break_minutes: number;
  rest_breaks_enabled: boolean;
  break_attestation_required: boolean;
  rounding_minutes: number;
  daily_ot_threshold: number;
  weekly_ot_threshold: number;
  require_manager_approval: boolean;
  multi_level_approval: boolean;
  late_threshold_minutes: number;
  no_show_threshold_minutes: number;
}

export interface TKPunch {
  id: string;
  company_id: string;
  employee_id: string;
  punch_type: PunchType;
  punched_at: string;
  source: string;
  job_code: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  notes: string | null;
  edited: boolean;
  voided: boolean;
}

export interface TKPeriod {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
}

export interface TKTimecard {
  id: string;
  company_id: string;
  employee_id: string;
  payroll_period_id: string;
  status: 'open' | 'submitted' | 'approved' | 'rejected' | 'locked';
  regular_hours: number;
  overtime_hours: number;
  doubletime_hours: number;
  pto_hours: number;
  holiday_hours: number;
  unpaid_hours: number;
  total_hours: number;
  exception_count: number;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  locked_at: string | null;
  notes: string | null;
  employees?: { first_name: string; last_name: string; email: string; title: string | null } | null;
  tk_payroll_periods?: { period_start: string; period_end: string; pay_date: string; status: string } | null;
}

/* ───────── Settings ───────── */
export function useTKSettings(companyId?: string) {
  return useQuery({
    queryKey: ['tk_settings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timekeeping_settings' as any)
        .select('*')
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as TKSettings | null;
    },
    enabled: !!companyId,
  });
}

export function useUpsertTKSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<TKSettings> & { company_id: string }) => {
      const payload: any = { ...input };
      if (input.is_enabled && !input.enabled_at) {
        payload.enabled_at = new Date().toISOString();
        payload.enabled_by = user?.id ?? null;
      }
      const { data, error } = await supabase
        .from('timekeeping_settings' as any)
        .upsert(payload, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tk_settings'] }),
  });
}

/* ───────── Pricing ───────── */
export function useTKPricing() {
  return useQuery({
    queryKey: ['tk_pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timekeeping_pricing' as any)
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; per_employee_cents: number; effective_date: string } | null;
    },
  });
}

export function useUpdateTKPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, per_employee_cents }: { id: string; per_employee_cents: number }) => {
      const { error } = await supabase
        .from('timekeeping_pricing' as any)
        .update({ per_employee_cents } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tk_pricing'] }),
  });
}

/* ───────── Periods ───────── */
export function useTKPeriods(companyId?: string) {
  return useQuery({
    queryKey: ['tk_periods', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tk_payroll_periods' as any)
        .select('*')
        .eq('company_id', companyId!)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TKPeriod[];
    },
    enabled: !!companyId,
  });
}

export function useCurrentTKPeriod(companyId?: string) {
  return useQuery({
    queryKey: ['tk_period_current', companyId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('tk_payroll_periods' as any)
        .select('*')
        .eq('company_id', companyId!)
        .lte('period_start', today)
        .gte('period_end', today)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as TKPeriod | null;
    },
    enabled: !!companyId,
  });
}

/* ───────── Punches ───────── */
export function useTodayPunches(employeeId?: string) {
  return useQuery({
    queryKey: ['tk_punches_today', employeeId],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('tk_punches' as any)
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('voided', false)
        .gte('punched_at', start.toISOString())
        .order('punched_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TKPunch[];
    },
    enabled: !!employeeId,
    refetchInterval: 30_000,
  });
}

export function useCreatePunch() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      company_id: string;
      employee_id: string;
      punch_type: PunchType;
      source?: string;
      job_code?: string | null;
      geo_lat?: number | null;
      geo_lng?: number | null;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('tk_punches' as any)
        .insert({ ...input, source: input.source ?? 'web', created_by: user?.id ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tk_punches_today'] });
      qc.invalidateQueries({ queryKey: ['tk_punches_recent'] });
    },
  });
}

/** Recent punches across the company (super admin / manager live view) */
export function useRecentCompanyPunches(companyId?: string, hours = 24) {
  return useQuery({
    queryKey: ['tk_punches_recent', companyId, hours],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('tk_punches' as any)
        .select('*, employees(first_name, last_name)')
        .eq('company_id', companyId!)
        .eq('voided', false)
        .gte('punched_at', since)
        .order('punched_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}

/* ───────── Timecards ───────── */
export function useCompanyTKTimecards(companyId?: string, filters?: { periodId?: string; status?: string }) {
  return useQuery({
    queryKey: ['tk_timecards', companyId, filters],
    queryFn: async () => {
      let q = supabase
        .from('tk_timecards' as any)
        .select('*, employees(first_name, last_name, email, title), tk_payroll_periods:payroll_period_id(period_start, period_end, pay_date, status)' as any)
        .eq('company_id', companyId!);
      if (filters?.periodId) q = q.eq('payroll_period_id', filters.periodId);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q.order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TKTimecard[];
    },
    enabled: !!companyId,
  });
}

/** Cross-company timecards (super admin) */
export function useAllTKTimecards(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['tk_timecards_all', filters],
    queryFn: async () => {
      let q = supabase
        .from('tk_timecards' as any)
        .select('*, employees(first_name, last_name, email), tk_payroll_periods:payroll_period_id(period_start, period_end, pay_date)' as any);
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      const { data, error } = await q.order('updated_at', { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as TKTimecard[];
    },
  });
}

export function useEmployeeCurrentTimecard(employeeId?: string, periodId?: string) {
  return useQuery({
    queryKey: ['tk_timecard_current', employeeId, periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tk_timecards' as any)
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('payroll_period_id', periodId!)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as TKTimecard | null;
    },
    enabled: !!employeeId && !!periodId,
  });
}

export function useUpsertTimecard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<TKTimecard> & { company_id: string; employee_id: string; payroll_period_id: string }) => {
      const { data, error } = await supabase
        .from('tk_timecards' as any)
        .upsert(input as any, { onConflict: 'employee_id,payroll_period_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tk_timecards'] });
      qc.invalidateQueries({ queryKey: ['tk_timecard_current'] });
      qc.invalidateQueries({ queryKey: ['tk_timecards_all'] });
    },
  });
}

export function useSubmitTimecard() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (timecardId: string) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tk_timecards' as any)
        .update({ status: 'submitted', submitted_at: now, submitted_by: user?.id ?? null } as any)
        .eq('id', timecardId);
      if (error) throw error;
      await supabase.from('tk_approval_records' as any).insert({
        timecard_id: timecardId, action: 'submitted',
        actor_id: user?.id ?? null, actor_name: profile?.full_name ?? null, actor_role: 'employee',
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tk_timecards'] });
      qc.invalidateQueries({ queryKey: ['tk_timecard_current'] });
    },
  });
}

export function useApproveTKTimecards() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tk_timecards' as any)
        .update({ status: 'approved', approved_at: now, approved_by: user?.id ?? null } as any)
        .in('id', ids);
      if (error) throw error;
      const records = ids.map(id => ({
        timecard_id: id, action: 'approved',
        actor_id: user?.id ?? null, actor_name: profile?.full_name ?? null, actor_role: 'manager',
      }));
      await supabase.from('tk_approval_records' as any).insert(records as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tk_timecards'] });
      qc.invalidateQueries({ queryKey: ['tk_timecards_all'] });
    },
  });
}

export function useRejectTKTimecard() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('tk_timecards' as any)
        .update({ status: 'rejected', rejected_at: now, rejected_by: user?.id ?? null, rejection_reason: reason } as any)
        .eq('id', id);
      if (error) throw error;
      await supabase.from('tk_approval_records' as any).insert({
        timecard_id: id, action: 'rejected',
        actor_id: user?.id ?? null, actor_name: profile?.full_name ?? null, actor_role: 'manager', reason,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tk_timecards'] });
      qc.invalidateQueries({ queryKey: ['tk_timecards_all'] });
    },
  });
}

/** Helper: derive current punch state from today's punches. */
export type ClockState = 'clocked_out' | 'clocked_in' | 'on_meal' | 'on_break';
export function deriveClockState(punches: TKPunch[]): ClockState {
  if (!punches.length) return 'clocked_out';
  const last = punches[punches.length - 1];
  switch (last.punch_type) {
    case 'clock_in':
    case 'meal_end':
    case 'break_end':
      return 'clocked_in';
    case 'meal_start': return 'on_meal';
    case 'break_start': return 'on_break';
    case 'clock_out': return 'clocked_out';
  }
}

/** Sum worked hours from today's punches (clock_in -> clock_out, minus meal/break time). */
export function sumTodayHours(punches: TKPunch[]): number {
  let workedMs = 0;
  let mealMs = 0;
  let breakMs = 0;
  let lastIn: number | null = null;
  let mealStart: number | null = null;
  let breakStart: number | null = null;
  for (const p of punches) {
    const t = new Date(p.punched_at).getTime();
    if (p.punch_type === 'clock_in') lastIn = t;
    else if (p.punch_type === 'clock_out' && lastIn != null) { workedMs += t - lastIn; lastIn = null; }
    else if (p.punch_type === 'meal_start') mealStart = t;
    else if (p.punch_type === 'meal_end' && mealStart != null) { mealMs += t - mealStart; mealStart = null; }
    else if (p.punch_type === 'break_start') breakStart = t;
    else if (p.punch_type === 'break_end' && breakStart != null) { breakMs += t - breakStart; breakStart = null; }
  }
  // open clock_in counts up to now
  if (lastIn != null) workedMs += Date.now() - lastIn;
  const total = Math.max(0, workedMs - mealMs - breakMs);
  return total / (1000 * 60 * 60);
}