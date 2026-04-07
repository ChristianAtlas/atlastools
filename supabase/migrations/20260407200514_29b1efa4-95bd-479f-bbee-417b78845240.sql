
-- Add premier_date (CSA signing date) to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS premier_date date;

-- Create Form 8973 filings table
CREATE TABLE public.form_8973_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Filing status workflow
  status text NOT NULL DEFAULT 'draft',
  -- draft -> pending_signature -> signed -> submitted -> accepted | rejected
  
  -- Contract dates
  contract_begin_date date NOT NULL,
  contract_end_date date,
  is_new_contract boolean NOT NULL DEFAULT true,
  
  -- CPEO info snapshot
  cpeo_name text NOT NULL DEFAULT '',
  cpeo_ein text NOT NULL DEFAULT '',
  
  -- Client info snapshot (frozen at filing time)
  client_legal_name text,
  client_ein text,
  client_address_line1 text,
  client_address_line2 text,
  client_city text,
  client_state text,
  client_zip text,
  client_contact_name text,
  client_contact_phone text,
  client_contact_email text,
  
  -- Signature tracking
  signature_requested_at timestamptz,
  signature_requested_by uuid,
  signed_at timestamptz,
  signer_name text,
  signer_title text,
  
  -- IRS submission
  submitted_to_irs_at timestamptz,
  irs_confirmation_number text,
  irs_response_date date,
  
  -- Meta
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.form_8973_filings ENABLE ROW LEVEL SECURITY;

-- Super admin full access
CREATE POLICY "sa_all_form_8973" ON public.form_8973_filings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins read own
CREATE POLICY "ca_read_own_form_8973" ON public.form_8973_filings
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND (company_id)::text = get_user_company(auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_form_8973_updated_at
  BEFORE UPDATE ON public.form_8973_filings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
