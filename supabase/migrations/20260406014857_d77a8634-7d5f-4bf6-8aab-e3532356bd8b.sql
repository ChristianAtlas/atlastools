
-- Earning and deduction type definitions
CREATE TABLE public.earning_deduction_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  category text NOT NULL CHECK (category IN ('earning', 'deduction')),
  subcategory text NOT NULL DEFAULT 'other',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  taxable boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, company_id)
);

ALTER TABLE public.earning_deduction_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_earning_deduction_types"
  ON public.earning_deduction_types FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_earning_deduction_types"
  ON public.earning_deduction_types FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND (
      company_id IS NULL
      OR (company_id)::text = get_user_company(auth.uid())
    )
  );

CREATE TRIGGER update_earning_deduction_types_updated_at
  BEFORE UPDATE ON public.earning_deduction_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default earning types
INSERT INTO public.earning_deduction_types (name, code, category, subcategory, is_default, taxable, sort_order) VALUES
  ('Regular Pay', 'regular_pay', 'earning', 'regular', true, true, 1),
  ('Overtime Pay', 'overtime_pay', 'earning', 'regular', true, true, 2),
  ('Holiday Pay', 'holiday_pay', 'earning', 'regular', true, true, 3),
  ('PTO Pay', 'pto_pay', 'earning', 'regular', true, true, 4),
  ('Bonus', 'bonus', 'earning', 'supplemental', true, true, 5),
  ('Commission', 'commission', 'earning', 'supplemental', true, true, 6),
  ('Reimbursement', 'reimbursement', 'earning', 'non_taxable', true, false, 7),
  ('Tips', 'tips', 'earning', 'supplemental', true, true, 8),
  ('Severance', 'severance', 'earning', 'supplemental', true, true, 9),
  ('Other Earnings', 'other_earnings', 'earning', 'other', true, true, 10),
  -- Deduction types
  ('Federal Income Tax', 'federal_tax', 'deduction', 'tax', true, false, 1),
  ('State Income Tax', 'state_tax', 'deduction', 'tax', true, false, 2),
  ('Local Income Tax', 'local_tax', 'deduction', 'tax', true, false, 3),
  ('Social Security', 'social_security', 'deduction', 'tax', true, false, 4),
  ('Medicare', 'medicare', 'deduction', 'tax', true, false, 5),
  ('Medical Insurance', 'medical_insurance', 'deduction', 'pre_tax', true, false, 6),
  ('Dental Insurance', 'dental_insurance', 'deduction', 'pre_tax', true, false, 7),
  ('Vision Insurance', 'vision_insurance', 'deduction', 'pre_tax', true, false, 8),
  ('401(k) Contribution', '401k', 'deduction', 'pre_tax', true, false, 9),
  ('Roth 401(k)', 'roth_401k', 'deduction', 'post_tax', true, false, 10),
  ('HSA Contribution', 'hsa', 'deduction', 'pre_tax', true, false, 11),
  ('FSA Contribution', 'fsa', 'deduction', 'pre_tax', true, false, 12),
  ('Life Insurance', 'life_insurance', 'deduction', 'post_tax', true, false, 13),
  ('Disability Insurance', 'disability_insurance', 'deduction', 'post_tax', true, false, 14),
  ('Garnishment', 'garnishment', 'deduction', 'post_tax', true, false, 15),
  ('Child Support', 'child_support', 'deduction', 'post_tax', true, false, 16),
  ('Loan Repayment', 'loan_repayment', 'deduction', 'post_tax', true, false, 17),
  ('Union Dues', 'union_dues', 'deduction', 'post_tax', true, false, 18),
  ('Other Deductions', 'other_deductions', 'deduction', 'other', true, false, 19);
