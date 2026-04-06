
-- Workers' Comp Policies
CREATE TABLE public.workers_comp_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  carrier_name text NOT NULL,
  policy_number text NOT NULL,
  effective_date date NOT NULL,
  expiration_date date NOT NULL,
  states_covered text[] NOT NULL DEFAULT '{}',
  experience_mod numeric NOT NULL DEFAULT 1.0,
  is_monopolistic boolean NOT NULL DEFAULT false,
  minimum_premium_cents bigint DEFAULT 0,
  markup_type text NOT NULL DEFAULT 'percentage', -- percentage, flat, blended
  markup_rate numeric NOT NULL DEFAULT 0.015,
  markup_flat_cents bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active, pending, expired, archived
  notes text,
  state_fund_account text,
  reporting_frequency text, -- monthly, quarterly, annual
  last_report_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workers_comp_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_wc_policies" ON public.workers_comp_policies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_wc_policies" ON public.workers_comp_policies
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

CREATE TRIGGER update_wc_policies_updated_at
  BEFORE UPDATE ON public.workers_comp_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audit_wc_policies
  AFTER INSERT OR UPDATE OR DELETE ON public.workers_comp_policies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Workers' Comp Codes
CREATE TABLE public.workers_comp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.workers_comp_policies(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  state text NOT NULL,
  rate_per_hundred numeric NOT NULL DEFAULT 0,
  effective_date date NOT NULL,
  expiration_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, code, state, effective_date)
);

ALTER TABLE public.workers_comp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_wc_codes" ON public.workers_comp_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_wc_codes" ON public.workers_comp_codes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

CREATE TRIGGER update_wc_codes_updated_at
  BEFORE UPDATE ON public.workers_comp_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audit_wc_codes
  AFTER INSERT OR UPDATE OR DELETE ON public.workers_comp_codes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Employee WC Assignments
CREATE TABLE public.employee_wc_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wc_code_id uuid NOT NULL REFERENCES public.workers_comp_codes(id),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_wc_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_wc_assignments" ON public.employee_wc_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_wc_assignments" ON public.employee_wc_assignments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

CREATE TRIGGER update_wc_assignments_updated_at
  BEFORE UPDATE ON public.employee_wc_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audit_wc_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_wc_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- WC Payroll Calculations
CREATE TABLE public.wc_payroll_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  wc_code_id uuid NOT NULL REFERENCES public.workers_comp_codes(id),
  wc_code text NOT NULL,
  wages_cents bigint NOT NULL DEFAULT 0,
  rate_per_hundred numeric NOT NULL DEFAULT 0,
  premium_cents bigint NOT NULL DEFAULT 0,
  markup_rate numeric NOT NULL DEFAULT 0,
  markup_cents bigint NOT NULL DEFAULT 0,
  total_charge_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wc_payroll_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_wc_payroll_calcs" ON public.wc_payroll_calculations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_wc_payroll_calcs" ON public.wc_payroll_calculations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

-- WC Invoice Items (aggregated per payroll run per client)
CREATE TABLE public.wc_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  invoice_id uuid REFERENCES public.invoices(id),
  base_premium_cents bigint NOT NULL DEFAULT 0,
  markup_cents bigint NOT NULL DEFAULT 0,
  total_charge_cents bigint NOT NULL DEFAULT 0,
  employee_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wc_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_wc_invoice_items" ON public.wc_invoice_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_wc_invoice_items" ON public.wc_invoice_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

-- Indexes
CREATE INDEX idx_wc_policies_company ON public.workers_comp_policies(company_id);
CREATE INDEX idx_wc_codes_policy ON public.workers_comp_codes(policy_id);
CREATE INDEX idx_wc_codes_company ON public.workers_comp_codes(company_id);
CREATE INDEX idx_wc_assignments_employee ON public.employee_wc_assignments(employee_id);
CREATE INDEX idx_wc_assignments_company ON public.employee_wc_assignments(company_id);
CREATE INDEX idx_wc_payroll_calcs_run ON public.wc_payroll_calculations(payroll_run_id);
CREATE INDEX idx_wc_invoice_items_run ON public.wc_invoice_items(payroll_run_id);
