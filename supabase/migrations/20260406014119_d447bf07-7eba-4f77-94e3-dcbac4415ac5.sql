
-- Sync employee_count on all companies to match actual employee records
UPDATE companies c
SET employee_count = sub.cnt
FROM (
  SELECT company_id, COUNT(*)::int AS cnt
  FROM employees
  WHERE deleted_at IS NULL
  GROUP BY company_id
) sub
WHERE c.id = sub.company_id;

-- Also zero out companies with no employees
UPDATE companies c
SET employee_count = 0
WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.company_id = c.id AND e.deleted_at IS NULL
)
AND c.employee_count != 0;

-- Create trigger function to keep employee_count in sync
CREATE OR REPLACE FUNCTION public.sync_company_employee_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id uuid;
BEGIN
  -- Determine which company to update
  IF TG_OP = 'DELETE' THEN
    _company_id := OLD.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If company changed, update both
    IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
      UPDATE companies SET employee_count = (
        SELECT COUNT(*)::int FROM employees WHERE company_id = OLD.company_id AND deleted_at IS NULL
      ) WHERE id = OLD.company_id;
    END IF;
    _company_id := NEW.company_id;
  ELSE
    _company_id := NEW.company_id;
  END IF;

  UPDATE companies SET employee_count = (
    SELECT COUNT(*)::int FROM employees WHERE company_id = _company_id AND deleted_at IS NULL
  ) WHERE id = _company_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to employees table
CREATE TRIGGER trg_sync_employee_count
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION sync_company_employee_count();
