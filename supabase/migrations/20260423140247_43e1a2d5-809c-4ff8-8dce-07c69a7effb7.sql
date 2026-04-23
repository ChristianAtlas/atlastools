DROP POLICY IF EXISTS "system_insert_vendor_audit" ON public.vendor_audit_logs;

CREATE POLICY "scoped_insert_vendor_audit" ON public.vendor_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR company_id::text = get_user_company(auth.uid())
  );