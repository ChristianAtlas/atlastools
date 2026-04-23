
-- =========================================================================
-- Link vendors to auth users
-- =========================================================================
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portal_invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_first_login_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.vendors
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1
$$;

-- =========================================================================
-- vendor_banking table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.vendor_banking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  account_holder_name text,
  account_type text NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking','savings')),
  routing_number_last4 text,
  account_number_last4 text,
  routing_number_encrypted text,
  account_number_encrypted text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','failed')),
  verified_at timestamptz,
  last_changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_banking_company ON public.vendor_banking(company_id);

DROP TRIGGER IF EXISTS vendor_banking_updated_at ON public.vendor_banking;
CREATE TRIGGER vendor_banking_updated_at
  BEFORE UPDATE ON public.vendor_banking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.reset_vendor_banking_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.routing_number_encrypted IS DISTINCT FROM OLD.routing_number_encrypted
       OR NEW.account_number_encrypted IS DISTINCT FROM OLD.account_number_encrypted
       OR NEW.account_number_last4 IS DISTINCT FROM OLD.account_number_last4
       OR NEW.routing_number_last4 IS DISTINCT FROM OLD.routing_number_last4 THEN
      NEW.verification_status := 'pending';
      NEW.verified_at := NULL;
      NEW.last_changed_at := now();
      NEW.changed_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_reset_vendor_banking_verification ON public.vendor_banking;
CREATE TRIGGER trg_reset_vendor_banking_verification
  BEFORE UPDATE ON public.vendor_banking
  FOR EACH ROW EXECUTE FUNCTION public.reset_vendor_banking_verification();

ALTER TABLE public.vendor_banking ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Protect contractor-immutable fields on vendors
-- =========================================================================
CREATE OR REPLACE FUNCTION public.protect_vendor_contractor_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR has_role(auth.uid(), 'super_admin'::app_role)
     OR has_role(auth.uid(), 'client_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF has_role(auth.uid(), 'contractor'::app_role) THEN
    IF NEW.tax_id_type IS DISTINCT FROM OLD.tax_id_type
       OR NEW.tax_id_last4 IS DISTINCT FROM OLD.tax_id_last4
       OR NEW.tax_id_encrypted IS DISTINCT FROM OLD.tax_id_encrypted
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status
       OR NEW.w9_status IS DISTINCT FROM OLD.w9_status
       OR NEW.w9_collected_at IS DISTINCT FROM OLD.w9_collected_at
       OR NEW.w9_expires_at IS DISTINCT FROM OLD.w9_expires_at
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.worker_type IS DISTINCT FROM OLD.worker_type
       OR NEW.is_c2c IS DISTINCT FROM OLD.is_c2c
       OR NEW.backup_withholding_enabled IS DISTINCT FROM OLD.backup_withholding_enabled
       OR NEW.backup_withholding_rate IS DISTINCT FROM OLD.backup_withholding_rate
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.vid IS DISTINCT FROM OLD.vid
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      RAISE EXCEPTION 'Contractors cannot modify tax ID, status, onboarding, W-9, withholding, company, worker type, or identity fields.';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_protect_vendor_contractor_fields ON public.vendors;
CREATE TRIGGER trg_protect_vendor_contractor_fields
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_contractor_fields();

-- =========================================================================
-- RLS — vendors
-- =========================================================================
DROP POLICY IF EXISTS "contractors_select_own_vendor" ON public.vendors;
CREATE POLICY "contractors_select_own_vendor"
  ON public.vendors FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "contractors_update_own_vendor" ON public.vendors;
CREATE POLICY "contractors_update_own_vendor"
  ON public.vendors FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    has_role(auth.uid(), 'contractor'::app_role)
    AND user_id = auth.uid()
  );

-- =========================================================================
-- RLS — vendor_documents
-- =========================================================================
DROP POLICY IF EXISTS "contractors_select_own_documents" ON public.vendor_documents;
CREATE POLICY "contractors_select_own_documents"
  ON public.vendor_documents FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

DROP POLICY IF EXISTS "contractors_insert_own_documents" ON public.vendor_documents;
CREATE POLICY "contractors_insert_own_documents"
  ON public.vendor_documents FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

-- =========================================================================
-- RLS — vendor_payments + runs + prior YTD
-- =========================================================================
DROP POLICY IF EXISTS "contractors_select_own_payments" ON public.vendor_payments;
CREATE POLICY "contractors_select_own_payments"
  ON public.vendor_payments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

DROP POLICY IF EXISTS "contractors_select_own_payment_runs" ON public.vendor_payment_runs;
CREATE POLICY "contractors_select_own_payment_runs"
  ON public.vendor_payment_runs FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.vendor_payments vp
      WHERE vp.vendor_payment_run_id = vendor_payment_runs.id
        AND vp.vendor_id = public.current_vendor_id()
    )
  );

DROP POLICY IF EXISTS "contractors_select_own_prior_ytd" ON public.vendor_ytd_prior_earnings;
CREATE POLICY "contractors_select_own_prior_ytd"
  ON public.vendor_ytd_prior_earnings FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

-- =========================================================================
-- RLS — vendor_banking
-- =========================================================================
DROP POLICY IF EXISTS "super_admins_all_vendor_banking" ON public.vendor_banking;
CREATE POLICY "super_admins_all_vendor_banking"
  ON public.vendor_banking FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "client_admins_select_own_vendor_banking" ON public.vendor_banking;
CREATE POLICY "client_admins_select_own_vendor_banking"
  ON public.vendor_banking FOR SELECT TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

DROP POLICY IF EXISTS "contractors_select_own_banking" ON public.vendor_banking;
CREATE POLICY "contractors_select_own_banking"
  ON public.vendor_banking FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

DROP POLICY IF EXISTS "contractors_insert_own_banking" ON public.vendor_banking;
CREATE POLICY "contractors_insert_own_banking"
  ON public.vendor_banking FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

DROP POLICY IF EXISTS "contractors_update_own_banking" ON public.vendor_banking;
CREATE POLICY "contractors_update_own_banking"
  ON public.vendor_banking FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  )
  WITH CHECK (
    has_role(auth.uid(), 'contractor'::app_role)
    AND vendor_id = public.current_vendor_id()
  );

-- =========================================================================
-- Storage policies for contractors
-- =========================================================================
DROP POLICY IF EXISTS "contractors_read_own_vendor_documents" ON storage.objects;
CREATE POLICY "contractors_read_own_vendor_documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND has_role(auth.uid(), 'contractor'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.vendor_documents vd
      WHERE vd.file_path = storage.objects.name
        AND vd.vendor_id = public.current_vendor_id()
    )
  );

DROP POLICY IF EXISTS "contractors_upload_own_vendor_documents" ON storage.objects;
CREATE POLICY "contractors_upload_own_vendor_documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents'
    AND has_role(auth.uid(), 'contractor'::app_role)
    AND (storage.foldername(name))[2] = public.current_vendor_id()::text
  );
