
CREATE OR REPLACE FUNCTION public.terminate_employees_on_company_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'terminated' THEN
    UPDATE employees
    SET status = 'terminated',
        termination_date = CURRENT_DATE,
        termination_reason = 'Company terminated from platform',
        updated_at = now()
    WHERE company_id = NEW.id
      AND deleted_at IS NULL
      AND status != 'terminated';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_terminate_employees_on_company_termination
AFTER UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION terminate_employees_on_company_termination();
