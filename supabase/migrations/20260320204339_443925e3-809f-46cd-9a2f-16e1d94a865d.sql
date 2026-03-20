
-- Pricing tiers lookup table
CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  per_employee boolean NOT NULL DEFAULT true,
  unit_price_cents integer NOT NULL,
  stripe_product_id text,
  stripe_price_id text,
  is_addon boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Company billing plans
CREATE TABLE public.company_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  tier_id uuid REFERENCES public.pricing_tiers(id) NOT NULL,
  employee_count integer NOT NULL DEFAULT 0,
  contractor_count integer NOT NULL DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Company add-ons (many-to-many)
CREATE TABLE public.company_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_plan_id uuid REFERENCES public.company_plans(id) ON DELETE CASCADE NOT NULL,
  tier_id uuid REFERENCES public.pricing_tiers(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_plan_id, tier_id)
);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  company_name text NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  subtotal_cents integer NOT NULL DEFAULT 0,
  markup_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  stripe_invoice_id text,
  due_date date NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice line items
CREATE TABLE public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  tier_slug text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  total_cents integer NOT NULL,
  is_markup boolean NOT NULL DEFAULT false,
  markup_type text,
  markup_rate numeric(5,4),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payroll markup tracking
CREATE TABLE public.payroll_markups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  payroll_run_id text NOT NULL,
  gross_wages_cents integer NOT NULL,
  general_markup_rate numeric(5,4) NOT NULL DEFAULT 0.0150,
  general_markup_cents integer NOT NULL,
  sui_markup_rate numeric(5,4) NOT NULL DEFAULT 0.0250,
  sui_markup_cents integer NOT NULL,
  total_markup_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NSF tracking
CREATE TABLE public.nsf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id),
  amount_cents integer NOT NULL,
  fee_cents integer NOT NULL DEFAULT 5000,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nsf_events ENABLE ROW LEVEL SECURITY;

-- Pricing tiers are readable by all authenticated users
CREATE POLICY "Pricing tiers are readable by authenticated users"
ON public.pricing_tiers FOR SELECT TO authenticated USING (true);

-- For now, allow authenticated users full access (will be refined with role-based auth)
CREATE POLICY "Authenticated users can read company plans"
ON public.company_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage company plans"
ON public.company_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read company addons"
ON public.company_addons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage company addons"
ON public.company_addons FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read invoices"
ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage invoices"
ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read invoice line items"
ON public.invoice_line_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage invoice line items"
ON public.invoice_line_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read payroll markups"
ON public.payroll_markups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage payroll markups"
ON public.payroll_markups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read nsf events"
ON public.nsf_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage nsf events"
ON public.nsf_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
