
-- Onboarding checklist templates (Super Admin manages these)
CREATE TABLE public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read onboarding templates"
  ON public.onboarding_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage onboarding templates"
  ON public.onboarding_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Onboarding template items (checklist step definitions)
CREATE TABLE public.onboarding_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  assigned_role TEXT NOT NULL DEFAULT 'employee',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read onboarding template items"
  ON public.onboarding_template_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage onboarding template items"
  ON public.onboarding_template_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Employee onboarding sessions
CREATE TABLE public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  template_id UUID REFERENCES public.onboarding_templates(id),
  status TEXT NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read onboarding sessions"
  ON public.onboarding_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage onboarding sessions"
  ON public.onboarding_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Individual onboarding tasks per employee
CREATE TABLE public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.onboarding_template_items(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  assigned_role TEXT NOT NULL DEFAULT 'employee',
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read onboarding tasks"
  ON public.onboarding_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage onboarding tasks"
  ON public.onboarding_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default onboarding template
INSERT INTO public.onboarding_templates (id, name, description, is_default)
VALUES ('00000000-0000-0000-0000-000000000001', 'Standard Employee Onboarding', 'Default onboarding checklist for new W-2 employees', true);

INSERT INTO public.onboarding_template_items (template_id, title, description, category, assigned_role, sort_order, is_required)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Complete personal information', 'Fill in name, address, phone, emergency contact', 'personal_info', 'employee', 1, true),
  ('00000000-0000-0000-0000-000000000001', 'Upload government-issued ID', 'Drivers license, passport, or state ID', 'documents', 'employee', 2, true),
  ('00000000-0000-0000-0000-000000000001', 'Complete I-9 verification', 'Employment eligibility verification', 'compliance', 'employee', 3, true),
  ('00000000-0000-0000-0000-000000000001', 'Submit W-4 tax withholding', 'Federal tax withholding elections', 'tax', 'employee', 4, true),
  ('00000000-0000-0000-0000-000000000001', 'Submit state tax form', 'State-specific tax withholding form', 'tax', 'employee', 5, true),
  ('00000000-0000-0000-0000-000000000001', 'Set up direct deposit', 'Provide bank account information for payroll', 'payroll', 'employee', 6, true),
  ('00000000-0000-0000-0000-000000000001', 'Enroll in benefits', 'Select medical, dental, vision, and 401k options', 'benefits', 'employee', 7, false),
  ('00000000-0000-0000-0000-000000000001', 'Sign employee handbook acknowledgment', 'E-sign company handbook receipt', 'documents', 'employee', 8, true),
  ('00000000-0000-0000-0000-000000000001', 'Verify employee information', 'Review and confirm all submitted employee data', 'review', 'client_admin', 9, true),
  ('00000000-0000-0000-0000-000000000001', 'Run background check', 'Initiate and review background screening', 'compliance', 'client_admin', 10, false),
  ('00000000-0000-0000-0000-000000000001', 'Approve I-9 documentation', 'Verify Section 2 of I-9 form', 'compliance', 'client_admin', 11, true),
  ('00000000-0000-0000-0000-000000000001', 'Set up in payroll system', 'Configure employee in Everee for payroll processing', 'payroll', 'super_admin', 12, true),
  ('00000000-0000-0000-0000-000000000001', 'File new hire report', 'Submit state new hire reporting', 'compliance', 'super_admin', 13, true),
  ('00000000-0000-0000-0000-000000000001', 'Assign workers comp code', 'Set appropriate WC classification', 'compliance', 'super_admin', 14, true),
  ('00000000-0000-0000-0000-000000000001', 'Final onboarding review', 'Confirm all tasks complete, activate employee', 'review', 'super_admin', 15, true);
