
CREATE OR REPLACE FUNCTION public.enforce_vendor_dob_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- C2C / entity vendors must never carry a DOB.
  IF NEW.is_c2c = true OR NEW.worker_type::text = 'c2c_vendor' THEN
    IF NEW.date_of_birth IS NOT NULL THEN
      -- Silently null it out rather than failing the write so that flipping
      -- an existing individual to C2C cleans up automatically.
      NEW.date_of_birth := NULL;
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_enforce_vendor_dob ON public.vendors;
CREATE TRIGGER trg_enforce_vendor_dob
  BEFORE INSERT OR UPDATE OF date_of_birth, is_c2c, worker_type
  ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_vendor_dob_rules();
