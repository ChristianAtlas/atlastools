
-- Allow client admins to UPDATE their own company row
CREATE POLICY "client_admins_update_own_company"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND id::text = get_user_company(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND id::text = get_user_company(auth.uid())
);

-- Block edits to sensitive fields for non super-admins
CREATE OR REPLACE FUNCTION public.protect_company_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.legal_name IS DISTINCT FROM OLD.legal_name
     OR NEW.ein IS DISTINCT FROM OLD.ein
     OR NEW.cid IS DISTINCT FROM OLD.cid
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_demo IS DISTINCT FROM OLD.is_demo
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.premier_date IS DISTINCT FROM OLD.premier_date THEN
    RAISE EXCEPTION 'Only super admins can modify legal name, EIN, CID, status, demo flag, deleted_at, or premier_date';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_company_sensitive_fields_trg ON public.companies;
CREATE TRIGGER protect_company_sensitive_fields_trg
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.protect_company_sensitive_fields();
