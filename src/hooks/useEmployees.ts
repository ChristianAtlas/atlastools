import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EmployeeStatus = 'active' | 'onboarding' | 'on_leave' | 'terminated' | 'suspended';
export type PayType = 'salary' | 'hourly';

export interface EmployeeRow {
  id: string;
  mid: string;
  company_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  personal_email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: EmployeeStatus;
  title: string | null;
  department: string | null;
  manager_id: string | null;
  start_date: string;
  termination_date: string | null;
  pay_type: PayType;
  annual_salary_cents: number | null;
  hourly_rate_cents: number | null;
  pay_frequency: string;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  provider_employee_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined
  companies?: { name: string } | null;
}

export interface EmploymentRecordRow {
  id: string;
  employee_id: string;
  company_id: string;
  effective_date: string;
  end_date: string | null;
  action: string;
  title: string;
  department: string | null;
  status: EmployeeStatus;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface CompensationRecordRow {
  id: string;
  employee_id: string;
  company_id: string;
  effective_date: string;
  end_date: string | null;
  reason: string;
  pay_type: PayType;
  annual_salary_cents: number | null;
  hourly_rate_cents: number | null;
  pay_frequency: string;
  change_amount_cents: number | null;
  change_percentage: number | null;
  notes: string | null;
  created_at: string;
}

export function useEmployees(companyId?: string, search?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`employees-${companyId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        qc.invalidateQueries({ queryKey: ['employees'] });
        qc.invalidateQueries({ queryKey: ['companies'] });
        qc.invalidateQueries({ queryKey: ['payroll_runs'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return useQuery({
    queryKey: ['employees', companyId, search],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select('*, companies(name)')
        .is('deleted_at', null)
        .order('last_name');
      if (companyId) query = query.eq('company_id', companyId);
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeRow[];
    },
  });
}

export function useEmployee(id: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`employee-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ['employees', id] });
        qc.invalidateQueries({ queryKey: ['employees'] });
        qc.invalidateQueries({ queryKey: ['companies'] });
        qc.invalidateQueries({ queryKey: ['payroll_runs'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return useQuery({
    queryKey: ['employees', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*, companies(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as EmployeeRow;
    },
    enabled: !!id,
  });
}

export function useEmploymentRecords(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employment_records', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employment_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmploymentRecordRow[];
    },
    enabled: !!employeeId,
  });
}

export function useCompensationRecords(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['compensation_records', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compensation_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CompensationRecordRow[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EmployeeRow>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert(body as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['payroll_runs'] });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['payroll_runs'] });
    },
  });
}

/** Format cents to USD */
export function empCentsToUSD(cents: number | null, payType?: PayType): string {
  if (cents == null) return '—';
  if (payType === 'hourly') {
    return `$${(cents / 100).toFixed(2)}/hr`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

/** Generate avatar initials */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
