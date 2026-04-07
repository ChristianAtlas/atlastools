
-- Create sequences
CREATE SEQUENCE IF NOT EXISTS company_cid_seq START WITH 2;
CREATE SEQUENCE IF NOT EXISTS employee_mid_seq START WITH 5;

-- Add columns
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cid text UNIQUE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS mid text UNIQUE;

-- Backfill existing companies with CIDs (C2, C3, ...)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM companies WHERE cid IS NULL ORDER BY created_at
  LOOP
    UPDATE companies SET cid = 'C' || nextval('company_cid_seq') WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill existing employees with MIDs (M5, M6, ...)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM employees WHERE mid IS NULL ORDER BY created_at
  LOOP
    UPDATE employees SET mid = 'M' || nextval('employee_mid_seq') WHERE id = r.id;
  END LOOP;
END $$;

-- Make columns NOT NULL after backfill
ALTER TABLE public.companies ALTER COLUMN cid SET NOT NULL;
ALTER TABLE public.employees ALTER COLUMN mid SET NOT NULL;

-- Auto-assign CID on insert
CREATE OR REPLACE FUNCTION public.auto_assign_cid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cid IS NULL OR NEW.cid = '' THEN
    NEW.cid := 'C' || nextval('company_cid_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_cid
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_cid();

-- Auto-assign MID on insert
CREATE OR REPLACE FUNCTION public.auto_assign_mid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mid IS NULL OR NEW.mid = '' THEN
    NEW.mid := 'M' || nextval('employee_mid_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_mid
BEFORE INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_mid();
