-- ============================================================
-- BILLING ENGINE V2: schema additions
-- ============================================================

-- 1. Extend invoice_line_items with category/internal flags
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'fee',
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS included_in_total boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS section_label text;

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_category
  ON public.invoice_line_items(invoice_id, category);

-- 2. Extend billing_profiles with autopay + Stripe customer
ALTER TABLE public.billing_profiles
  ADD COLUMN IF NOT EXISTS autopay_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS autopay_payment_method_id uuid;

-- 3. invoice_adjustments
CREATE TABLE IF NOT EXISTS public.invoice_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('credit','debit','writeoff','refund')),
  amount_cents bigint NOT NULL,
  reason text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_all_invoice_adjustments" ON public.invoice_adjustments
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "ca_read_own_invoice_adjustments" ON public.invoice_adjustments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role)
         AND company_id::text = get_user_company(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_invoice_adj_invoice ON public.invoice_adjustments(invoice_id);

-- 4. payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  stripe_payment_method_id text NOT NULL,
  stripe_customer_id text,
  method_type text NOT NULL CHECK (method_type IN ('card','us_bank_account','ach')),
  brand text,
  last4 text,
  exp_month int,
  exp_year int,
  bank_name text,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, stripe_payment_method_id)
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_all_payment_methods" ON public.payment_methods
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "ca_manage_own_payment_methods" ON public.payment_methods
  TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role)
         AND company_id::text = get_user_company(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role)
              AND company_id::text = get_user_company(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_payment_methods_company ON public.payment_methods(company_id);

-- 5. billing_activity_logs (append-only)
CREATE TABLE IF NOT EXISTS public.billing_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  invoice_id uuid,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  actor_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_all_billing_activity" ON public.billing_activity_logs
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "ca_read_own_billing_activity" ON public.billing_activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role)
         AND company_id::text = get_user_company(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_billing_activity_invoice ON public.billing_activity_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_activity_company ON public.billing_activity_logs(company_id);

-- 6. trigger to keep payment_methods.updated_at fresh
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. Allow new payroll-invoice categories implicit via text col; no enum needed.
