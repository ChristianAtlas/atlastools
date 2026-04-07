
CREATE TABLE public.company_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Super admins: full access
CREATE POLICY "sa_all_company_holidays"
  ON public.company_holidays FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins: full CRUD on own company
CREATE POLICY "ca_select_own_holidays"
  ON public.company_holidays FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_insert_own_holidays"
  ON public.company_holidays FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_update_own_holidays"
  ON public.company_holidays FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())))
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_delete_own_holidays"
  ON public.company_holidays FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

-- Employees: read own company holidays
CREATE POLICY "emp_read_own_holidays"
  ON public.company_holidays FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'employee'::app_role) AND (company_id::text = get_user_company(auth.uid())));
