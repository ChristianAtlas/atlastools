import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceRow {
  id: string;
  company_id: string;
  company_name: string;
  invoice_number: string;
  invoice_type: string;
  payroll_run_id: string | null;
  period_start: string;
  period_end: string;
  subtotal_cents: number;
  markup_cents: number;
  total_cents: number;
  balance_due_cents: number;
  paid_amount_cents: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  sent_at: string | null;
  delivery_status: string;
  employee_count: number;
  catch_up_count: number;
  catch_up_cents: number;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItemRow {
  id: string;
  invoice_id: string;
  description: string;
  tier_slug: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  is_markup: boolean;
  markup_type: string | null;
  markup_rate: number | null;
}

export interface PaymentAttemptRow {
  id: string;
  invoice_id: string;
  company_id: string;
  method: string;
  amount_cents: number;
  attempt_date: string;
  status: string;
  processor_response_code: string | null;
  processor_response_message: string | null;
  notes: string | null;
}

export interface NsfEventRow {
  id: string;
  company_id: string;
  invoice_id: string | null;
  amount_cents: number;
  fee_cents: number;
  status: string;
  notes: string | null;
  failure_code: string | null;
  failure_type: string | null;
  retry_eligible: boolean;
  retry_count: number;
  owner_name: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface BillingProfileRow {
  id: string;
  company_id: string;
  legal_billing_name: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  default_payment_method: string;
  sui_billing_method: string;
  workers_comp_markup_rate: number;
  sui_markup_rate: number;
  monthly_service_charge_cents: number;
  collections_status: string;
  nsf_risk_status: string;
  current_ar_balance_cents: number;
  past_due_balance_cents: number;
  account_hold: boolean;
}

export function useInvoices(companyId?: string) {
  return useQuery({
    queryKey: ['invoices', companyId],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceRow[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as InvoiceRow;
    },
    enabled: !!id,
  });
}

export function useInvoiceLineItems(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice_line_items', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId!);
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceLineItemRow[];
    },
    enabled: !!invoiceId,
  });
}

export function usePaymentAttempts(invoiceId?: string) {
  return useQuery({
    queryKey: ['payment_attempts', invoiceId],
    queryFn: async () => {
      let query = supabase.from('payment_attempts').select('*').order('attempt_date', { ascending: false });
      if (invoiceId) query = query.eq('invoice_id', invoiceId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as PaymentAttemptRow[];
    },
  });
}

export function useNsfEvents(companyId?: string) {
  return useQuery({
    queryKey: ['nsf_events', companyId],
    queryFn: async () => {
      let query = supabase.from('nsf_events').select('*').order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as NsfEventRow[];
    },
  });
}

export function useBillingProfiles() {
  return useQuery({
    queryKey: ['billing_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('billing_profiles').select('*');
      if (error) throw error;
      return (data ?? []) as unknown as BillingProfileRow[];
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, ...extras }: { id: string; status: string } & Record<string, unknown>) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
        // Get invoice to set paid_amount_cents
        const { data: inv } = await supabase.from('invoices').select('total_cents').eq('id', id).single();
        if (inv) {
          updates.paid_amount_cents = inv.total_cents;
          updates.balance_due_cents = 0;
        }
      }
      Object.assign(updates, extras);
      const { data, error } = await supabase.from('invoices').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useGenerateMonthlyInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { billing_month?: string; company_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-monthly-invoices', { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useGeneratePayrollInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { payroll_run_id: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-payroll-invoice', { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useCreateNsfCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      company_id: string;
      invoice_id: string;
      amount_cents: number;
      failure_type?: string;
      failure_code?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('nsf_events')
        .insert({
          company_id: params.company_id,
          invoice_id: params.invoice_id,
          amount_cents: params.amount_cents,
          failure_type: params.failure_type || 'nsf',
          failure_code: params.failure_code,
          notes: params.notes,
          status: 'open',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nsf_events'] }),
  });
}

export function useUpdateNsfCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase.from('nsf_events').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nsf_events'] }),
  });
}

export function centsToUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}
