
-- Add missing columns to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS dba_name text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS date_of_incorporation date,
  ADD COLUMN IF NOT EXISTS naics_code text,
  ADD COLUMN IF NOT EXISTS business_description text,
  ADD COLUMN IF NOT EXISTS mailing_address_line1 text,
  ADD COLUMN IF NOT EXISTS mailing_address_line2 text,
  ADD COLUMN IF NOT EXISTS mailing_city text,
  ADD COLUMN IF NOT EXISTS mailing_state text,
  ADD COLUMN IF NOT EXISTS mailing_zip text;

-- Create client onboarding wizards table
CREATE TABLE public.client_onboarding_wizards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  current_step integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  mode text NOT NULL DEFAULT 'white_glove',
  wizard_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  completed_at timestamptz,
  launched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_onboarding_wizards ENABLE ROW LEVEL SECURITY;

-- Super admins full access
CREATE POLICY "sa_all_onboarding_wizards"
  ON public.client_onboarding_wizards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins can view their own
CREATE POLICY "ca_read_own_onboarding_wizards"
  ON public.client_onboarding_wizards
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id IS NOT NULL
    AND (company_id)::text = get_user_company(auth.uid())
  );

-- Updated at trigger
CREATE TRIGGER update_client_onboarding_wizards_updated_at
  BEFORE UPDATE ON public.client_onboarding_wizards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
