
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;

-- Super admins: full access
CREATE POLICY "sa_all_invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins: read-only for their own company
CREATE POLICY "ca_read_own_invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));
