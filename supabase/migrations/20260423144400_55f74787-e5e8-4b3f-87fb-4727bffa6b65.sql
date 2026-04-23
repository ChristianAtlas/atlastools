
-- =========================================================================
-- Tax ID validation (SSN / ITIN / EIN) — shared server-side rules
-- =========================================================================

-- Helper: validate a full TIN string against IRS digit patterns.
-- Returns NULL if valid, otherwise a human-readable error message.
CREATE OR REPLACE FUNCTION public.validate_full_tin(_type text, _full text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
  area text;
  grp text;
  serial text;
  prefix int;
BEGIN
  IF _type IS NULL THEN
    RETURN 'Tax ID type is required (SSN, ITIN, or EIN).';
  END IF;
  IF _full IS NULL OR length(btrim(_full)) = 0 THEN
    RETURN 'Tax ID is required.';
  END IF;

  digits := regexp_replace(_full, '\D', '', 'g');
  IF length(digits) <> 9 THEN
    RETURN 'Tax ID must be exactly 9 digits.';
  END IF;

  IF _type = 'ssn' THEN
    area   := substring(digits from 1 for 3);
    grp    := substring(digits from 4 for 2);
    serial := substring(digits from 6 for 4);
    -- IRS-invalid SSN areas
    IF area = '000' OR area = '666' OR substring(area from 1 for 1) = '9' THEN
      RETURN 'Invalid SSN: the first three digits cannot be 000, 666, or start with 9.';
    END IF;
    IF grp = '00' THEN
      RETURN 'Invalid SSN: the middle two digits cannot be 00.';
    END IF;
    IF serial = '0000' THEN
      RETURN 'Invalid SSN: the last four digits cannot be 0000.';
    END IF;
    RETURN NULL;

  ELSIF _type = 'itin' THEN
    area   := substring(digits from 1 for 3);
    grp    := substring(digits from 4 for 2);
    serial := substring(digits from 6 for 4);
    -- ITINs always start with 9
    IF substring(area from 1 for 1) <> '9' THEN
      RETURN 'Invalid ITIN: must begin with the digit 9.';
    END IF;
    -- Valid ITIN group ranges per IRS: 50–65, 70–88, 90–92, 94–99
    IF NOT (
      (grp::int BETWEEN 50 AND 65) OR
      (grp::int BETWEEN 70 AND 88) OR
      (grp::int BETWEEN 90 AND 92) OR
      (grp::int BETWEEN 94 AND 99)
    ) THEN
      RETURN 'Invalid ITIN: middle two digits must be in 50–65, 70–88, 90–92, or 94–99.';
    END IF;
    IF serial = '0000' THEN
      RETURN 'Invalid ITIN: the last four digits cannot be 0000.';
    END IF;
    RETURN NULL;

  ELSIF _type = 'ein' THEN
    prefix := substring(digits from 1 for 2)::int;
    -- IRS-assigned EIN prefixes (campus codes). Reject 00, 07, 08, 09,
    -- 17, 18, 19, 28, 29, 49, 78, 79, 89 which the IRS does not issue.
    IF prefix IN (0, 7, 8, 9, 17, 18, 19, 28, 29, 49, 78, 79, 89) THEN
      RETURN format('Invalid EIN: prefix %s is not issued by the IRS.', lpad(prefix::text, 2, '0'));
    END IF;
    IF substring(digits from 3 for 7) = '0000000' THEN
      RETURN 'Invalid EIN: the last seven digits cannot all be zero.';
    END IF;
    RETURN NULL;

  ELSE
    RETURN format('Unknown tax ID type "%s". Must be ssn, itin, or ein.', _type);
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.validate_full_tin(text, text) TO authenticated, anon;

-- Trigger: enforce the persisted columns on vendors are internally consistent.
-- Only last4 is stored in plain text; the trigger guarantees:
--   - tax_id_type ∈ {ssn, itin, ein}
--   - tax_id_last4 (if present) is exactly 4 digits
--   - tax_id_last4 = '0000' is rejected (matches IRS rule)
--   - C2C vendors must use EIN; individual 1099 ICs must use SSN or ITIN
CREATE OR REPLACE FUNCTION public.validate_vendor_tax_id_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tax_id_type IS NOT NULL THEN
    IF NEW.tax_id_type::text NOT IN ('ssn', 'itin', 'ein') THEN
      RAISE EXCEPTION 'Invalid tax_id_type "%": must be ssn, itin, or ein.', NEW.tax_id_type;
    END IF;

    -- Worker-type / TIN-type consistency
    IF NEW.is_c2c = true AND NEW.tax_id_type::text <> 'ein' THEN
      RAISE EXCEPTION 'C2C vendors must use an EIN (got %).', NEW.tax_id_type;
    END IF;
    IF NEW.is_c2c = false
       AND NEW.worker_type::text = '1099_ic'
       AND NEW.tax_id_type::text NOT IN ('ssn', 'itin') THEN
      RAISE EXCEPTION 'Individual 1099 contractors must use SSN or ITIN (got %).', NEW.tax_id_type;
    END IF;
  END IF;

  IF NEW.tax_id_last4 IS NOT NULL THEN
    IF NEW.tax_id_last4 !~ '^[0-9]{4}$' THEN
      RAISE EXCEPTION 'tax_id_last4 must be exactly 4 digits (got "%").', NEW.tax_id_last4;
    END IF;
    IF NEW.tax_id_last4 = '0000' THEN
      RAISE EXCEPTION 'tax_id_last4 cannot be 0000 — invalid TIN.';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_vendor_tax_id ON public.vendors;
CREATE TRIGGER trg_validate_vendor_tax_id
  BEFORE INSERT OR UPDATE OF tax_id_type, tax_id_last4, is_c2c, worker_type
  ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vendor_tax_id_columns();
