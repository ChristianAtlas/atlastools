
-- 1. Billing profiles per client
CREATE TABLE public.billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  legal_billing_name text,
  billing_contact_name text,
  billing_contact_email text,
  billing_emails text[] DEFAULT '{}',
  default_payment_method text DEFAULT 'ach',
  backup_payment_method text,
  ach_authorization_status text DEFAULT 'pending',
  wire_required boolean DEFAULT false,
  credit_limit_cents bigint DEFAULT 0,
  invoice_delivery_preference text DEFAULT 'email',
  sui_billing_method text DEFAULT 'peo_rate',
  workers_comp_billing_method text DEFAULT 'standard',
  workers_comp_markup_rate numeric DEFAULT 0.015,
  sui_markup_rate numeric DEFAULT 0.025,
  monthly_service_charge_cents integer DEFAULT 6500,
  collections_status text DEFAULT 'none',
  nsf_risk_status text DEFAULT 'none',
  current_ar_balance_cents bigint DEFAULT 0,
  past_due_balance_cents bigint DEFAULT 0,
  account_hold boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_billing_profiles" ON public.billing_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_billing_profile" ON public.billing_profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE TRIGGER update_billing_profiles_updated_at
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Payment attempts
CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  method text NOT NULL DEFAULT 'ach',
  amount_cents bigint NOT NULL DEFAULT 0,
  attempt_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  processor_response_code text,
  processor_response_message text,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_payment_attempts" ON public.payment_attempts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_payment_attempts" ON public.payment_attempts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id = get_user_company(auth.uid())));

-- 3. Monthly employee billing ledger
CREATE TABLE public.monthly_employee_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  company_id uuid NOT NULL,
  billing_month date NOT NULL,
  tier_id uuid REFERENCES public.pricing_tiers(id),
  charge_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  catch_up_needed boolean DEFAULT false,
  catch_up_billed boolean DEFAULT false,
  catch_up_invoice_id uuid REFERENCES public.invoices(id),
  invoice_id uuid REFERENCES public.invoices(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, billing_month)
);

ALTER TABLE public.monthly_employee_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_monthly_billing" ON public.monthly_employee_billing
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_monthly_billing" ON public.monthly_employee_billing
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

-- 4. Enhance invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid,
  ADD COLUMN IF NOT EXISTS balance_due_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS billing_profile_id uuid,
  ADD COLUMN IF NOT EXISTS employee_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catch_up_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catch_up_cents integer DEFAULT 0;

-- 5. Enhance nsf_events for case management
ALTER TABLE public.nsf_events
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_type text DEFAULT 'nsf',
  ADD COLUMN IF NOT EXISTS retry_eligible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS required_resolution_method text,
  ADD COLUMN IF NOT EXISTS account_hold_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS client_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TRIGGER update_nsf_events_updated_at
  BEFORE UPDATE ON public.nsf_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
