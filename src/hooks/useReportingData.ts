import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useReportPayrollRuns() {
  return useQuery({
    queryKey: ['report_payroll_runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*, companies(name)')
        .is('deleted_at', null)
        .order('pay_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportEmployees() {
  return useQuery({
    queryKey: ['report_employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*, companies(name)')
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportInvoices() {
  return useQuery({
    queryKey: ['report_invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportComplianceItems() {
  return useQuery({
    queryKey: ['report_compliance_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportNsfEvents() {
  return useQuery({
    queryKey: ['report_nsf_events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nsf_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportPayrollRunEmployees() {
  return useQuery({
    queryKey: ['report_payroll_run_employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_run_employees')
        .select('*, employees(first_name, last_name, pay_type, state, department, title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportComplianceLicenses() {
  return useQuery({
    queryKey: ['report_compliance_licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_licenses')
        .select('*')
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export const fmt = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100);

export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
