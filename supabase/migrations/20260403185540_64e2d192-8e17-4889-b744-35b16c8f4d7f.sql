
-- Create employee_invitations table
CREATE TABLE public.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_at timestamp with time zone,
  activated_at timestamp with time zone,
  invited_by uuid,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "sa_all_employee_invitations"
ON public.employee_invitations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Client admins can read their own company's invitations
CREATE POLICY "ca_read_own_employee_invitations"
ON public.employee_invitations FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_admin') 
  AND (company_id)::text = get_user_company(auth.uid())
);

-- Employees can read their own invitation
CREATE POLICY "emp_read_own_invitation"
ON public.employee_invitations FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_employee_invitations_updated_at
BEFORE UPDATE ON public.employee_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
