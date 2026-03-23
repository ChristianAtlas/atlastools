import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InternalNoteRow {
  id: string;
  record_type: string;
  record_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  jira_ref: string | null;
  created_at: string;
}

export function useInternalNotes(recordType: string, recordId: string | undefined) {
  return useQuery({
    queryKey: ['internal_notes', recordType, recordId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_notes')
        .select('*')
        .eq('record_type', recordType)
        .eq('record_id', recordId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as InternalNoteRow[];
    },
    enabled: !!recordId,
  });
}

export function useAddInternalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note: {
      record_type: string;
      record_id: string;
      author_id: string;
      author_name: string;
      author_role: string;
      content: string;
      jira_ref?: string;
    }) => {
      const { data, error } = await supabase
        .from('internal_notes')
        .insert(note as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['internal_notes', variables.record_type, variables.record_id] });
    },
  });
}
