import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useOnboardingSessions(companyId?: string) {
  return useQuery({
    queryKey: ['onboarding-sessions', companyId],
    queryFn: async () => {
      let query = supabase
        .from('onboarding_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useOnboardingTasks(sessionId: string) {
  return useQuery({
    queryKey: ['onboarding-tasks', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

export function useOnboardingTemplates() {
  return useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .select('*, onboarding_template_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOnboardingSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ employeeId, companyId, templateId, dueDate }: {
      employeeId: string;
      companyId: string;
      templateId: string;
      dueDate?: string;
    }) => {
      // Create the session
      const { data: session, error: sessionError } = await supabase
        .from('onboarding_sessions')
        .insert({
          employee_id: employeeId,
          company_id: companyId,
          template_id: templateId,
          status: 'not_started',
          due_date: dueDate || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Get template items and create tasks
      const { data: items, error: itemsError } = await supabase
        .from('onboarding_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const tasks = items.map(item => ({
          session_id: session.id,
          template_item_id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          assigned_role: item.assigned_role,
          sort_order: item.sort_order,
          is_required: item.is_required,
          status: 'pending',
        }));

        const { error: tasksError } = await supabase
          .from('onboarding_tasks')
          .insert(tasks);

        if (tasksError) throw tasksError;
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-sessions'] });
      toast({ title: 'Onboarding started', description: 'Checklist tasks have been created.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateOnboardingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }: {
      taskId: string;
      updates: { status?: string; completed_at?: string | null; completed_by?: string | null; notes?: string };
    }) => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-sessions'] });
    },
  });
}

export function useUpdateOnboardingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, updates }: {
      sessionId: string;
      updates: { status?: string; started_at?: string | null; completed_at?: string | null; notes?: string };
    }) => {
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-sessions'] });
    },
  });
}
