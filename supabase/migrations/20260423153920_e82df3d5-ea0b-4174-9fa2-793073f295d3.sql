
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_owner_officer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wc_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wc_exempt_reason text;

COMMENT ON COLUMN public.employees.is_owner_officer IS
  'True when this employee is an owner / officer of the company. May be eligible for WC exemption depending on state and entity type.';
COMMENT ON COLUMN public.employees.wc_exempt IS
  'When true, employee is excluded from Workers'' Compensation coverage and billing. Typically used for owners/officers who have filed a state exemption.';
COMMENT ON COLUMN public.employees.wc_exempt_reason IS
  'Free-text reason for the WC exemption (e.g. "Officer exemption — CA WC-1 on file").';
