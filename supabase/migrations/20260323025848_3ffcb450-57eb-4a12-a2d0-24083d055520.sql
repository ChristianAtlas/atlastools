
-- Employee status enum
CREATE TYPE public.employee_status AS ENUM (
  'active', 'onboarding', 'on_leave', 'terminated', 'suspended'
);

-- Pay type enum
CREATE TYPE public.pay_type AS ENUM ('salary', 'hourly');

-- Employment action enum (for effective-dated records)
CREATE TYPE public.employment_action AS ENUM (
  'hire', 'promotion', 'transfer', 'demotion', 'title_change',
  'department_change', 'rehire', 'termination', 'leave_start', 'leave_end'
);

-- Compensation change reason
CREATE TYPE public.compensation_reason AS ENUM (
  'hire', 'annual_review', 'promotion', 'market_adjustment',
  'correction', 'demotion', 'role_change'
);

-- ═══════════════════════════════════════════════
-- employees — system-of-record employee table
-- ═══════════════════════════════════════════════
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  user_id uuid REFERENCES auth.users(id),   -- nullable: not all employees have app access

  -- Personal info
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  personal_email text,
  phone text,
  date_of_birth date,
  ssn_encrypted text,                        -- encrypted at rest, masked in UI
  gender text,

  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,

  -- Employment snapshot (denormalized from latest employment_record)
  status public.employee_status NOT NULL DEFAULT 'onboarding',
  title text,
  department text,
  manager_id uuid REFERENCES public.employees(id),
  start_date date NOT NULL,
  termination_date date,
  termination_reason text,

  -- Compensation snapshot (denormalized from latest compensation_record)
  pay_type public.pay_type NOT NULL DEFAULT 'salary',
  annual_salary_cents bigint,                -- for salaried
  hourly_rate_cents integer,                 -- for hourly
  pay_frequency public.pay_frequency NOT NULL DEFAULT 'biweekly',

  -- Emergency contact
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,

  -- Provider integration
  provider_employee_id text,                  -- Everee employee ID

  -- Avatar
  avatar_url text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz                      -- soft delete
);

-- Indexes
CREATE INDEX idx_employees_company ON public.employees (company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_status ON public.employees (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_user ON public.employees (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_employees_email_company ON public.employees (company_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_manager ON public.employees (manager_id) WHERE manager_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ═══════════════════════════════════════════════
-- employment_records — effective-dated employment history
-- ═══════════════════════════════════════════════
CREATE TABLE public.employment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),

  -- Effective dating
  effective_date date NOT NULL,
  end_date date,                              -- NULL = current record

  -- Employment details
  action public.employment_action NOT NULL,
  title text NOT NULL,
  department text,
  manager_id uuid REFERENCES public.employees(id),
  status public.employee_status NOT NULL,

  -- Context
  reason text,
  notes text,
  approved_by uuid,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_er_employee ON public.employment_records (employee_id, effective_date DESC);
CREATE INDEX idx_er_company ON public.employment_records (company_id);

-- ═══════════════════════════════════════════════
-- compensation_records — effective-dated compensation history
-- ═══════════════════════════════════════════════
CREATE TABLE public.compensation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),

  -- Effective dating
  effective_date date NOT NULL,
  end_date date,                              -- NULL = current record

  -- Compensation details
  reason public.compensation_reason NOT NULL,
  pay_type public.pay_type NOT NULL,
  annual_salary_cents bigint,
  hourly_rate_cents integer,
  pay_frequency public.pay_frequency NOT NULL DEFAULT 'biweekly',

  -- Context
  change_amount_cents bigint,                 -- positive = raise, negative = decrease
  change_percentage numeric(6,2),
  notes text,
  approved_by uuid,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cr_employee ON public.compensation_records (employee_id, effective_date DESC);
CREATE INDEX idx_cr_company ON public.compensation_records (company_id);

-- ═══════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compensation_records ENABLE ROW LEVEL SECURITY;

-- employees: Super admins — full access
CREATE POLICY "sa_all_employees"
  ON public.employees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- employees: Client admins — read/update own company
CREATE POLICY "ca_read_own_employees"
  ON public.employees FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

CREATE POLICY "ca_insert_own_employees"
  ON public.employees FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

CREATE POLICY "ca_update_own_employees"
  ON public.employees FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- employees: Employees — read own record only
CREATE POLICY "emp_read_own_employee"
  ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- employment_records: Super admins — full access
CREATE POLICY "sa_all_er"
  ON public.employment_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- employment_records: Client admins — read own company
CREATE POLICY "ca_read_own_er"
  ON public.employment_records FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- employment_records: Employees — read own
CREATE POLICY "emp_read_own_er"
  ON public.employment_records FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- compensation_records: Super admins — full access
CREATE POLICY "sa_all_cr"
  ON public.compensation_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- compensation_records: Client admins — read own company
CREATE POLICY "ca_read_own_cr"
  ON public.compensation_records FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- compensation_records: Employees — read own
CREATE POLICY "emp_read_own_cr"
  ON public.compensation_records FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );
