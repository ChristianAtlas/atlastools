import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmployeeInvitation {
  id: string;
  employee_id: string;
  company_id: string;
  email: string;
  full_name: string;
  status: string;
  invited_at: string | null;
  activated_at: string | null;
  invited_by: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmployeeInvitations(companyId: string) {
  return useQuery({
    queryKey: ['employee-invitations', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_invitations')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name');
      if (error) throw error;
      return data as unknown as EmployeeInvitation[];
    },
    enabled: !!companyId,
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ invitationId }: { invitationId: string }) => {
      // Get invitation details
      const { data: invitation, error: fetchError } = await supabase
        .from('employee_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();
      if (fetchError) throw fetchError;

      const inv = invitation as unknown as EmployeeInvitation;

      // Call the provision-demo-user edge function to create the auth account
      const { data, error } = await supabase.functions.invoke('provision-demo-user', {
        body: {
          email: inv.email,
          password: generateTempPassword(),
          full_name: inv.full_name,
          role: 'employee',
          company_id: inv.company_id,
        },
      });

      if (error) {
        // Mark as failed
        await supabase
          .from('employee_invitations')
          .update({
            status: 'failed',
            error_message: error.message || 'Failed to create user account',
          })
          .eq('id', invitationId);
        throw error;
      }

      const userId = data?.user_id;

      // Link the employee record to the user
      if (userId) {
        await supabase
          .from('employees')
          .update({ user_id: userId })
          .eq('id', inv.employee_id);
      }

      // Mark as invited
      await supabase
        .from('employee_invitations')
        .update({
          status: 'invited',
          invited_at: new Date().toISOString(),
          invited_by: user?.id || null,
          error_message: null,
        })
        .eq('id', invitationId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invitations'] });
    },
  });
}

export function useSendAllInvitations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      // Get all pending/failed invitations
      const { data: invitations, error: fetchError } = await supabase
        .from('employee_invitations')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['pending', 'failed']);
      if (fetchError) throw fetchError;

      const results = [];
      for (const inv of (invitations as unknown as EmployeeInvitation[])) {
        try {
          const { data, error } = await supabase.functions.invoke('provision-demo-user', {
            body: {
              email: inv.email,
              password: generateTempPassword(),
              full_name: inv.full_name,
              role: 'employee',
              company_id: inv.company_id,
            },
          });

          if (error) throw error;

          const userId = data?.user_id;
          if (userId) {
            await supabase
              .from('employees')
              .update({ user_id: userId })
              .eq('id', inv.employee_id);
          }

          await supabase
            .from('employee_invitations')
            .update({
              status: 'invited',
              invited_at: new Date().toISOString(),
              invited_by: user?.id || null,
              error_message: null,
            })
            .eq('id', inv.id);

          results.push({ id: inv.id, success: true });
        } catch (err: any) {
          await supabase
            .from('employee_invitations')
            .update({
              status: 'failed',
              error_message: err.message || 'Provisioning failed',
            })
            .eq('id', inv.id);
          results.push({ id: inv.id, success: false, error: err.message });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-invitations'] });
    },
  });
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  for (let i = 0; i < 16; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}
