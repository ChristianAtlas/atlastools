
-- PEO SUI rates: rates we set for PEO-reporting states
CREATE TABLE public.peo_sui_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL,
  rate numeric NOT NULL,
  effective_date date NOT NULL,
  end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(state_code, effective_date)
);

ALTER TABLE public.peo_sui_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_peo_sui_rates" ON public.peo_sui_rates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_peo_sui_rates_updated_at
  BEFORE UPDATE ON public.peo_sui_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Client SUI rates: experience rates for client-reporting states
CREATE TABLE public.client_sui_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  state_code text NOT NULL,
  rate numeric NOT NULL,
  effective_date date NOT NULL,
  end_date date,
  uploaded_via text DEFAULT 'manual',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, state_code, effective_date)
);

ALTER TABLE public.client_sui_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_client_sui_rates" ON public.client_sui_rates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_client_sui_rates" ON public.client_sui_rates
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

CREATE TRIGGER update_client_sui_rates_updated_at
  BEFORE UPDATE ON public.client_sui_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- SUI adjustments: tracks over/under collections from backdated rate changes
CREATE TABLE public.sui_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  state_code text NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('undercollection', 'overcollection')),
  old_rate numeric NOT NULL,
  new_rate numeric NOT NULL,
  effective_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  taxable_wages_cents bigint NOT NULL DEFAULT 0,
  adjustment_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'credited', 'resolved')),
  invoice_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sui_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_sui_adjustments" ON public.sui_adjustments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_sui_adjustments" ON public.sui_adjustments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id::text = get_user_company(auth.uid()));

CREATE TRIGGER update_sui_adjustments_updated_at
  BEFORE UPDATE ON public.sui_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
