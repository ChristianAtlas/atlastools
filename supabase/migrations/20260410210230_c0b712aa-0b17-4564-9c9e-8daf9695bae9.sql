
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage payroll markups" ON public.payroll_markups;
DROP POLICY IF EXISTS "Authenticated users can read payroll markups" ON public.payroll_markups;

-- Super admins: full access
CREATE POLICY "sa_all_payroll_markups"
ON public.payroll_markups
AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins: read-only, scoped to own company via invoices
CREATE POLICY "ca_read_own_payroll_markups"
ON public.payroll_markups
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND invoice_id IN (
    SELECT id FROM public.invoices WHERE company_id::text = get_user_company(auth.uid())
  )
);
