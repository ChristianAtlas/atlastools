
-- Create time_off_policies table
CREATE TABLE public.time_off_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  policy_type TEXT NOT NULL DEFAULT 'pto',
  accrual_method TEXT NOT NULL DEFAULT 'per_pay_period',
  accrual_rate NUMERIC NOT NULL DEFAULT 0,
  eligible_earning_codes TEXT[] NOT NULL DEFAULT '{regular}',
  balance_cap_hours NUMERIC,
  annual_accrual_cap_hours NUMERIC,
  reset_schedule TEXT NOT NULL DEFAULT 'calendar_year',
  custom_reset_date TEXT,
  unused_hours_policy TEXT NOT NULL DEFAULT 'carryover',
  carryover_max_hours NUMERIC,
  waiting_period_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_off_policies ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "sa_all_time_off_policies"
ON public.time_off_policies
AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admin: full CRUD for own company
CREATE POLICY "ca_select_own_time_off_policies"
ON public.time_off_policies
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND company_id::text = get_user_company(auth.uid())
);

CREATE POLICY "ca_insert_own_time_off_policies"
ON public.time_off_policies
AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND company_id::text = get_user_company(auth.uid())
);

CREATE POLICY "ca_update_own_time_off_policies"
ON public.time_off_policies
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND company_id::text = get_user_company(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND company_id::text = get_user_company(auth.uid())
);

CREATE POLICY "ca_delete_own_time_off_policies"
ON public.time_off_policies
AS PERMISSIVE FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND company_id::text = get_user_company(auth.uid())
);

-- Employee: read-only for own company active policies
CREATE POLICY "emp_read_own_time_off_policies"
ON public.time_off_policies
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'employee'::app_role)
  AND is_active = true
  AND company_id::text = get_user_company(auth.uid())
);

-- Updated_at trigger
CREATE TRIGGER update_time_off_policies_updated_at
BEFORE UPDATE ON public.time_off_policies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
