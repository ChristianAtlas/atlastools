import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EmployeeRow } from './useEmployees';

/**
 * Fetches the employee record linked to the currently authenticated user.
 * Used by the employee portal pages.
 */
export function useCurrentEmployee() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current_employee', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*, companies(name)')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data as unknown as EmployeeRow;
    },
    enabled: !!user?.id,
  });
}
