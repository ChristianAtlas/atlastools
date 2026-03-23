
-- Payroll run status enum (full state machine)
CREATE TYPE public.payroll_run_status AS ENUM (
  'draft',
  'time_review',
  'editing',
  'preview',
  'pending_client_approval',
  'client_approved',
  'funding',
  'pending_admin_approval',
  'admin_approved',
  'submitting',
  'submitted',
  'processing',
  'completed',
  'failed',
  'voided',
  'reversed'
);

-- Payroll run type
CREATE TYPE public.payroll_run_type AS ENUM (
  'regular',
  'off_cycle',
  'bonus',
  'commission',
  'reimbursement',
  'correction'
);

-- Pay frequency
CREATE TYPE public.pay_frequency AS ENUM (
  'weekly',
  'biweekly',
  'semimonthly',
  'monthly'
);

-- Payroll employee line status
CREATE TYPE public.payroll_employee_status AS ENUM (
  'pending',
  'included',
  'excluded',
  'error',
  'completed'
);

-- ═══════════════════════════════════════════════
-- payroll_runs — one row per payroll cycle/run
-- ═══════════════════════════════════════════════
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),

  -- Run metadata
  run_type public.payroll_run_type NOT NULL DEFAULT 'regular',
  status public.payroll_run_status NOT NULL DEFAULT 'draft',
  pay_frequency public.pay_frequency NOT NULL DEFAULT 'biweekly',

  -- Pay period
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  pay_date date NOT NULL,
  check_date date,

  -- Deadline enforcement
  submission_deadline timestamptz,  -- Tuesday 6PM EST for Friday pay
  submitted_at timestamptz,

  -- Totals (denormalized for fast reads, recomputed on edits)
  employee_count integer NOT NULL DEFAULT 0,
  gross_pay_cents bigint NOT NULL DEFAULT 0,
  net_pay_cents bigint NOT NULL DEFAULT 0,
  employer_taxes_cents bigint NOT NULL DEFAULT 0,
  employer_benefits_cents bigint NOT NULL DEFAULT 0,
  workers_comp_cents bigint NOT NULL DEFAULT 0,
  total_employer_cost_cents bigint NOT NULL DEFAULT 0,

  -- Approval tracking
  client_approved_by uuid,
  client_approved_at timestamptz,
  admin_approved_by uuid,
  admin_approved_at timestamptz,

  -- Provider integration
  provider_batch_id text,          -- Everee batch ID
  provider_status text,            -- raw status from provider
  provider_response jsonb,

  -- Correction / void reference
  parent_run_id uuid REFERENCES public.payroll_runs(id),
  void_reason text,
  voided_by uuid,
  voided_at timestamptz,

  -- Metadata
  created_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz            -- soft delete
);

-- Indexes
CREATE INDEX idx_payroll_runs_company ON public.payroll_runs (company_id, pay_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_payroll_runs_status ON public.payroll_runs (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payroll_runs_pay_date ON public.payroll_runs (pay_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payroll_runs_deadline ON public.payroll_runs (submission_deadline) WHERE status NOT IN ('completed', 'voided', 'reversed', 'failed');

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER trg_payroll_runs_updated_at
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════
-- payroll_run_employees — one row per employee per run
-- ═══════════════════════════════════════════════
CREATE TABLE public.payroll_run_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id text NOT NULL,        -- references future employees table
  company_id uuid NOT NULL REFERENCES public.companies(id),

  status public.payroll_employee_status NOT NULL DEFAULT 'pending',

  -- Hours
  regular_hours numeric(8,2) NOT NULL DEFAULT 0,
  overtime_hours numeric(8,2) NOT NULL DEFAULT 0,
  pto_hours numeric(8,2) NOT NULL DEFAULT 0,
  holiday_hours numeric(8,2) NOT NULL DEFAULT 0,

  -- Earnings (all in cents)
  regular_pay_cents bigint NOT NULL DEFAULT 0,
  overtime_pay_cents bigint NOT NULL DEFAULT 0,
  bonus_cents bigint NOT NULL DEFAULT 0,
  commission_cents bigint NOT NULL DEFAULT 0,
  reimbursement_cents bigint NOT NULL DEFAULT 0,
  other_earnings_cents bigint NOT NULL DEFAULT 0,
  gross_pay_cents bigint NOT NULL DEFAULT 0,

  -- Deductions (employee-side)
  federal_tax_cents bigint NOT NULL DEFAULT 0,
  state_tax_cents bigint NOT NULL DEFAULT 0,
  local_tax_cents bigint NOT NULL DEFAULT 0,
  social_security_cents bigint NOT NULL DEFAULT 0,
  medicare_cents bigint NOT NULL DEFAULT 0,
  benefits_deduction_cents bigint NOT NULL DEFAULT 0,
  retirement_deduction_cents bigint NOT NULL DEFAULT 0,
  garnishment_cents bigint NOT NULL DEFAULT 0,
  other_deductions_cents bigint NOT NULL DEFAULT 0,
  total_deductions_cents bigint NOT NULL DEFAULT 0,

  net_pay_cents bigint NOT NULL DEFAULT 0,

  -- Employer-side costs
  employer_fica_cents bigint NOT NULL DEFAULT 0,
  employer_futa_cents bigint NOT NULL DEFAULT 0,
  employer_sui_cents bigint NOT NULL DEFAULT 0,
  employer_benefits_cents bigint NOT NULL DEFAULT 0,
  workers_comp_cents bigint NOT NULL DEFAULT 0,
  total_employer_cost_cents bigint NOT NULL DEFAULT 0,

  -- Provider mapping
  provider_employee_id text,
  provider_line_id text,
  provider_status text,

  -- Metadata
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pre_run ON public.payroll_run_employees (payroll_run_id);
CREATE INDEX idx_pre_employee ON public.payroll_run_employees (employee_id);
CREATE UNIQUE INDEX idx_pre_run_employee ON public.payroll_run_employees (payroll_run_id, employee_id);

-- Updated_at trigger
CREATE TRIGGER trg_pre_updated_at
  BEFORE UPDATE ON public.payroll_run_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_employees ENABLE ROW LEVEL SECURITY;

-- payroll_runs: Super admins — full access
CREATE POLICY "sa_all_payroll_runs"
  ON public.payroll_runs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- payroll_runs: Client admins — read + limited update (approve) for own company
CREATE POLICY "ca_read_own_payroll_runs"
  ON public.payroll_runs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

CREATE POLICY "ca_update_own_payroll_runs"
  ON public.payroll_runs FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- payroll_runs: Employees — read own company runs only
CREATE POLICY "emp_read_own_payroll_runs"
  ON public.payroll_runs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employee')
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- payroll_run_employees: Super admins — full access
CREATE POLICY "sa_all_pre"
  ON public.payroll_run_employees FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- payroll_run_employees: Client admins — read own company
CREATE POLICY "ca_read_own_pre"
  ON public.payroll_run_employees FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- payroll_run_employees: Employees — read only own lines
CREATE POLICY "emp_read_own_pre"
  ON public.payroll_run_employees FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employee')
    AND employee_id = auth.uid()::text
  );

-- ═══════════════════════════════════════════════
-- Payroll state transition validation function
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.validate_payroll_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  valid boolean := false;
BEGIN
  -- Allow if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status::text
    WHEN 'draft' THEN
      valid := NEW.status IN ('time_review', 'voided');
    WHEN 'time_review' THEN
      valid := NEW.status IN ('editing', 'draft');
    WHEN 'editing' THEN
      valid := NEW.status IN ('preview', 'time_review');
    WHEN 'preview' THEN
      valid := NEW.status IN ('pending_client_approval', 'editing');
    WHEN 'pending_client_approval' THEN
      valid := NEW.status IN ('client_approved', 'editing', 'voided');
    WHEN 'client_approved' THEN
      valid := NEW.status IN ('funding', 'voided');
    WHEN 'funding' THEN
      valid := NEW.status IN ('pending_admin_approval', 'client_approved');
    WHEN 'pending_admin_approval' THEN
      valid := NEW.status IN ('admin_approved', 'editing', 'voided');
    WHEN 'admin_approved' THEN
      valid := NEW.status IN ('submitting', 'voided');
    WHEN 'submitting' THEN
      valid := NEW.status IN ('submitted', 'failed');
    WHEN 'submitted' THEN
      valid := NEW.status IN ('processing', 'failed');
    WHEN 'processing' THEN
      valid := NEW.status IN ('completed', 'failed');
    WHEN 'completed' THEN
      valid := NEW.status IN ('voided', 'reversed');
    WHEN 'failed' THEN
      valid := NEW.status IN ('draft', 'voided');
    ELSE
      valid := false;
  END CASE;

  IF NOT valid THEN
    RAISE EXCEPTION 'Invalid payroll status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payroll_status_transition
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_payroll_status_transition();
