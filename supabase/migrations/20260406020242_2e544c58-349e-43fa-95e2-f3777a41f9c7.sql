
-- 1. Create earning/deduction categories table
CREATE TABLE public.earning_deduction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('earning', 'deduction')),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.earning_deduction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_ed_categories" ON public.earning_deduction_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "authenticated_read_ed_categories" ON public.earning_deduction_categories FOR SELECT TO authenticated
  USING (true);

-- 2. Expand earning_deduction_types with comprehensive payroll fields
ALTER TABLE public.earning_deduction_types
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'enterprise_standard',
  ADD COLUMN IF NOT EXISTS pay_behavior text DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS calculation_method text DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS default_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS default_multiplier numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS worker_type text DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS pay_run_types text[] DEFAULT '{regular,off_cycle,bonus}',
  ADD COLUMN IF NOT EXISTS reporting_w2_box text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reporting_1099_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reporting_box_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reporting_box14_literal text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS special_flags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tax_federal_income boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_social_security boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_medicare boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_futa boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_state_income boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_state_unemployment boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_local boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS deduction_side text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_treatment text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS annual_limit_cents bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS catch_up_eligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS catch_up_limit_cents bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stop_at_goal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal_amount_cents bigint DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS garnishment_settings jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS priority_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability text DEFAULT 'all_clients',
  ADD COLUMN IF NOT EXISTS gl_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS used_by_clients_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.earning_deduction_categories(id) DEFAULT NULL;

-- Add client_admin insert policy for custom types  
CREATE POLICY "ca_insert_own_earning_deduction_types" ON public.earning_deduction_types FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND company_id IS NOT NULL AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_update_own_earning_deduction_types" ON public.earning_deduction_types FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id IS NOT NULL AND (company_id::text = get_user_company(auth.uid())))
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND company_id IS NOT NULL AND (company_id::text = get_user_company(auth.uid())));

-- 3. Create client overrides table
CREATE TABLE public.client_earning_deduction_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  earning_deduction_type_id uuid NOT NULL REFERENCES public.earning_deduction_types(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  display_label_override text DEFAULT NULL,
  gl_code_override text DEFAULT NULL,
  frequency_eligibility text[] DEFAULT NULL,
  worker_type_override text DEFAULT NULL,
  pay_run_types_override text[] DEFAULT NULL,
  notes text DEFAULT NULL,
  updated_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, earning_deduction_type_id)
);

ALTER TABLE public.client_earning_deduction_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_client_ed_overrides" ON public.client_earning_deduction_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_ed_overrides" ON public.client_earning_deduction_overrides FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_manage_own_ed_overrides" ON public.client_earning_deduction_overrides FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_update_own_ed_overrides" ON public.client_earning_deduction_overrides FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())))
  WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE POLICY "ca_delete_own_ed_overrides" ON public.client_earning_deduction_overrides FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

-- Triggers for updated_at
CREATE TRIGGER update_ed_categories_updated_at BEFORE UPDATE ON public.earning_deduction_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_client_ed_overrides_updated_at BEFORE UPDATE ON public.client_earning_deduction_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
