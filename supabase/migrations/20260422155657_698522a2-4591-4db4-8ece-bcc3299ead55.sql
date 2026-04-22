-- =========================================================
-- TIMEKEEPING MODULE — Phase 1 schema
-- =========================================================

-- 1. Per-company add-on enablement & configuration
CREATE TABLE IF NOT EXISTS public.timekeeping_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  enabled_by uuid,
  -- workweek
  workweek_start_day smallint NOT NULL DEFAULT 0, -- 0 = Sunday
  pay_period_type text NOT NULL DEFAULT 'biweekly',
  -- punch policy
  require_geolocation boolean NOT NULL DEFAULT false,
  require_job_selection boolean NOT NULL DEFAULT false,
  allow_manual_entry boolean NOT NULL DEFAULT true,
  allow_self_correct_missed_punch boolean NOT NULL DEFAULT true,
  -- breaks
  meal_break_minutes int NOT NULL DEFAULT 30,
  rest_breaks_enabled boolean NOT NULL DEFAULT false,
  break_attestation_required boolean NOT NULL DEFAULT false,
  -- rounding & overtime
  rounding_minutes int NOT NULL DEFAULT 0,
  daily_ot_threshold numeric(5,2) NOT NULL DEFAULT 8,
  weekly_ot_threshold numeric(5,2) NOT NULL DEFAULT 40,
  -- approvals
  require_manager_approval boolean NOT NULL DEFAULT true,
  multi_level_approval boolean NOT NULL DEFAULT false,
  -- attendance thresholds (minutes)
  late_threshold_minutes int NOT NULL DEFAULT 5,
  no_show_threshold_minutes int NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enterprise-level pricing config (single row, super-admin managed)
CREATE TABLE IF NOT EXISTS public.timekeeping_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  per_employee_cents bigint NOT NULL DEFAULT 800,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.timekeeping_pricing (per_employee_cents, notes)
VALUES (800, 'Default $8 per active employee per month')
ON CONFLICT DO NOTHING;

-- 3. Pay periods (biweekly Sun-Sat anchored on 2025-12-21)
CREATE TABLE IF NOT EXISTS public.tk_payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open, closed, locked
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_tk_periods_company ON public.tk_payroll_periods(company_id, period_start DESC);

-- 4. Punches (immutable-ish source of truth; edits via reason code)
CREATE TABLE IF NOT EXISTS public.tk_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  punch_type text NOT NULL CHECK (punch_type IN ('clock_in','clock_out','meal_start','meal_end','break_start','break_end')),
  punched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'web', -- web, mobile, manual, kiosk, admin_edit
  job_code text,
  location_id uuid REFERENCES public.company_locations(id),
  geo_lat numeric(9,6),
  geo_lng numeric(9,6),
  ip_address inet,
  device text,
  notes text,
  edited boolean NOT NULL DEFAULT false,
  edit_reason text,
  edited_by uuid,
  edited_at timestamptz,
  voided boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tk_punches_emp_time ON public.tk_punches(employee_id, punched_at DESC);
CREATE INDEX IF NOT EXISTS idx_tk_punches_company_time ON public.tk_punches(company_id, punched_at DESC);

-- 5. Timecards (one per employee per pay period)
CREATE TABLE IF NOT EXISTS public.tk_timecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_period_id uuid NOT NULL REFERENCES public.tk_payroll_periods(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open', -- open, submitted, approved, rejected, locked
  regular_hours numeric(7,2) NOT NULL DEFAULT 0,
  overtime_hours numeric(7,2) NOT NULL DEFAULT 0,
  doubletime_hours numeric(7,2) NOT NULL DEFAULT 0,
  pto_hours numeric(7,2) NOT NULL DEFAULT 0,
  holiday_hours numeric(7,2) NOT NULL DEFAULT 0,
  unpaid_hours numeric(7,2) NOT NULL DEFAULT 0,
  total_hours numeric(7,2) NOT NULL DEFAULT 0,
  exception_count int NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  locked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, payroll_period_id)
);
CREATE INDEX IF NOT EXISTS idx_tk_timecards_company_status ON public.tk_timecards(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tk_timecards_period ON public.tk_timecards(payroll_period_id);

-- 6. Daily entries derived from punches (one row per worked day)
CREATE TABLE IF NOT EXISTS public.tk_timecard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timecard_id uuid NOT NULL REFERENCES public.tk_timecards(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  regular_hours numeric(5,2) NOT NULL DEFAULT 0,
  overtime_hours numeric(5,2) NOT NULL DEFAULT 0,
  doubletime_hours numeric(5,2) NOT NULL DEFAULT 0,
  pto_hours numeric(5,2) NOT NULL DEFAULT 0,
  holiday_hours numeric(5,2) NOT NULL DEFAULT 0,
  unpaid_hours numeric(5,2) NOT NULL DEFAULT 0,
  meal_minutes int NOT NULL DEFAULT 0,
  notes text,
  exception_codes text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timecard_id, work_date)
);

-- 7. Approval records (full chain)
CREATE TABLE IF NOT EXISTS public.tk_approval_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timecard_id uuid NOT NULL REFERENCES public.tk_timecards(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('submitted','approved','rejected','reopened','locked')),
  actor_id uuid,
  actor_name text,
  actor_role text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tk_approval_timecard ON public.tk_approval_records(timecard_id, created_at DESC);

-- 8. Attendance exceptions
CREATE TABLE IF NOT EXISTS public.tk_attendance_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  timecard_id uuid REFERENCES public.tk_timecards(id) ON DELETE SET NULL,
  exception_date date NOT NULL,
  exception_type text NOT NULL, -- missed_punch, late, early_out, no_show, missed_meal, short_meal, ot_risk
  severity text NOT NULL DEFAULT 'info', -- info, warning, critical
  details text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tk_exc_company ON public.tk_attendance_exceptions(company_id, resolved, exception_date DESC);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.timekeeping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timekeeping_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tk_payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tk_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tk_timecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tk_timecard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tk_approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tk_attendance_exceptions ENABLE ROW LEVEL SECURITY;

-- Pricing: super_admin only
CREATE POLICY "super admin full pricing" ON public.timekeeping_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "all read pricing" ON public.timekeeping_pricing
  FOR SELECT TO authenticated USING (true);

-- Settings
CREATE POLICY "super admin all settings" ON public.timekeeping_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "client read own settings" ON public.timekeeping_settings
  FOR SELECT TO authenticated
  USING (company_id::text = public.get_user_company(auth.uid()));
CREATE POLICY "client admin update own settings" ON public.timekeeping_settings
  FOR UPDATE TO authenticated
  USING (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(),'client_admin'))
  WITH CHECK (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(),'client_admin'));

-- Helper macro for company-scoped tables (super admin all + tenant scope)
DO $$ BEGIN
  -- periods
  EXECUTE $p$CREATE POLICY "super admin all periods" ON public.tk_payroll_periods FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'))$p$;
  EXECUTE $p$CREATE POLICY "tenant read periods" ON public.tk_payroll_periods FOR SELECT TO authenticated USING (company_id::text = public.get_user_company(auth.uid()))$p$;

  -- punches
  EXECUTE $p$CREATE POLICY "super admin all punches" ON public.tk_punches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'))$p$;
  EXECUTE $p$CREATE POLICY "tenant read punches" ON public.tk_punches FOR SELECT TO authenticated USING (company_id::text = public.get_user_company(auth.uid()))$p$;
  EXECUTE $p$CREATE POLICY "tenant insert punches" ON public.tk_punches FOR INSERT TO authenticated WITH CHECK (company_id::text = public.get_user_company(auth.uid()))$p$;
  EXECUTE $p$CREATE POLICY "client admin update punches" ON public.tk_punches FOR UPDATE TO authenticated USING (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(),'client_admin')) WITH CHECK (company_id::text = public.get_user_company(auth.uid()))$p$;

  -- timecards
  EXECUTE $p$CREATE POLICY "super admin all tc" ON public.tk_timecards FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'))$p$;
  EXECUTE $p$CREATE POLICY "tenant read tc" ON public.tk_timecards FOR SELECT TO authenticated USING (company_id::text = public.get_user_company(auth.uid()))$p$;
  EXECUTE $p$CREATE POLICY "tenant write tc" ON public.tk_timecards FOR INSERT TO authenticated WITH CHECK (company_id::text = public.get_user_company(auth.uid()))$p$;
  EXECUTE $p$CREATE POLICY "tenant update tc" ON public.tk_timecards FOR UPDATE TO authenticated USING (company_id::text = public.get_user_company(auth.uid())) WITH CHECK (company_id::text = public.get_user_company(auth.uid()))$p$;

  -- entries (scoped through timecard)
  EXECUTE $p$CREATE POLICY "super admin all entries" ON public.tk_timecard_entries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'))$p$;
  EXECUTE $p$CREATE POLICY "tenant rw entries" ON public.tk_timecard_entries FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.tk_timecards t WHERE t.id = timecard_id AND t.company_id::text = public.get_user_company(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.tk_timecards t WHERE t.id = timecard_id AND t.company_id::text = public.get_user_company(auth.uid())))$p$;

  -- approvals
  EXECUTE $p$CREATE POLICY "super admin all approvals" ON public.tk_approval_records FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'))$p$;
  EXECUTE $p$CREATE POLICY "tenant rw approvals" ON public.tk_approval_records FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.tk_timecards t WHERE t.id = timecard_id AND t.company_id::text = public.get_user_company(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.tk_timecards t WHERE t.id = timecard_id AND t.company_id::text = public.get_user_company(auth.uid())))$p$;

  -- exceptions
  EXECUTE $p$CREATE POLICY "super admin all exc" ON public.tk_attendance_exceptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'))$p$;
  EXECUTE $p$CREATE POLICY "tenant rw exc" ON public.tk_attendance_exceptions FOR ALL TO authenticated USING (company_id::text = public.get_user_company(auth.uid())) WITH CHECK (company_id::text = public.get_user_company(auth.uid()))$p$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at triggers
CREATE TRIGGER tk_settings_updated BEFORE UPDATE ON public.timekeeping_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tk_pricing_updated BEFORE UPDATE ON public.timekeeping_pricing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tk_timecards_updated BEFORE UPDATE ON public.tk_timecards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tk_entries_updated BEFORE UPDATE ON public.tk_timecard_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit triggers (use existing audit function)
CREATE TRIGGER tk_punches_audit AFTER INSERT OR UPDATE OR DELETE ON public.tk_punches FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER tk_timecards_audit AFTER INSERT OR UPDATE OR DELETE ON public.tk_timecards FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER tk_approvals_audit AFTER INSERT ON public.tk_approval_records FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER tk_settings_audit AFTER INSERT OR UPDATE ON public.timekeeping_settings FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- Seed biweekly periods anchored on 2025-12-21 → 2026-01-03 (pay 2026-01-09) for ALL companies, 6 periods forward
INSERT INTO public.tk_payroll_periods (company_id, period_start, period_end, pay_date, status)
SELECT c.id,
       (DATE '2025-12-21' + (n * 14))::date AS period_start,
       (DATE '2025-12-21' + (n * 14) + 13)::date AS period_end,
       (DATE '2026-01-09' + (n * 14))::date AS pay_date,
       'open'
FROM public.companies c
CROSS JOIN generate_series(0, 5) AS n
ON CONFLICT (company_id, period_start, period_end) DO NOTHING;
