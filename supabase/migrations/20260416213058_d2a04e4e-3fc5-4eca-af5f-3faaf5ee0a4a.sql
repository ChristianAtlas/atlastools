
-- ============================================
-- PHASE 2A: ADDITIVE SCHEMA REFACTOR (IDEMPOTENT)
-- ============================================

-- ----- 0. Wipe demo data -----
DO $$
DECLARE
  demo_uuid uuid[];
  demo_text text[];
BEGIN
  SELECT ARRAY(SELECT id FROM public.companies WHERE is_demo = true) INTO demo_uuid;
  SELECT ARRAY(SELECT id::text FROM public.companies WHERE is_demo = true) INTO demo_text;

  IF array_length(demo_uuid, 1) > 0 THEN
    DELETE FROM public.monthly_employee_billing WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.funding_events WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.external_benefit_deductions WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.employee_invitations WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.payroll_run_employees
      WHERE payroll_run_id IN (SELECT id FROM public.payroll_runs WHERE company_id = ANY(demo_uuid));
    DELETE FROM public.payroll_runs WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.compensation_records WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.employment_records WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.employee_wc_assignments WHERE company_id = ANY(demo_uuid);
    DELETE FROM public.invoice_line_items
      WHERE invoice_id IN (SELECT id FROM public.invoices WHERE company_id = ANY(demo_text));
    DELETE FROM public.invoices WHERE company_id = ANY(demo_text);
    DELETE FROM public.employees WHERE company_id = ANY(demo_uuid) OR is_demo = true;
    DELETE FROM public.companies WHERE id = ANY(demo_uuid);
  END IF;
END $$;

-- ============================================
-- 1. PAY GROUPS & SCHEDULES
-- ============================================
CREATE TABLE IF NOT EXISTS public.pay_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  pay_frequency text NOT NULL CHECK (pay_frequency IN ('weekly','biweekly','semi_monthly','monthly')),
  default_flag boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pay_groups_company ON public.pay_groups(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pay_groups_default_per_company
  ON public.pay_groups(company_id) WHERE default_flag = true;

CREATE TABLE IF NOT EXISTS public.pay_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_group_id uuid NOT NULL REFERENCES public.pay_groups(id) ON DELETE CASCADE,
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  check_date date NOT NULL,
  approval_deadline timestamptz,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pay_schedules_group ON public.pay_schedules(pay_group_id);
CREATE INDEX IF NOT EXISTS idx_pay_schedules_period ON public.pay_schedules(period_start_date, period_end_date);

-- ============================================
-- 2. PAYROLL DETAIL BREAKDOWN
-- ============================================
CREATE TABLE IF NOT EXISTS public.payroll_run_employee_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_employee_id uuid NOT NULL,
  earning_deduction_type_id uuid REFERENCES public.earning_deduction_types(id),
  earning_code text NOT NULL,
  description text,
  hours numeric(10,2),
  rate_cents bigint,
  amount_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pre_earnings_pre ON public.payroll_run_employee_earnings(payroll_run_employee_id);

CREATE TABLE IF NOT EXISTS public.payroll_run_employee_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_employee_id uuid NOT NULL,
  earning_deduction_type_id uuid REFERENCES public.earning_deduction_types(id),
  deduction_code text NOT NULL,
  description text,
  amount_cents bigint NOT NULL DEFAULT 0,
  pre_tax boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pre_deductions_pre ON public.payroll_run_employee_deductions(payroll_run_employee_id);

CREATE TABLE IF NOT EXISTS public.payroll_run_employee_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_employee_id uuid NOT NULL,
  tax_type text NOT NULL,
  jurisdiction text NOT NULL,
  state_code text,
  amount_cents bigint NOT NULL DEFAULT 0,
  ee_or_er text NOT NULL DEFAULT 'ee' CHECK (ee_or_er IN ('ee','er')),
  taxable_wages_cents bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pre_taxes_pre ON public.payroll_run_employee_taxes(payroll_run_employee_id);

CREATE TABLE IF NOT EXISTS public.payroll_run_employee_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_employee_id uuid NOT NULL,
  earning_deduction_type_id uuid REFERENCES public.earning_deduction_types(id),
  contribution_code text NOT NULL,
  description text,
  amount_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pre_contrib_pre ON public.payroll_run_employee_contributions(payroll_run_employee_id);

-- ============================================
-- 3. WORKERS' COMP
-- ============================================
CREATE TABLE IF NOT EXISTS public.wc_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  policy_number text NOT NULL,
  carrier text NOT NULL,
  state_code text NOT NULL,
  effective_date date NOT NULL,
  expiration_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wc_policies_company ON public.wc_policies(company_id);

CREATE TABLE IF NOT EXISTS public.wc_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  state_code text,
  description text NOT NULL,
  hazard_group text,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'wc_codes_code_state_code_key') THEN
    BEGIN
      ALTER TABLE public.wc_codes ADD CONSTRAINT wc_codes_code_state_code_key UNIQUE (code, state_code);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wc_code_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_code_id uuid NOT NULL REFERENCES public.wc_codes(id) ON DELETE CASCADE,
  rate numeric(8,4) NOT NULL,
  effective_date date NOT NULL,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wc_code_rates_code ON public.wc_code_rates(wc_code_id);

-- ============================================
-- 4. TAX ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_tax_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  state_code text NOT NULL,
  tax_type text NOT NULL CHECK (tax_type IN ('SUI','SIT','LOCAL','SDI','PFL','OTHER')),
  account_number text,
  filing_frequency text,
  registration_status text NOT NULL DEFAULT 'pending',
  effective_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cta_company ON public.company_tax_accounts(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_cta_active
  ON public.company_tax_accounts(company_id, state_code, tax_type)
  WHERE end_date IS NULL;

-- ============================================
-- 5. LOCATIONS & ADDRESSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state text NOT NULL,
  zip text,
  local_jurisdiction text,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_company_locations_company ON public.company_locations(company_id);

CREATE TABLE IF NOT EXISTS public.employee_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  address_type text NOT NULL CHECK (address_type IN ('home','work','mailing')),
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employee_addresses_emp ON public.employee_addresses(employee_id);

-- ============================================
-- 6. EMPLOYEE DEDUCTIONS & DIRECT DEPOSITS
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  earning_deduction_type_id uuid NOT NULL REFERENCES public.earning_deduction_types(id),
  amount_cents bigint,
  percent numeric(6,3),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_cents IS NOT NULL OR percent IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_emp ON public.employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_company ON public.employee_deductions(company_id);

CREATE TABLE IF NOT EXISTS public.employee_direct_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('checking','savings')),
  routing_number text NOT NULL,
  account_number_encrypted text NOT NULL,
  account_last4 text,
  bank_name text,
  allocation_type text NOT NULL DEFAULT 'percent' CHECK (allocation_type IN ('percent','amount','remainder')),
  allocation_value numeric(10,2),
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_edd_emp ON public.employee_direct_deposits(employee_id);

-- ============================================
-- 7. COLUMN EXTENSIONS
-- ============================================
ALTER TABLE public.employment_records
  ADD COLUMN IF NOT EXISTS worker_type text DEFAULT 'W2',
  ADD COLUMN IF NOT EXISTS employee_type text DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS flsa_status text,
  ADD COLUMN IF NOT EXISTS work_state text,
  ADD COLUMN IF NOT EXISTS resident_state text,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.company_locations(id),
  ADD COLUMN IF NOT EXISTS pay_group_id uuid REFERENCES public.pay_groups(id),
  ADD COLUMN IF NOT EXISTS benefit_eligibility_class text,
  ADD COLUMN IF NOT EXISTS original_hire_date date,
  ADD COLUMN IF NOT EXISTS rehire_date date,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS termination_date date,
  ADD COLUMN IF NOT EXISTS termination_reason text;

ALTER TABLE public.compensation_records
  ADD COLUMN IF NOT EXISTS standard_hours numeric(6,2),
  ADD COLUMN IF NOT EXISTS overtime_eligible boolean DEFAULT true;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billing_period_start date,
  ADD COLUMN IF NOT EXISTS billing_period_end date,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz;

ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS line_type text DEFAULT 'fee',
  ADD COLUMN IF NOT EXISTS reference_type text,
  ADD COLUMN IF NOT EXISTS reference_id uuid,
  ADD COLUMN IF NOT EXISTS employee_id uuid,
  ADD COLUMN IF NOT EXISTS payroll_run_employee_id uuid;

-- ============================================
-- 8. ACTIVE-RECORD UNIQUE CONSTRAINTS
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS uniq_employment_active
  ON public.employment_records(employee_id, company_id) WHERE end_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_client_sui_rate_active
  ON public.client_sui_rates(company_id, state_code) WHERE end_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wc_assignment_active
  ON public.employee_wc_assignments(employee_id) WHERE end_date IS NULL AND is_active = true;

-- ============================================
-- 9. RLS — enable + policies (idempotent)
-- ============================================
ALTER TABLE public.pay_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_employee_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_employee_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_employee_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wc_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wc_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wc_code_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_tax_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_direct_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sa_all_pay_groups ON public.pay_groups;
CREATE POLICY sa_all_pay_groups ON public.pay_groups FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_pay_schedules ON public.pay_schedules;
CREATE POLICY sa_all_pay_schedules ON public.pay_schedules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_pre_earnings ON public.payroll_run_employee_earnings;
CREATE POLICY sa_all_pre_earnings ON public.payroll_run_employee_earnings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_pre_deductions ON public.payroll_run_employee_deductions;
CREATE POLICY sa_all_pre_deductions ON public.payroll_run_employee_deductions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_pre_taxes ON public.payroll_run_employee_taxes;
CREATE POLICY sa_all_pre_taxes ON public.payroll_run_employee_taxes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_pre_contrib ON public.payroll_run_employee_contributions;
CREATE POLICY sa_all_pre_contrib ON public.payroll_run_employee_contributions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_wc_policies ON public.wc_policies;
CREATE POLICY sa_all_wc_policies ON public.wc_policies FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_wc_codes ON public.wc_codes;
CREATE POLICY sa_all_wc_codes ON public.wc_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_wc_code_rates ON public.wc_code_rates;
CREATE POLICY sa_all_wc_code_rates ON public.wc_code_rates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_cta ON public.company_tax_accounts;
CREATE POLICY sa_all_cta ON public.company_tax_accounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_company_locations ON public.company_locations;
CREATE POLICY sa_all_company_locations ON public.company_locations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_employee_addresses ON public.employee_addresses;
CREATE POLICY sa_all_employee_addresses ON public.employee_addresses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_employee_deductions ON public.employee_deductions;
CREATE POLICY sa_all_employee_deductions ON public.employee_deductions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));
DROP POLICY IF EXISTS sa_all_edd ON public.employee_direct_deposits;
CREATE POLICY sa_all_edd ON public.employee_direct_deposits FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS ca_read_own_pay_groups ON public.pay_groups;
CREATE POLICY ca_read_own_pay_groups ON public.pay_groups FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));
DROP POLICY IF EXISTS ca_read_own_pay_schedules ON public.pay_schedules;
CREATE POLICY ca_read_own_pay_schedules ON public.pay_schedules FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND pay_group_id IN (
    SELECT id FROM public.pay_groups WHERE company_id::text = get_user_company(auth.uid())
  ));
DROP POLICY IF EXISTS ca_read_own_wc_policies ON public.wc_policies;
CREATE POLICY ca_read_own_wc_policies ON public.wc_policies FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));
DROP POLICY IF EXISTS ca_read_wc_codes ON public.wc_codes;
CREATE POLICY ca_read_wc_codes ON public.wc_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'));
DROP POLICY IF EXISTS ca_read_wc_code_rates ON public.wc_code_rates;
CREATE POLICY ca_read_wc_code_rates ON public.wc_code_rates FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'));
DROP POLICY IF EXISTS ca_read_own_cta ON public.company_tax_accounts;
CREATE POLICY ca_read_own_cta ON public.company_tax_accounts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));
DROP POLICY IF EXISTS ca_read_own_company_locations ON public.company_locations;
CREATE POLICY ca_read_own_company_locations ON public.company_locations FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));
DROP POLICY IF EXISTS ca_read_own_employee_deductions ON public.employee_deductions;
CREATE POLICY ca_read_own_employee_deductions ON public.employee_deductions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));
DROP POLICY IF EXISTS ca_read_own_employee_addresses ON public.employee_addresses;
CREATE POLICY ca_read_own_employee_addresses ON public.employee_addresses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND employee_id IN (
    SELECT id FROM public.employees WHERE company_id::text = get_user_company(auth.uid())
  ));
DROP POLICY IF EXISTS ca_read_own_edd ON public.employee_direct_deposits;
CREATE POLICY ca_read_own_edd ON public.employee_direct_deposits FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND employee_id IN (
    SELECT id FROM public.employees WHERE company_id::text = get_user_company(auth.uid())
  ));

DROP POLICY IF EXISTS emp_read_own_addresses ON public.employee_addresses;
CREATE POLICY emp_read_own_addresses ON public.employee_addresses FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS emp_read_own_deductions ON public.employee_deductions;
CREATE POLICY emp_read_own_deductions ON public.employee_deductions FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS emp_read_own_edd ON public.employee_direct_deposits;
CREATE POLICY emp_read_own_edd ON public.employee_direct_deposits FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- ============================================
-- 10. updated_at triggers (idempotent)
-- ============================================
DROP TRIGGER IF EXISTS trg_pay_groups_updated ON public.pay_groups;
CREATE TRIGGER trg_pay_groups_updated BEFORE UPDATE ON public.pay_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_pay_schedules_updated ON public.pay_schedules;
CREATE TRIGGER trg_pay_schedules_updated BEFORE UPDATE ON public.pay_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_wc_policies_updated ON public.wc_policies;
CREATE TRIGGER trg_wc_policies_updated BEFORE UPDATE ON public.wc_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_cta_updated ON public.company_tax_accounts;
CREATE TRIGGER trg_cta_updated BEFORE UPDATE ON public.company_tax_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_company_locations_updated ON public.company_locations;
CREATE TRIGGER trg_company_locations_updated BEFORE UPDATE ON public.company_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_employee_addresses_updated ON public.employee_addresses;
CREATE TRIGGER trg_employee_addresses_updated BEFORE UPDATE ON public.employee_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_employee_deductions_updated ON public.employee_deductions;
CREATE TRIGGER trg_employee_deductions_updated BEFORE UPDATE ON public.employee_deductions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_edd_updated ON public.employee_direct_deposits;
CREATE TRIGGER trg_edd_updated BEFORE UPDATE ON public.employee_direct_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
