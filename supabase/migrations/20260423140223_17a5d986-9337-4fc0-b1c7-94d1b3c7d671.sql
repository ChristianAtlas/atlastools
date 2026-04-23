-- =========================================================================
-- VENDOR / 1099 CONTRACTOR MODULE — PHASE 1
-- =========================================================================

-- Enums
CREATE TYPE public.vendor_worker_type AS ENUM ('1099_ic', 'c2c_vendor');
CREATE TYPE public.vendor_status AS ENUM ('active', 'inactive', 'terminated', 'pending');
CREATE TYPE public.vendor_onboarding_status AS ENUM ('not_started', 'in_progress', 'pending_w9', 'complete');
CREATE TYPE public.vendor_w9_status AS ENUM ('not_collected', 'pending_review', 'on_file', 'expired');
CREATE TYPE public.vendor_1099_category AS ENUM ('nec', 'misc_rent', 'misc_royalties', 'misc_other_income', 'misc_legal', 'misc_prizes', 'misc_medical', 'misc_other');

-- VID sequence
CREATE SEQUENCE IF NOT EXISTS public.vendor_vid_seq START 100001;

-- =========================================================================
-- vendors
-- =========================================================================
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vid TEXT UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  worker_type public.vendor_worker_type NOT NULL,
  is_c2c BOOLEAN NOT NULL DEFAULT false,

  -- Individual fields (1099 IC)
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,

  -- Entity fields (C2C)
  business_name TEXT,
  contact_name TEXT,

  -- Common
  legal_name TEXT NOT NULL,
  tax_id_encrypted TEXT, -- SSN / TIN / EIN encrypted at rest
  tax_id_last4 TEXT,
  tax_id_type TEXT CHECK (tax_id_type IN ('ssn', 'ein', 'itin')),

  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',

  status public.vendor_status NOT NULL DEFAULT 'pending',
  onboarding_status public.vendor_onboarding_status NOT NULL DEFAULT 'not_started',
  w9_status public.vendor_w9_status NOT NULL DEFAULT 'not_collected',
  w9_collected_at TIMESTAMPTZ,
  w9_expires_at DATE,

  portal_access_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_withholding_enabled BOOLEAN NOT NULL DEFAULT false,
  backup_withholding_rate NUMERIC(5,4) DEFAULT 0.24,

  default_1099_category public.vendor_1099_category DEFAULT 'nec',

  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_vendors_company ON public.vendors(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_status ON public.vendors(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_worker_type ON public.vendors(worker_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_vid ON public.vendors(vid);

-- VID auto-assignment
CREATE OR REPLACE FUNCTION public.auto_assign_vid()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.vid IS NULL OR NEW.vid = '' THEN
    NEW.vid := 'V' || nextval('vendor_vid_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vendors_assign_vid BEFORE INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_vid();

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Protect sensitive fields from client_admin edits
CREATE OR REPLACE FUNCTION public.protect_vendor_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.vid IS DISTINCT FROM OLD.vid
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Only super admins can modify VID, company assignment, or soft-delete a vendor';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER vendors_protect_sensitive BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_sensitive_fields();

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_all_vendors" ON public.vendors
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "client_admins_select_own_vendors" ON public.vendors
  FOR SELECT TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "client_admins_insert_own_vendors" ON public.vendors
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_update_own_vendors" ON public.vendors
  FOR UPDATE TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
    AND deleted_at IS NULL
  )
  WITH CHECK (
    company_id::text = get_user_company(auth.uid())
  );

-- =========================================================================
-- vendor_documents
-- =========================================================================
CREATE TABLE public.vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL, -- 'w9', 'msa', 'coi', 'other'
  title TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_documents_vendor ON public.vendor_documents(vendor_id);
CREATE INDEX idx_vendor_documents_company ON public.vendor_documents(company_id);

CREATE TRIGGER vendor_documents_updated_at BEFORE UPDATE ON public.vendor_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_all_vendor_documents" ON public.vendor_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "client_admins_select_own_vendor_documents" ON public.vendor_documents
  FOR SELECT TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_insert_own_vendor_documents" ON public.vendor_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_update_own_vendor_documents" ON public.vendor_documents
  FOR UPDATE TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  )
  WITH CHECK (
    company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_delete_own_vendor_documents" ON public.vendor_documents
  FOR DELETE TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

-- =========================================================================
-- vendor_ytd_prior_earnings
-- =========================================================================
CREATE TABLE public.vendor_ytd_prior_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  reporting_year INTEGER NOT NULL,
  category public.vendor_1099_category NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  backup_withholding_cents BIGINT NOT NULL DEFAULT 0 CHECK (backup_withholding_cents >= 0),
  source_description TEXT,
  notes TEXT,
  entered_by UUID,
  entered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_ytd_prior_vendor ON public.vendor_ytd_prior_earnings(vendor_id);
CREATE INDEX idx_vendor_ytd_prior_year ON public.vendor_ytd_prior_earnings(reporting_year);
CREATE INDEX idx_vendor_ytd_prior_company ON public.vendor_ytd_prior_earnings(company_id);

CREATE TRIGGER vendor_ytd_prior_earnings_updated_at BEFORE UPDATE ON public.vendor_ytd_prior_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.vendor_ytd_prior_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_all_vendor_ytd" ON public.vendor_ytd_prior_earnings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "client_admins_select_own_vendor_ytd" ON public.vendor_ytd_prior_earnings
  FOR SELECT TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_insert_own_vendor_ytd" ON public.vendor_ytd_prior_earnings
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_update_own_vendor_ytd" ON public.vendor_ytd_prior_earnings
  FOR UPDATE TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  )
  WITH CHECK (
    company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_delete_own_vendor_ytd" ON public.vendor_ytd_prior_earnings
  FOR DELETE TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

-- =========================================================================
-- vendor_audit_logs (append-only)
-- =========================================================================
CREATE TABLE public.vendor_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  changed_fields TEXT[],
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_audit_vendor ON public.vendor_audit_logs(vendor_id, created_at DESC);
CREATE INDEX idx_vendor_audit_company ON public.vendor_audit_logs(company_id, created_at DESC);

ALTER TABLE public.vendor_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_select_vendor_audit" ON public.vendor_audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "client_admins_select_own_vendor_audit" ON public.vendor_audit_logs
  FOR SELECT TO authenticated
  USING (
    NOT has_role(auth.uid(), 'super_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "system_insert_vendor_audit" ON public.vendor_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No update/delete policies => append-only

-- Audit trigger for vendors
CREATE OR REPLACE FUNCTION public.vendor_audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _old jsonb := NULL;
  _new jsonb := NULL;
  _changed text[] := '{}';
  _user_id uuid;
  _user_email text;
  _user_role text;
  _col text;
BEGIN
  BEGIN _user_id := auth.uid(); EXCEPTION WHEN OTHERS THEN _user_id := NULL; END;
  IF _user_id IS NOT NULL THEN
    SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
    SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _new := to_jsonb(NEW) - 'tax_id_encrypted';
    INSERT INTO public.vendor_audit_logs (vendor_id, company_id, action, new_data, user_id, user_email, user_role)
      VALUES (NEW.id, NEW.company_id, 'INSERT', _new, _user_id, _user_email, _user_role);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD) - 'tax_id_encrypted';
    _new := to_jsonb(NEW) - 'tax_id_encrypted';
    FOR _col IN SELECT key FROM jsonb_each(_new) LOOP
      IF _col NOT IN ('updated_at') AND (_old->_col)::text IS DISTINCT FROM (_new->_col)::text THEN
        _changed := array_append(_changed, _col);
      END IF;
    END LOOP;
    IF array_length(_changed, 1) IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.vendor_audit_logs (vendor_id, company_id, action, changed_fields, old_data, new_data, user_id, user_email, user_role)
      VALUES (NEW.id, NEW.company_id, 'UPDATE', _changed, _old, _new, _user_id, _user_email, _user_role);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD) - 'tax_id_encrypted';
    INSERT INTO public.vendor_audit_logs (vendor_id, company_id, action, old_data, user_id, user_email, user_role)
      VALUES (OLD.id, OLD.company_id, 'DELETE', _old, _user_id, _user_email, _user_role);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER vendors_audit AFTER INSERT OR UPDATE OR DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.vendor_audit_trigger_fn();

-- =========================================================================
-- Storage bucket: vendor-documents (private)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-documents', 'vendor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {company_id}/{vendor_id}/{filename}
CREATE POLICY "vendor_docs_super_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'vendor-documents' AND has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (bucket_id = 'vendor-documents' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "vendor_docs_client_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (storage.foldername(name))[1] = get_user_company(auth.uid())
  );

CREATE POLICY "vendor_docs_client_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-documents'
    AND (storage.foldername(name))[1] = get_user_company(auth.uid())
  );

CREATE POLICY "vendor_docs_client_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (storage.foldername(name))[1] = get_user_company(auth.uid())
  );

CREATE POLICY "vendor_docs_client_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vendor-documents'
    AND (storage.foldername(name))[1] = get_user_company(auth.uid())
  );
