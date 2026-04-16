
-- Drop dependent policies
DROP POLICY IF EXISTS ca_read_own_invoices ON public.invoices;
DROP POLICY IF EXISTS ca_read_own_payroll_markups ON public.payroll_markups;

-- Convert type
ALTER TABLE public.invoices
  ALTER COLUMN company_id TYPE uuid USING company_id::uuid;

-- Recreate policies with explicit text cast (get_user_company returns text)
CREATE POLICY ca_read_own_invoices ON public.invoices
  FOR SELECT
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id::text = get_user_company(auth.uid())
  );

CREATE POLICY ca_read_own_payroll_markups ON public.payroll_markups
  FOR SELECT
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id::text = get_user_company(auth.uid())
    )
  );

-- client_sui_rates additions
ALTER TABLE public.client_sui_rates
  ADD COLUMN IF NOT EXISTS wage_base_cents bigint,
  ADD COLUMN IF NOT EXISTS rate_source text DEFAULT 'client'
    CHECK (rate_source IN ('client','peo','new_employer','successor','merged'));

-- employment_records additions + backfill
ALTER TABLE public.employment_records
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS pay_type text;

UPDATE public.employment_records
  SET job_title = COALESCE(job_title, title),
      employment_status = COALESCE(employment_status, status::text),
      supervisor_id = COALESCE(supervisor_id, manager_id);

-- employee_deductions effective dating
ALTER TABLE public.employee_deductions
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS employment_record_id uuid REFERENCES public.employment_records(id);

UPDATE public.employee_deductions
  SET effective_date = COALESCE(effective_date, start_date, CURRENT_DATE);

ALTER TABLE public.employee_deductions
  ALTER COLUMN effective_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN effective_date SET NOT NULL;

-- employee_direct_deposits effective dating
ALTER TABLE public.employee_direct_deposits
  ADD COLUMN IF NOT EXISTS effective_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employment_record ON public.employee_deductions(employment_record_id);
CREATE INDEX IF NOT EXISTS idx_employment_records_supervisor ON public.employment_records(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_client_sui_rates_company_state ON public.client_sui_rates(company_id, state_code);
