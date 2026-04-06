
-- Fix the trigger to count only active employees
CREATE OR REPLACE FUNCTION public.sync_company_employee_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _company_id := OLD.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
      UPDATE companies SET employee_count = (
        SELECT COUNT(*)::int FROM employees WHERE company_id = OLD.company_id AND deleted_at IS NULL AND status = 'active'
      ) WHERE id = OLD.company_id;
    END IF;
    _company_id := NEW.company_id;
  ELSE
    _company_id := NEW.company_id;
  END IF;

  UPDATE companies SET employee_count = (
    SELECT COUNT(*)::int FROM employees WHERE company_id = _company_id AND deleted_at IS NULL AND status = 'active'
  ) WHERE id = _company_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill companies.employee_count to active only
UPDATE companies c SET employee_count = (
  SELECT COUNT(*)::int FROM employees e WHERE e.company_id = c.id AND e.deleted_at IS NULL AND e.status = 'active'
);

-- Backfill payroll_runs.employee_count from actual payroll_run_employees
UPDATE payroll_runs pr SET employee_count = sub.cnt
FROM (
  SELECT payroll_run_id, COUNT(*)::int as cnt
  FROM payroll_run_employees
  WHERE status != 'excluded'
  GROUP BY payroll_run_id
) sub
WHERE pr.id = sub.payroll_run_id AND pr.employee_count != sub.cnt;
