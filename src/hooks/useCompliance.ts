import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ComplianceItem {
  id: string;
  entity_type: 'enterprise' | 'client' | 'employee';
  entity_id: string;
  company_id: string | null;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  state_code: string | null;
  risk_level: string;
  compliance_score: number;
  is_recurring: boolean;
  recurrence_interval: string | null;
  next_recurrence_date: string | null;
  parent_item_id: string | null;
  blocker: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceLicense {
  id: string;
  entity_type: 'enterprise' | 'client';
  entity_id: string;
  company_id: string | null;
  license_type: string;
  state_code: string | null;
  license_number: string | null;
  account_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  status: string;
  renewal_date: string | null;
  renewal_status: string | null;
  owner_id: string | null;
  owner_name: string | null;
  filing_frequency: string | null;
  sui_rate: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceAlert {
  id: string;
  entity_type: string;
  entity_id: string;
  company_id: string | null;
  compliance_item_id: string | null;
  compliance_license_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  acknowledged_at: string | null;
  resolved_at: string | null;
  escalated: boolean;
  due_date: string | null;
  created_at: string;
}

export function useComplianceItems(entityType?: string, companyId?: string) {
  return useQuery({
    queryKey: ['compliance-items', entityType, companyId],
    queryFn: async () => {
      let query = supabase.from('compliance_items').select('*').order('due_date', { ascending: true, nullsFirst: false });
      if (entityType) query = query.eq('entity_type', entityType);
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ComplianceItem[];
    },
  });
}

export function useComplianceLicenses(entityType?: string) {
  return useQuery({
    queryKey: ['compliance-licenses', entityType],
    queryFn: async () => {
      let query = supabase.from('compliance_licenses').select('*').order('expiration_date', { ascending: true, nullsFirst: false });
      if (entityType) query = query.eq('entity_type', entityType);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ComplianceLicense[];
    },
  });
}

export function useComplianceAlerts() {
  return useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ComplianceAlert[];
    },
  });
}

export function useCreateComplianceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<ComplianceItem>) => {
      const { data, error } = await supabase.from('compliance_items').insert(item as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      toast.success('Compliance item created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateComplianceItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComplianceItem> & { id: string }) => {
      const { data, error } = await supabase.from('compliance_items').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-items'] });
      toast.success('Compliance item updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateComplianceLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (license: Partial<ComplianceLicense>) => {
      const { data, error } = await supabase.from('compliance_licenses').insert(license as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-licenses'] });
      toast.success('License added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateComplianceLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComplianceLicense> & { id: string }) => {
      const { data, error } = await supabase.from('compliance_licenses').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-licenses'] });
      toast.success('License updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateComplianceAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alert: Partial<ComplianceAlert>) => {
      const { data, error } = await supabase.from('compliance_alerts').insert(alert as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-alerts'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase.from('compliance_alerts').update({
        is_read: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id,
      } as any).eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-alerts'] }),
  });
}

// Compute compliance score for a company
export function computeComplianceScore(items: ComplianceItem[]): number {
  if (items.length === 0) return 100;
  const compliant = items.filter(i => i.status === 'compliant' || i.status === 'waived').length;
  return Math.round((compliant / items.length) * 100);
}
