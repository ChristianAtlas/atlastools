-- ============================================================
-- PTO System: policies, balance ledger, requests
-- ============================================================

-- Enums
CREATE TYPE public.pto_type AS ENUM ('vacation', 'sick', 'personal', 'bereavement', 'jury_duty', 'holiday');
CREATE TYPE public.pto_accrual_frequency AS ENUM ('per_pay_period', 'monthly', 'annually', 'upfront');
CREATE TYPE public.pto_request_status AS ENUM ('pending', 'approved', 'denied', 'cancelled', 'taken');
CREATE TYPE public.pto_ledger_type AS ENUM ('accrual', 'used', 'adjustment', 'carryover', 'forfeited', 'payout');

-- ============================================================
-- pto_policies: company-level PTO policy definitions
-- ============================================================
CREATE TABLE public.pto_policies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pto_type      pto_type NOT NULL DEFAULT 'vacation',
  name          text NOT NULL,
  accrual_rate  numeric NOT NULL DEFAULT 0,           -- hours per accrual period
  accrual_frequency pto_accrual_frequency NOT NULL DEFAULT 'per_pay_period',
  max_accrual_hours numeric NOT NULL DEFAULT 0,       -- cap
  max_carryover_hours numeric NOT NULL DEFAULT 0,
  waiting_period_days integer NOT NULL DEFAULT 0,     -- days before eligible
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pto_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY sa_all_pto_policies ON public.pto_policies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY ca_read_own_pto_policies ON public.pto_policies
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));

CREATE POLICY emp_read_own_pto_policies ON public.pto_policies
  FOR SELECT TO authenticated
  USING (company_id::text = get_user_company(auth.uid()));

-- ============================================================
-- pto_balance_ledger: append-only ledger for balance tracking
-- ============================================================
CREATE TABLE public.pto_balance_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_id     uuid NOT NULL REFERENCES public.pto_policies(id) ON DELETE CASCADE,
  entry_type    pto_ledger_type NOT NULL,
  hours         numeric NOT NULL,                     -- positive for accrual, negative for usage
  balance_after numeric NOT NULL,                     -- running balance after this entry
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_id  uuid,                                 -- FK to pto_requests or payroll_run
  notes         text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pto_balance_ledger ENABLE ROW LEVEL SECURITY;

-- Append-only: no UPDATE or DELETE
CREATE POLICY sa_all_pto_ledger ON public.pto_balance_ledger
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY ca_read_own_pto_ledger ON public.pto_balance_ledger
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));

CREATE POLICY ca_insert_own_pto_ledger ON public.pto_balance_ledger
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));

CREATE POLICY emp_read_own_pto_ledger ON public.pto_balance_ledger
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- ============================================================
-- pto_requests: time-off requests with approval workflow
-- ============================================================
CREATE TABLE public.pto_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_id     uuid NOT NULL REFERENCES public.pto_policies(id) ON DELETE CASCADE,
  status        pto_request_status NOT NULL DEFAULT 'pending',
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  hours         numeric NOT NULL,                     -- total requested hours
  reason        text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  review_notes  text,
  cancelled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pto_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY sa_all_pto_requests ON public.pto_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY ca_all_own_pto_requests ON public.pto_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'client_admin') AND company_id::text = get_user_company(auth.uid()));

CREATE POLICY emp_read_own_pto_requests ON public.pto_requests
  FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY emp_insert_own_pto_requests ON public.pto_requests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_pto_policies_updated_at BEFORE UPDATE ON public.pto_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pto_requests_updated_at BEFORE UPDATE ON public.pto_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit triggers
CREATE TRIGGER trg_audit_pto_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.pto_requests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER trg_audit_pto_balance_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.pto_balance_ledger
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Indexes
CREATE INDEX idx_pto_policies_company ON public.pto_policies(company_id);
CREATE INDEX idx_pto_ledger_employee ON public.pto_balance_ledger(employee_id);
CREATE INDEX idx_pto_ledger_policy ON public.pto_balance_ledger(policy_id);
CREATE INDEX idx_pto_requests_employee ON public.pto_requests(employee_id);
CREATE INDEX idx_pto_requests_company_status ON public.pto_requests(company_id, status);
CREATE INDEX idx_pto_requests_dates ON public.pto_requests(start_date, end_date);