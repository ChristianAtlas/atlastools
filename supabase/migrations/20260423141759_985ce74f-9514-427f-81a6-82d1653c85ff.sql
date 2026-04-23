-- =========================================================
-- VENDOR PAYMENT RUNS + VENDOR PAYMENTS (Phase 2)
-- =========================================================

-- Enums
CREATE TYPE public.vendor_payment_run_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'processing', 'paid', 'voided'
);

CREATE TYPE public.vendor_payment_method AS ENUM (
  'ach', 'check', 'wire', 'external'
);

CREATE TYPE public.vendor_payment_status AS ENUM (
  'draft', 'approved', 'processing', 'paid', 'voided', 'failed'
);

-- Sequence for VPID
CREATE SEQUENCE IF NOT EXISTS public.vendor_payment_vpid_seq START WITH 100001;

-- =========================================================
-- vendor_payment_runs
-- =========================================================
CREATE TABLE public.vendor_payment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  -- 'standalone' = vendor-only run, 'ride_along' = attached to a payroll_run
  run_kind TEXT NOT NULL DEFAULT 'standalone' CHECK (run_kind IN ('standalone', 'ride_along')),
  status public.vendor_payment_run_status NOT NULL DEFAULT 'draft',
  period_start DATE,
  period_end DATE,
  pay_date DATE NOT NULL,
  total_amount_cents BIGINT NOT NULL DEFAULT 0,
  total_backup_withholding_cents BIGINT NOT NULL DEFAULT 0,
  vendor_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_payment_runs_company ON public.vendor_payment_runs(company_id);
CREATE INDEX idx_vendor_payment_runs_payroll_run ON public.vendor_payment_runs(payroll_run_id) WHERE payroll_run_id IS NOT NULL;
CREATE INDEX idx_vendor_payment_runs_status ON public.vendor_payment_runs(status);
CREATE INDEX idx_vendor_payment_runs_pay_date ON public.vendor_payment_runs(pay_date DESC);

CREATE TRIGGER vendor_payment_runs_updated_at BEFORE UPDATE ON public.vendor_payment_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.vendor_payment_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_all_vendor_payment_runs" ON public.vendor_payment_runs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "client_admins_select_own_vendor_payment_runs" ON public.vendor_payment_runs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_insert_own_vendor_payment_runs" ON public.vendor_payment_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_update_own_vendor_payment_runs" ON public.vendor_payment_runs
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

-- =========================================================
-- vendor_payments
-- =========================================================
CREATE TABLE public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vpid TEXT NOT NULL UNIQUE,
  vendor_payment_run_id UUID NOT NULL REFERENCES public.vendor_payment_runs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,

  -- Money
  gross_amount_cents BIGINT NOT NULL CHECK (gross_amount_cents >= 0),
  backup_withholding_cents BIGINT NOT NULL DEFAULT 0 CHECK (backup_withholding_cents >= 0),
  net_amount_cents BIGINT NOT NULL CHECK (net_amount_cents >= 0),

  -- 1099 reporting
  category public.vendor_1099_category NOT NULL DEFAULT 'nec',
  reporting_year INT NOT NULL,

  -- Payment method + references
  payment_method public.vendor_payment_method NOT NULL DEFAULT 'ach',
  check_number TEXT,
  wire_reference TEXT,
  external_reference TEXT,
  memo TEXT,

  -- Eligibility snapshot at time of entry (audit trail)
  vendor_w9_status_snapshot public.vendor_w9_status,
  vendor_onboarding_status_snapshot public.vendor_onboarding_status,
  vendor_tax_id_type_snapshot TEXT,

  status public.vendor_payment_status NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  notes TEXT,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendor_payments_run ON public.vendor_payments(vendor_payment_run_id);
CREATE INDEX idx_vendor_payments_vendor ON public.vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_company ON public.vendor_payments(company_id);
CREATE INDEX idx_vendor_payments_year ON public.vendor_payments(reporting_year);
CREATE INDEX idx_vendor_payments_status ON public.vendor_payments(status);
CREATE INDEX idx_vendor_payments_vpid ON public.vendor_payments(vpid);

-- VPID auto-assign
CREATE OR REPLACE FUNCTION public.auto_assign_vpid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.vpid IS NULL OR NEW.vpid = '' THEN
    NEW.vpid := 'VP' || nextval('vendor_payment_vpid_seq');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER vendor_payments_assign_vpid BEFORE INSERT ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_vpid();

CREATE TRIGGER vendor_payments_updated_at BEFORE UPDATE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================================
-- Eligibility validation trigger
--   HARD BLOCKS:
--     - missing or expired W-9
--     - missing TIN (type or last4)
--     - onboarding != complete
--     - vendor status != active
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_vendor_payment_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v RECORD;
  reasons text[] := '{}';
BEGIN
  SELECT * INTO v FROM public.vendors WHERE id = NEW.vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor not found';
  END IF;

  IF v.status::text <> 'active' THEN
    reasons := array_append(reasons, 'vendor_not_active(' || v.status::text || ')');
  END IF;

  IF v.onboarding_status::text <> 'complete' THEN
    reasons := array_append(reasons, 'onboarding_incomplete(' || v.onboarding_status::text || ')');
  END IF;

  IF v.w9_status::text <> 'on_file' THEN
    reasons := array_append(reasons, 'w9_not_on_file(' || v.w9_status::text || ')');
  END IF;

  IF v.w9_expires_at IS NOT NULL AND v.w9_expires_at < CURRENT_DATE THEN
    reasons := array_append(reasons, 'w9_expired');
  END IF;

  IF v.tax_id_type IS NULL OR v.tax_id_last4 IS NULL THEN
    reasons := array_append(reasons, 'missing_tin');
  END IF;

  IF array_length(reasons, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Vendor % is not eligible for payment: %', v.vid, array_to_string(reasons, ', ');
  END IF;

  -- snapshot eligibility fields
  NEW.vendor_w9_status_snapshot := v.w9_status;
  NEW.vendor_onboarding_status_snapshot := v.onboarding_status;
  NEW.vendor_tax_id_type_snapshot := v.tax_id_type;

  RETURN NEW;
END $$;

CREATE TRIGGER vendor_payments_validate_eligibility
  BEFORE INSERT ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_vendor_payment_eligibility();

-- Audit trigger reusing vendor_audit_logs is vendor-specific; create a lightweight
-- audit via the global audit_trigger_fn for vendor_payments + runs.
CREATE TRIGGER vendor_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER vendor_payment_runs_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payment_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- RLS for vendor_payments
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_all_vendor_payments" ON public.vendor_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "client_admins_select_own_vendor_payments" ON public.vendor_payments
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_insert_own_vendor_payments" ON public.vendor_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY "client_admins_update_own_vendor_payments" ON public.vendor_payments
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

-- =========================================================
-- Helper: recompute vendor_payment_runs totals when payments change
-- =========================================================
CREATE OR REPLACE FUNCTION public.recompute_vendor_payment_run_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rid := OLD.vendor_payment_run_id;
  ELSE
    rid := NEW.vendor_payment_run_id;
  END IF;

  UPDATE public.vendor_payment_runs r SET
    total_amount_cents = COALESCE((SELECT SUM(gross_amount_cents) FROM public.vendor_payments WHERE vendor_payment_run_id = rid AND status <> 'voided'), 0),
    total_backup_withholding_cents = COALESCE((SELECT SUM(backup_withholding_cents) FROM public.vendor_payments WHERE vendor_payment_run_id = rid AND status <> 'voided'), 0),
    vendor_count = COALESCE((SELECT COUNT(*) FROM public.vendor_payments WHERE vendor_payment_run_id = rid AND status <> 'voided'), 0),
    updated_at = now()
  WHERE r.id = rid;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER vendor_payments_recompute_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.recompute_vendor_payment_run_totals();
