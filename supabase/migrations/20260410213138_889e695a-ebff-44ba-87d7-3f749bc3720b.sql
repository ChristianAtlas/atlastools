
-- State mandatory sick leave rules table
CREATE TABLE public.state_sick_leave_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,
  law_name TEXT NOT NULL,
  max_use_hours_per_year NUMERIC NULL,
  accrual_rate_hours NUMERIC NOT NULL DEFAULT 1,
  accrual_per_hours_worked NUMERIC NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  effective_date DATE NULL,
  carryover_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.state_sick_leave_rules ENABLE ROW LEVEL SECURITY;

-- Super admins full access
CREATE POLICY "sa_all_state_sick_leave_rules"
ON public.state_sick_leave_rules FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins and employees can read active rules
CREATE POLICY "authenticated_read_active_sick_leave_rules"
ON public.state_sick_leave_rules FOR SELECT
TO authenticated
USING (is_active = true);

-- Updated_at trigger
CREATE TRIGGER update_state_sick_leave_rules_updated_at
BEFORE UPDATE ON public.state_sick_leave_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed data
INSERT INTO public.state_sick_leave_rules (state_code, state_name, law_name, max_use_hours_per_year, accrual_rate_hours, accrual_per_hours_worked, notes) VALUES
('AK', 'Alaska', 'Alaska Paid Sick Leave', 56, 1, 30, NULL),
('AZ', 'Arizona', 'Arizona Paid Sick Leave', 40, 1, 30, NULL),
('CA', 'California', 'California Paid Sick Leave', 40, 1, 30, 'Max use is 40 hours (5 days)'),
('CO', 'Colorado', 'Colorado Paid Sick Leave', 48, 1, 30, NULL),
('CT', 'Connecticut', 'Connecticut Paid Sick Leave', 40, 1, 30, NULL),
('IL', 'Illinois', 'Illinois Paid Leave for All Workers', 40, 1, 40, NULL),
('ME', 'Maine', 'Maine Earned Paid Leave', 40, 1, 40, NULL),
('MD', 'Maryland', 'Maryland Paid Sick Leave', 64, 1, 30, NULL),
('MA', 'Massachusetts', 'Massachusetts Paid Sick Leave', 40, 1, 30, NULL),
('MI', 'Michigan', 'Michigan Paid Sick Leave', 40, 1, 30, 'Accrual cap: 72 hours'),
('MN', 'Minnesota', 'Minnesota Paid Sick Leave', NULL, 1, 30, 'No max use provision'),
('NE', 'Nebraska', 'Nebraska Paid Sick Leave', 40, 1, 30, NULL),
('NV', 'Nevada', 'Nevada Paid Leave Law', 40, 0.01923, 1, 'Rate: 0.01923 hours per hour worked'),
('NJ', 'New Jersey', 'New Jersey Paid Sick Leave', 40, 1, 30, NULL),
('NM', 'New Mexico', 'New Mexico Paid Sick Leave', 64, 1, 30, NULL),
('NY', 'New York', 'New York Paid Sick Leave', 56, 1, 30, NULL),
('OR', 'Oregon', 'Oregon Paid Sick Leave', 40, 1, 30, NULL),
('RI', 'Rhode Island', 'Rhode Island Paid Sick Leave', 40, 1, 35, NULL),
('VT', 'Vermont', 'Vermont Paid Sick Leave', 40, 1, 52, NULL),
('WA', 'Washington', 'Washington State Paid Sick Leave', NULL, 1, 40, 'No max use provision'),
('DC', 'Washington D.C.', 'Washington D.C. Paid Sick Leave', 56, 1, 37, 'Max use: 7 days (56 hours)');
