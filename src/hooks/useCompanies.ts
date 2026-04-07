import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyRow {
  id: string;
  cid: string;
  name: string;
  legal_name: string | null;
  ein: string;
  status: 'active' | 'onboarding' | 'suspended' | 'terminated';
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  primary_contact_name: string;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  settings: Record<string, unknown>;
  employee_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

async function fetchCompanies(search?: string): Promise<CompanyRow[]> {
  let query = supabase
    .from('companies')
    .select('*')
    .is('deleted_at', null)
    .order('name');
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CompanyRow[];
}

async function fetchCompany(id: string): Promise<CompanyRow> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return data as unknown as CompanyRow;
}

export function useCompanies(search?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channelName = `companies-live-${search ?? 'all'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        qc.invalidateQueries({ queryKey: ['companies'] });
        qc.invalidateQueries({ queryKey: ['employees'] });
        qc.invalidateQueries({ queryKey: ['payroll_runs'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, search]);

  return useQuery({
    queryKey: ['companies', search],
    queryFn: () => fetchCompanies(search),
  });
}

export function useCompany(id: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`company-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ['companies', id] });
        qc.invalidateQueries({ queryKey: ['companies'] });
        qc.invalidateQueries({ queryKey: ['employees'] });
        qc.invalidateQueries({ queryKey: ['payroll_runs'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => fetchCompany(id!),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<CompanyRow>) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(body as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['payroll_runs'] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}
