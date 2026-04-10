
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage company addons" ON public.company_addons;
DROP POLICY IF EXISTS "Authenticated users can read company addons" ON public.company_addons;

-- Super admins: full access
CREATE POLICY "sa_all_company_addons"
ON public.company_addons
AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins: read-only, scoped to own company via company_plans
CREATE POLICY "ca_read_own_company_addons"
ON public.company_addons
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND company_plan_id IN (
    SELECT id FROM public.company_plans WHERE company_id = get_user_company(auth.uid())
  )
);
