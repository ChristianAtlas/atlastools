-- Step 1: nullable columns + indexes
ALTER TABLE public.payroll_run_employees
  ADD COLUMN IF NOT EXISTS employment_record_id uuid REFERENCES public.employment_records(id);
ALTER TABLE public.compensation_records
  ADD COLUMN IF NOT EXISTS employment_record_id uuid REFERENCES public.employment_records(id);
ALTER TABLE public.employee_wc_assignments
  ADD COLUMN IF NOT EXISTS employment_record_id uuid REFERENCES public.employment_records(id);
ALTER TABLE public.external_benefit_deductions
  ADD COLUMN IF NOT EXISTS employment_record_id uuid REFERENCES public.employment_records(id),
  ADD COLUMN IF NOT EXISTS effective_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date date;

CREATE INDEX IF NOT EXISTS idx_pre_employment_record      ON public.payroll_run_employees(employment_record_id);
CREATE INDEX IF NOT EXISTS idx_comp_employment_record     ON public.compensation_records(employment_record_id);
CREATE INDEX IF NOT EXISTS idx_wcassign_employment_record ON public.employee_wc_assignments(employment_record_id);
CREATE INDEX IF NOT EXISTS idx_extben_employment_record   ON public.external_benefit_deductions(employment_record_id);

-- Step 2: mapping tables
DROP TABLE IF EXISTS public._b2_map_compensation_records;
DROP TABLE IF EXISTS public._b2_map_employee_deductions;
DROP TABLE IF EXISTS public._b2_map_payroll_run_employees;
DROP TABLE IF EXISTS public._b2_map_employee_wc_assignments;
DROP TABLE IF EXISTS public._b2_map_external_benefit_deductions;

CREATE TABLE public._b2_map_compensation_records           (source_id uuid PRIMARY KEY, candidate_er_id uuid, match_count int NOT NULL DEFAULT 0, match_strategy text NOT NULL, derived_company_id uuid, derived_date date, notes text);
CREATE TABLE public._b2_map_employee_deductions            (source_id uuid PRIMARY KEY, candidate_er_id uuid, match_count int NOT NULL DEFAULT 0, match_strategy text NOT NULL, derived_company_id uuid, derived_date date, notes text);
CREATE TABLE public._b2_map_payroll_run_employees          (source_id uuid PRIMARY KEY, candidate_er_id uuid, match_count int NOT NULL DEFAULT 0, match_strategy text NOT NULL, derived_company_id uuid, derived_date date, notes text);
CREATE TABLE public._b2_map_employee_wc_assignments        (source_id uuid PRIMARY KEY, candidate_er_id uuid, match_count int NOT NULL DEFAULT 0, match_strategy text NOT NULL, derived_company_id uuid, derived_date date, notes text);
CREATE TABLE public._b2_map_external_benefit_deductions    (source_id uuid PRIMARY KEY, candidate_er_id uuid, match_count int NOT NULL DEFAULT 0, match_strategy text NOT NULL, derived_company_id uuid, derived_date date, notes text);

-- Build candidate maps
WITH cand AS (
  SELECT t.id AS source_id, t.company_id AS derived_company_id, t.effective_date AS derived_date, er.id AS er_id
  FROM public.compensation_records t
  LEFT JOIN public.employment_records er
    ON er.employee_id = t.employee_id
   AND er.company_id  = t.company_id
   AND er.effective_date <= t.effective_date
   AND (er.end_date IS NULL OR er.end_date >= t.effective_date)
), counted AS (SELECT source_id, derived_company_id, derived_date, er_id, count(er_id) OVER (PARTITION BY source_id) AS c FROM cand)
INSERT INTO public._b2_map_compensation_records (source_id, candidate_er_id, match_count, match_strategy, derived_company_id, derived_date)
SELECT DISTINCT ON (source_id) source_id,
  CASE WHEN c=1 THEN er_id END, c::int,
  CASE WHEN c=1 THEN 'unique' WHEN c>1 THEN 'ambiguous' ELSE 'orphan' END,
  derived_company_id, derived_date
FROM counted;

WITH cand AS (
  SELECT t.id AS source_id, t.company_id AS derived_company_id,
         COALESCE(t.effective_date, t.start_date, CURRENT_DATE) AS derived_date, er.id AS er_id
  FROM public.employee_deductions t
  LEFT JOIN public.employment_records er
    ON er.employee_id = t.employee_id
   AND er.company_id  = t.company_id
   AND er.effective_date <= COALESCE(t.effective_date, t.start_date, CURRENT_DATE)
   AND (er.end_date IS NULL OR er.end_date >= COALESCE(t.effective_date, t.start_date, CURRENT_DATE))
), counted AS (SELECT source_id, derived_company_id, derived_date, er_id, count(er_id) OVER (PARTITION BY source_id) AS c FROM cand)
INSERT INTO public._b2_map_employee_deductions (source_id, candidate_er_id, match_count, match_strategy, derived_company_id, derived_date)
SELECT DISTINCT ON (source_id) source_id,
  CASE WHEN c=1 THEN er_id END, c::int,
  CASE WHEN c=1 THEN 'unique' WHEN c>1 THEN 'ambiguous' ELSE 'orphan' END,
  derived_company_id, derived_date FROM counted;

-- payroll_run_employees: employee_id is TEXT — cast to uuid; use row.company_id and pay_period_end/pay_date
WITH cand AS (
  SELECT t.id AS source_id, t.company_id AS derived_company_id,
         COALESCE(pr.check_date, pr.pay_date, pr.pay_period_end, pr.created_at::date) AS derived_date,
         er.id AS er_id
  FROM public.payroll_run_employees t
  LEFT JOIN public.payroll_runs pr ON pr.id = t.payroll_run_id
  LEFT JOIN public.employment_records er
    ON er.employee_id::text = t.employee_id
   AND er.company_id = t.company_id
   AND er.effective_date <= COALESCE(pr.check_date, pr.pay_date, pr.pay_period_end, pr.created_at::date)
   AND (er.end_date IS NULL OR er.end_date >= COALESCE(pr.check_date, pr.pay_date, pr.pay_period_end, pr.created_at::date))
), counted AS (SELECT source_id, derived_company_id, derived_date, er_id, count(er_id) OVER (PARTITION BY source_id) AS c FROM cand)
INSERT INTO public._b2_map_payroll_run_employees (source_id, candidate_er_id, match_count, match_strategy, derived_company_id, derived_date)
SELECT DISTINCT ON (source_id) source_id,
  CASE WHEN c=1 THEN er_id END, c::int,
  CASE WHEN c=1 THEN 'unique' WHEN c>1 THEN 'ambiguous' ELSE 'orphan' END,
  derived_company_id, derived_date FROM counted;

-- employee_wc_assignments: company derived from wc_codes.company_id directly
WITH cand AS (
  SELECT t.id AS source_id, wc.company_id AS derived_company_id,
         COALESCE(t.effective_date, wc.effective_date, CURRENT_DATE) AS derived_date,
         er.id AS er_id
  FROM public.employee_wc_assignments t
  LEFT JOIN public.workers_comp_codes wc ON wc.id = t.wc_code_id
  LEFT JOIN public.employment_records er
    ON er.employee_id = t.employee_id
   AND er.company_id  = wc.company_id
   AND er.effective_date <= COALESCE(t.effective_date, wc.effective_date, CURRENT_DATE)
   AND (er.end_date IS NULL OR er.end_date >= COALESCE(t.effective_date, wc.effective_date, CURRENT_DATE))
), counted AS (SELECT source_id, derived_company_id, derived_date, er_id, count(er_id) OVER (PARTITION BY source_id) AS c FROM cand)
INSERT INTO public._b2_map_employee_wc_assignments (source_id, candidate_er_id, match_count, match_strategy, derived_company_id, derived_date)
SELECT DISTINCT ON (source_id) source_id,
  CASE WHEN c=1 THEN er_id END, c::int,
  CASE WHEN c=1 THEN 'unique' WHEN c>1 THEN 'ambiguous' ELSE 'orphan' END,
  derived_company_id, derived_date FROM counted;

WITH cand AS (
  SELECT t.id AS source_id, t.company_id AS derived_company_id,
         COALESCE(t.effective_date, CURRENT_DATE) AS derived_date, er.id AS er_id
  FROM public.external_benefit_deductions t
  LEFT JOIN public.employment_records er
    ON er.employee_id = t.employee_id
   AND er.company_id  = t.company_id
   AND er.effective_date <= COALESCE(t.effective_date, CURRENT_DATE)
   AND (er.end_date IS NULL OR er.end_date >= COALESCE(t.effective_date, CURRENT_DATE))
), counted AS (SELECT source_id, derived_company_id, derived_date, er_id, count(er_id) OVER (PARTITION BY source_id) AS c FROM cand)
INSERT INTO public._b2_map_external_benefit_deductions (source_id, candidate_er_id, match_count, match_strategy, derived_company_id, derived_date)
SELECT DISTINCT ON (source_id) source_id,
  CASE WHEN c=1 THEN er_id END, c::int,
  CASE WHEN c=1 THEN 'unique' WHEN c>1 THEN 'ambiguous' ELSE 'orphan' END,
  derived_company_id, derived_date FROM counted;

-- Step 4: apply unique matches
UPDATE public.compensation_records       t SET employment_record_id = m.candidate_er_id FROM public._b2_map_compensation_records       m WHERE m.source_id=t.id AND m.match_strategy='unique';
UPDATE public.employee_deductions        t SET employment_record_id = m.candidate_er_id FROM public._b2_map_employee_deductions        m WHERE m.source_id=t.id AND m.match_strategy='unique';
UPDATE public.payroll_run_employees      t SET employment_record_id = m.candidate_er_id FROM public._b2_map_payroll_run_employees      m WHERE m.source_id=t.id AND m.match_strategy='unique';
UPDATE public.employee_wc_assignments    t SET employment_record_id = m.candidate_er_id FROM public._b2_map_employee_wc_assignments    m WHERE m.source_id=t.id AND m.match_strategy='unique';
UPDATE public.external_benefit_deductions t SET employment_record_id = m.candidate_er_id FROM public._b2_map_external_benefit_deductions m WHERE m.source_id=t.id AND m.match_strategy='unique';

-- Step 5: quarantine orphans/ambiguous
DROP TABLE IF EXISTS public._b2_orphans_compensation_records;
DROP TABLE IF EXISTS public._b2_orphans_employee_deductions;
DROP TABLE IF EXISTS public._b2_orphans_payroll_run_employees;
DROP TABLE IF EXISTS public._b2_orphans_employee_wc_assignments;
DROP TABLE IF EXISTS public._b2_orphans_external_benefit_deductions;

CREATE TABLE public._b2_orphans_compensation_records       AS SELECT t.*, m.match_strategy, m.match_count FROM public.compensation_records       t JOIN public._b2_map_compensation_records       m ON m.source_id=t.id WHERE m.match_strategy IN ('orphan','ambiguous');
CREATE TABLE public._b2_orphans_employee_deductions        AS SELECT t.*, m.match_strategy, m.match_count FROM public.employee_deductions        t JOIN public._b2_map_employee_deductions        m ON m.source_id=t.id WHERE m.match_strategy IN ('orphan','ambiguous');
CREATE TABLE public._b2_orphans_payroll_run_employees      AS SELECT t.*, m.match_strategy, m.match_count FROM public.payroll_run_employees      t JOIN public._b2_map_payroll_run_employees      m ON m.source_id=t.id WHERE m.match_strategy IN ('orphan','ambiguous');
CREATE TABLE public._b2_orphans_employee_wc_assignments    AS SELECT t.*, m.match_strategy, m.match_count FROM public.employee_wc_assignments    t JOIN public._b2_map_employee_wc_assignments    m ON m.source_id=t.id WHERE m.match_strategy IN ('orphan','ambiguous');
CREATE TABLE public._b2_orphans_external_benefit_deductions AS SELECT t.*, m.match_strategy, m.match_count FROM public.external_benefit_deductions t JOIN public._b2_map_external_benefit_deductions m ON m.source_id=t.id WHERE m.match_strategy IN ('orphan','ambiguous');

-- RLS lockdown (super admin only)
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    '_b2_map_compensation_records','_b2_map_employee_deductions','_b2_map_payroll_run_employees',
    '_b2_map_employee_wc_assignments','_b2_map_external_benefit_deductions',
    '_b2_orphans_compensation_records','_b2_orphans_employee_deductions','_b2_orphans_payroll_run_employees',
    '_b2_orphans_employee_wc_assignments','_b2_orphans_external_benefit_deductions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY sa_all ON public.%I FOR ALL USING (has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''super_admin''::app_role))', tbl);
  END LOOP;
END $$;

-- Step 6: forward-only sync trigger
CREATE OR REPLACE FUNCTION public.fill_employment_record_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.employment_record_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    SELECT id INTO NEW.employment_record_id
    FROM public.employment_records
    WHERE employee_id::text = NEW.employee_id::text
      AND end_date IS NULL
    ORDER BY effective_date DESC LIMIT 1;
  END IF;
  IF NEW.employment_record_id IS NOT NULL AND NEW.employee_id IS NULL THEN
    RAISE EXCEPTION 'employee_id must be provided alongside employment_record_id during dual-write window';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fill_er_id ON public.payroll_run_employees;
CREATE TRIGGER trg_fill_er_id BEFORE INSERT OR UPDATE ON public.payroll_run_employees      FOR EACH ROW EXECUTE FUNCTION public.fill_employment_record_id();
DROP TRIGGER IF EXISTS trg_fill_er_id ON public.compensation_records;
CREATE TRIGGER trg_fill_er_id BEFORE INSERT OR UPDATE ON public.compensation_records       FOR EACH ROW EXECUTE FUNCTION public.fill_employment_record_id();
DROP TRIGGER IF EXISTS trg_fill_er_id ON public.employee_wc_assignments;
CREATE TRIGGER trg_fill_er_id BEFORE INSERT OR UPDATE ON public.employee_wc_assignments    FOR EACH ROW EXECUTE FUNCTION public.fill_employment_record_id();
DROP TRIGGER IF EXISTS trg_fill_er_id ON public.employee_deductions;
CREATE TRIGGER trg_fill_er_id BEFORE INSERT OR UPDATE ON public.employee_deductions        FOR EACH ROW EXECUTE FUNCTION public.fill_employment_record_id();
DROP TRIGGER IF EXISTS trg_fill_er_id ON public.external_benefit_deductions;
CREATE TRIGGER trg_fill_er_id BEFORE INSERT OR UPDATE ON public.external_benefit_deductions FOR EACH ROW EXECUTE FUNCTION public.fill_employment_record_id();