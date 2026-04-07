
-- Create table for external benefit deductions (used in payroll and W-2 reporting)
CREATE TABLE public.external_benefit_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  carrier_name TEXT NOT NULL DEFAULT '',
  plan_type TEXT NOT NULL DEFAULT '',
  ee_deduction_cents BIGINT NOT NULL DEFAULT 0,
  er_contribution_cents BIGINT NOT NULL DEFAULT 0,
  er_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One active record per employee
CREATE UNIQUE INDEX idx_external_benefit_deductions_employee_active
  ON public.external_benefit_deductions (employee_id)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.external_benefit_deductions ENABLE ROW LEVEL SECURITY;

-- Super Admin: full access
CREATE POLICY "sa_all_external_benefit_deductions"
  ON public.external_benefit_deductions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Client Admin: own company only
CREATE POLICY "ca_read_own_external_benefit_deductions"
  ON public.external_benefit_deductions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = public.get_user_company(auth.uid()));

CREATE POLICY "ca_insert_own_external_benefit_deductions"
  ON public.external_benefit_deductions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = public.get_user_company(auth.uid()));

CREATE POLICY "ca_update_own_external_benefit_deductions"
  ON public.external_benefit_deductions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = public.get_user_company(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = public.get_user_company(auth.uid()));

CREATE POLICY "ca_delete_own_external_benefit_deductions"
  ON public.external_benefit_deductions
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = public.get_user_company(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_external_benefit_deductions_updated_at
  BEFORE UPDATE ON public.external_benefit_deductions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
