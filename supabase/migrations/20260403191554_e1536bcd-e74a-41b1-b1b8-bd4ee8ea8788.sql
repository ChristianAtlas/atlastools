
-- 1. Add new enum values to payroll_run_status
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'upcoming';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'open_for_timecards';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'awaiting_timecard_approval';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'timecards_approved';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'awaiting_approval';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'auto_approved';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'late_submission';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'expedited_funding_required';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'expedited_processing';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'manual_check_required';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'funded';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.payroll_run_status ADD VALUE IF NOT EXISTS 'blocked';

-- 2. Add new columns to payroll_runs
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS approval_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS timecard_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS expedited_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS funding_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invoice_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS auto_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_expedited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_manual_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exception_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_check_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_score integer NOT NULL DEFAULT 0;

-- 3. Create timecards table
CREATE TABLE IF NOT EXISTS public.timecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  regular_hours numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  pto_hours numeric NOT NULL DEFAULT 0,
  holiday_hours numeric NOT NULL DEFAULT 0,
  total_hours numeric GENERATED ALWAYS AS (regular_hours + overtime_hours + pto_hours + holiday_hours) STORED,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  submitted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, payroll_run_id)
);

ALTER TABLE public.timecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_timecards" ON public.timecards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_all_own_timecards" ON public.timecards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = get_user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = get_user_company(auth.uid()));

CREATE POLICY "emp_read_own_timecards" ON public.timecards FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "emp_insert_own_timecards" ON public.timecards FOR INSERT TO authenticated
  WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "emp_update_own_timecards" ON public.timecards FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND approval_status = 'pending');

CREATE TRIGGER update_timecards_updated_at BEFORE UPDATE ON public.timecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. Create funding_events table
CREATE TABLE IF NOT EXISTS public.funding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'ach',
  amount_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  confirmed_by uuid,
  wire_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_funding_events" ON public.funding_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_funding_events" ON public.funding_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = get_user_company(auth.uid()));

CREATE TRIGGER update_funding_events_updated_at BEFORE UPDATE ON public.funding_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Create us_holidays table
CREATE TABLE IF NOT EXISTS public.us_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL UNIQUE,
  name text NOT NULL,
  is_banking_holiday boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.us_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_holidays" ON public.us_holidays FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sa_manage_holidays" ON public.us_holidays FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 6. Create payroll_schedules table
CREATE TABLE IF NOT EXISTS public.payroll_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pay_frequency public.pay_frequency NOT NULL,
  auto_approve_enabled boolean NOT NULL DEFAULT false,
  timecard_deadline_day text DEFAULT 'monday',
  timecard_deadline_time text DEFAULT '10:00',
  approval_deadline_days_before integer DEFAULT 4,
  approval_deadline_time text DEFAULT '17:00',
  expedited_wire_deadline_day text DEFAULT 'thursday',
  expedited_wire_deadline_time text DEFAULT '13:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, pay_frequency)
);

ALTER TABLE public.payroll_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_payroll_schedules" ON public.payroll_schedules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_payroll_schedules" ON public.payroll_schedules FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id)::text = get_user_company(auth.uid()));

CREATE TRIGGER update_payroll_schedules_updated_at BEFORE UPDATE ON public.payroll_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. Update the payroll status transition trigger to support new statuses
CREATE OR REPLACE FUNCTION public.validate_payroll_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  valid boolean := false;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status::text
    WHEN 'upcoming' THEN
      valid := NEW.status IN ('open', 'open_for_timecards', 'draft', 'voided');
    WHEN 'open' THEN
      valid := NEW.status IN ('awaiting_approval', 'time_review', 'voided');
    WHEN 'open_for_timecards' THEN
      valid := NEW.status IN ('awaiting_timecard_approval', 'voided');
    WHEN 'awaiting_timecard_approval' THEN
      valid := NEW.status IN ('timecards_approved', 'open_for_timecards', 'voided');
    WHEN 'timecards_approved' THEN
      valid := NEW.status IN ('awaiting_approval', 'editing', 'voided');
    WHEN 'awaiting_approval' THEN
      valid := NEW.status IN ('auto_approved', 'pending_client_approval', 'late_submission', 'voided');
    WHEN 'auto_approved' THEN
      valid := NEW.status IN ('funding', 'funded', 'processing', 'voided');
    WHEN 'late_submission' THEN
      valid := NEW.status IN ('expedited_funding_required', 'manual_check_required', 'pending_client_approval', 'voided');
    WHEN 'expedited_funding_required' THEN
      valid := NEW.status IN ('expedited_processing', 'manual_check_required', 'voided');
    WHEN 'expedited_processing' THEN
      valid := NEW.status IN ('processing', 'funded', 'voided');
    WHEN 'manual_check_required' THEN
      valid := NEW.status IN ('processing', 'completed', 'voided');
    WHEN 'blocked' THEN
      valid := NEW.status IN ('draft', 'open', 'open_for_timecards', 'voided');
    WHEN 'funded' THEN
      valid := NEW.status IN ('paid', 'processing', 'voided');
    WHEN 'paid' THEN
      valid := NEW.status IN ('completed', 'voided', 'reversed');
    -- Keep existing transitions
    WHEN 'draft' THEN
      valid := NEW.status IN ('time_review', 'open', 'open_for_timecards', 'upcoming', 'voided');
    WHEN 'time_review' THEN
      valid := NEW.status IN ('editing', 'draft');
    WHEN 'editing' THEN
      valid := NEW.status IN ('preview', 'time_review');
    WHEN 'preview' THEN
      valid := NEW.status IN ('pending_client_approval', 'editing');
    WHEN 'pending_client_approval' THEN
      valid := NEW.status IN ('client_approved', 'editing', 'voided');
    WHEN 'client_approved' THEN
      valid := NEW.status IN ('funding', 'funded', 'voided');
    WHEN 'funding' THEN
      valid := NEW.status IN ('pending_admin_approval', 'funded', 'client_approved');
    WHEN 'pending_admin_approval' THEN
      valid := NEW.status IN ('admin_approved', 'editing', 'voided');
    WHEN 'admin_approved' THEN
      valid := NEW.status IN ('submitting', 'voided');
    WHEN 'submitting' THEN
      valid := NEW.status IN ('submitted', 'failed');
    WHEN 'submitted' THEN
      valid := NEW.status IN ('processing', 'failed');
    WHEN 'processing' THEN
      valid := NEW.status IN ('completed', 'funded', 'paid', 'failed');
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
$function$;

-- 8. Seed US banking holidays for 2025-2027
INSERT INTO public.us_holidays (holiday_date, name) VALUES
  ('2025-01-01', 'New Year''s Day'),
  ('2025-01-20', 'Martin Luther King Jr. Day'),
  ('2025-02-17', 'Presidents'' Day'),
  ('2025-05-26', 'Memorial Day'),
  ('2025-06-19', 'Juneteenth'),
  ('2025-07-04', 'Independence Day'),
  ('2025-09-01', 'Labor Day'),
  ('2025-10-13', 'Columbus Day'),
  ('2025-11-11', 'Veterans Day'),
  ('2025-11-27', 'Thanksgiving Day'),
  ('2025-12-25', 'Christmas Day'),
  ('2026-01-01', 'New Year''s Day'),
  ('2026-01-19', 'Martin Luther King Jr. Day'),
  ('2026-02-16', 'Presidents'' Day'),
  ('2026-05-25', 'Memorial Day'),
  ('2026-06-19', 'Juneteenth'),
  ('2026-07-03', 'Independence Day (observed)'),
  ('2026-09-07', 'Labor Day'),
  ('2026-10-12', 'Columbus Day'),
  ('2026-11-11', 'Veterans Day'),
  ('2026-11-26', 'Thanksgiving Day'),
  ('2026-12-25', 'Christmas Day'),
  ('2027-01-01', 'New Year''s Day'),
  ('2027-01-18', 'Martin Luther King Jr. Day'),
  ('2027-02-15', 'Presidents'' Day'),
  ('2027-05-31', 'Memorial Day'),
  ('2027-06-18', 'Juneteenth (observed)'),
  ('2027-07-05', 'Independence Day (observed)'),
  ('2027-09-06', 'Labor Day'),
  ('2027-10-11', 'Columbus Day'),
  ('2027-11-11', 'Veterans Day'),
  ('2027-11-25', 'Thanksgiving Day'),
  ('2027-12-24', 'Christmas Day (observed)')
ON CONFLICT (holiday_date) DO NOTHING;
