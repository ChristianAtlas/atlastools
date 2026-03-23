
-- Company status enum
CREATE TYPE public.company_status AS ENUM ('active', 'onboarding', 'suspended', 'terminated');

-- Companies table (system of record)
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  ein text NOT NULL,
  status public.company_status NOT NULL DEFAULT 'onboarding',
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text NOT NULL,
  zip text,
  
  -- Primary contact
  primary_contact_name text NOT NULL,
  primary_contact_email text,
  primary_contact_phone text,
  
  -- Settings / config
  settings jsonb NOT NULL DEFAULT '{}',
  
  -- Metadata
  employee_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz  -- soft delete
);

-- Indexes
CREATE INDEX idx_companies_status ON public.companies (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_state ON public.companies (state) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_companies_ein ON public.companies (ein) WHERE deleted_at IS NULL;

-- Helper: get company_id for current user
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Super admins: full access
CREATE POLICY "super_admins_all_companies"
  ON public.companies FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Client admins: read own company only
CREATE POLICY "client_admins_read_own_company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND id::text = public.get_user_company(auth.uid())
  );

-- Employees: read own company only
CREATE POLICY "employees_read_own_company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'employee')
    AND id::text = public.get_user_company(auth.uid())
  );

-- Update profiles.company_id FK reference to be uuid-compatible
-- (profiles.company_id is text, companies.id is uuid — we cast in policies)

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
