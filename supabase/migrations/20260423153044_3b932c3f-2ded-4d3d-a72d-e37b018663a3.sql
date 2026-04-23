
-- =====================================================================
-- Workers' Compensation rebuild — Phase 1: schema
-- =====================================================================

-- 1. Allow MASTER PEO policies (company_id NULL = AtlasOne PEO master)
ALTER TABLE public.workers_comp_policies
  ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.workers_comp_policies
  ADD COLUMN IF NOT EXISTS is_master boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_markup_rate numeric(6,4) NOT NULL DEFAULT 0.0150;

-- Exactly one active master policy
CREATE UNIQUE INDEX IF NOT EXISTS uq_workers_comp_policies_one_master
  ON public.workers_comp_policies (is_master)
  WHERE is_master = true AND status = 'active';

COMMENT ON COLUMN public.workers_comp_policies.company_id IS
  'NULL when this is the AtlasOne PEO master policy. Per-client overrides set company_id.';
COMMENT ON COLUMN public.workers_comp_policies.default_markup_rate IS
  'Internal markup applied to base WC premium. Default 1.5%. Hidden from client.';

-- 2. WC codes can be master (company_id NULL) or per-client override
ALTER TABLE public.workers_comp_codes
  ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.workers_comp_codes
  ADD COLUMN IF NOT EXISTS markup_rate_override numeric(6,4),
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. WC code rate history (effective-dated). The current rate stays on
--    workers_comp_codes for fast lookup; this table preserves all historical
--    rates that were ever in effect for snapshotting at payroll time.
CREATE TABLE IF NOT EXISTS public.workers_comp_code_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_code_id uuid NOT NULL REFERENCES public.workers_comp_codes(id) ON DELETE CASCADE,
  rate_per_hundred numeric(10,4) NOT NULL,
  rate_basis text NOT NULL DEFAULT 'per_hundred' CHECK (rate_basis IN ('per_hundred','per_hour')),
  markup_rate numeric(6,4) NOT NULL DEFAULT 0.0150,
  effective_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_wc_code_rates_code_eff
  ON public.workers_comp_code_rates (wc_code_id, effective_date DESC);

ALTER TABLE public.workers_comp_code_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_code_rates_super_admin_all"
  ON public.workers_comp_code_rates
  FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Read-only access for client admins (they can see code metadata but not rate values are still hidden in the UI; we restrict at the policy level too)
CREATE POLICY "wc_code_rates_client_admin_read"
  ON public.workers_comp_code_rates
  FOR SELECT
  USING (public.has_role(auth.uid(), 'client_admin'));

-- 4. Assignments: add audit columns + a derived view-friendly index
ALTER TABLE public.employee_wc_assignments
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_emp_wc_assignments_active
  ON public.employee_wc_assignments (company_id, employee_id)
  WHERE is_active = true;

-- 5. wc_payroll_calculations: snapshot rate basis + markup_amount columns
ALTER TABLE public.wc_payroll_calculations
  ADD COLUMN IF NOT EXISTS rate_basis text NOT NULL DEFAULT 'per_hundred',
  ADD COLUMN IF NOT EXISTS hours numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wc_code_rate_id uuid REFERENCES public.workers_comp_code_rates(id);

-- 6. Trigger: when a wc code rate changes, write a row into history and stamp
--    workers_comp_codes with the new "current" rate.
CREATE OR REPLACE FUNCTION public.snapshot_wc_code_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.workers_comp_code_rates
      (wc_code_id, rate_per_hundred, rate_basis, markup_rate, effective_date, notes)
    VALUES
      (NEW.id, NEW.rate_per_hundred, NEW.rate_basis, COALESCE(NEW.markup_rate_override, NEW.internal_markup_rate, 0.0150),
       NEW.effective_date, 'Initial rate');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (
       NEW.rate_per_hundred IS DISTINCT FROM OLD.rate_per_hundred
    OR NEW.rate_basis IS DISTINCT FROM OLD.rate_basis
    OR NEW.markup_rate_override IS DISTINCT FROM OLD.markup_rate_override
    OR NEW.internal_markup_rate IS DISTINCT FROM OLD.internal_markup_rate
  ) THEN
    -- Close prior open rate
    UPDATE public.workers_comp_code_rates
       SET end_date = CURRENT_DATE
     WHERE wc_code_id = NEW.id AND end_date IS NULL;

    INSERT INTO public.workers_comp_code_rates
      (wc_code_id, rate_per_hundred, rate_basis, markup_rate, effective_date, notes)
    VALUES
      (NEW.id, NEW.rate_per_hundred, NEW.rate_basis,
       COALESCE(NEW.markup_rate_override, NEW.internal_markup_rate, 0.0150),
       CURRENT_DATE, 'Rate change');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_snapshot_wc_code_rate ON public.workers_comp_codes;
CREATE TRIGGER trg_snapshot_wc_code_rate
  AFTER INSERT OR UPDATE ON public.workers_comp_codes
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_wc_code_rate();

-- 7. Generic audit on WC tables (use existing audit_trigger_fn)
DROP TRIGGER IF EXISTS audit_workers_comp_policies ON public.workers_comp_policies;
CREATE TRIGGER audit_workers_comp_policies
  AFTER INSERT OR UPDATE OR DELETE ON public.workers_comp_policies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_workers_comp_codes ON public.workers_comp_codes;
CREATE TRIGGER audit_workers_comp_codes
  AFTER INSERT OR UPDATE OR DELETE ON public.workers_comp_codes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_employee_wc_assignments ON public.employee_wc_assignments;
CREATE TRIGGER audit_employee_wc_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_wc_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- 8. RLS: ensure client admins can SELECT codes/policies for display, but not see master markup data via row exposure.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workers_comp_codes' AND policyname='wc_codes_client_admin_read') THEN
    CREATE POLICY "wc_codes_client_admin_read"
      ON public.workers_comp_codes
      FOR SELECT
      USING (public.has_role(auth.uid(), 'client_admin') AND is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workers_comp_policies' AND policyname='wc_policies_client_admin_read') THEN
    CREATE POLICY "wc_policies_client_admin_read"
      ON public.workers_comp_policies
      FOR SELECT
      USING (
        public.has_role(auth.uid(), 'client_admin')
        AND (is_master = true OR company_id::text = public.get_user_company(auth.uid()))
      );
  END IF;
END $$;
