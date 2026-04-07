import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Communication {
  id: string;
  audience_type: 'company' | 'employee';
  contact_type: string;
  selection_method: 'all' | 'segment' | 'upload';
  segment_id: string | null;
  segment_name: string | null;
  upload_summary: any;
  subject: string;
  body_html: string;
  from_name: string;
  reply_to: string | null;
  attachments: any;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled' | 'failed';
  recipient_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  timezone: string;
  lock_minutes: number;
  created_by: string | null;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRecipient {
  id: string;
  communication_id: string;
  entity_type: 'company' | 'employee';
  entity_id: string;
  entity_label: string;
  email: string;
  delivery_status: string;
  created_at: string;
}

export interface SavedSegment {
  id: string;
  name: string;
  description: string | null;
  target_type: 'company' | 'employee';
  category: string;
  filters: any;
  is_system: boolean;
  recipient_count_cache: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const COMM_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'border-muted-foreground text-muted-foreground' },
  { value: 'scheduled', label: 'Scheduled', color: 'border-amber-500 text-amber-600' },
  { value: 'sent', label: 'Sent', color: 'border-emerald-500 text-emerald-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'border-destructive text-destructive' },
  { value: 'failed', label: 'Failed', color: 'border-destructive text-destructive' },
];

export function useCommunications(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['communications', filters],
    queryFn: async () => {
      let q = supabase.from('communications').select('*').order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }
      if (filters?.search) {
        q = q.or(`subject.ilike.%${filters.search}%,creator_name.ilike.%${filters.search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Communication[];
    },
  });
}

export function useCommunicationById(id: string | undefined) {
  return useQuery({
    queryKey: ['communication', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('communications').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as unknown as Communication;
    },
  });
}

export function useCommunicationRecipients(commId: string | undefined) {
  return useQuery({
    queryKey: ['communication_recipients', commId],
    enabled: !!commId,
    queryFn: async () => {
      const { data, error } = await supabase.from('communication_recipients').select('*').eq('communication_id', commId!).order('entity_label');
      if (error) throw error;
      return (data ?? []) as unknown as CommunicationRecipient[];
    },
  });
}

export function useCreateCommunication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comm: Partial<Communication>) => {
      const { data, error } = await supabase.from('communications').insert(comm as any).select().single();
      if (error) throw error;
      return data as unknown as Communication;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communications'] }),
  });
}

export function useUpdateCommunication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Communication>) => {
      const { data, error } = await supabase.from('communications').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as Communication;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['communications'] });
      qc.invalidateQueries({ queryKey: ['communication', vars.id] });
    },
  });
}

export function useInsertRecipients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recipients: Omit<CommunicationRecipient, 'id' | 'created_at'>[]) => {
      const { error } = await supabase.from('communication_recipients').insert(recipients as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communication_recipients'] }),
  });
}

export function useSavedSegments(targetType?: 'company' | 'employee') {
  return useQuery({
    queryKey: ['saved_segments', targetType],
    queryFn: async () => {
      let q = supabase.from('saved_segments').select('*').order('category').order('name');
      if (targetType) q = q.eq('target_type', targetType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SavedSegment[];
    },
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seg: Partial<SavedSegment>) => {
      const { data, error } = await supabase.from('saved_segments').insert(seg as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_segments'] }),
  });
}
