
-- Helper: resolve the employee row for the signed-in user
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1
$$;

-- ============ timekeeping_pricing ============
DROP POLICY IF EXISTS "all read pricing" ON public.timekeeping_pricing;
DROP POLICY IF EXISTS "super admin full pricing" ON public.timekeeping_pricing;
CREATE POLICY "pricing super admin" ON public.timekeeping_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "pricing authenticated read" ON public.timekeeping_pricing
  FOR SELECT TO authenticated USING (true);

-- ============ timekeeping_settings ============
DROP POLICY IF EXISTS "client admin update own settings" ON public.timekeeping_settings;
DROP POLICY IF EXISTS "client read own settings" ON public.timekeeping_settings;
DROP POLICY IF EXISTS "super admin all settings" ON public.timekeeping_settings;

CREATE POLICY "tk_settings super admin" ON public.timekeeping_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tk_settings tenant read" ON public.timekeeping_settings
  FOR SELECT TO authenticated
  USING (company_id::text = public.get_user_company(auth.uid()));
CREATE POLICY "tk_settings client admin insert" ON public.timekeeping_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id::text = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'client_admin')
  );
CREATE POLICY "tk_settings client admin update" ON public.timekeeping_settings
  FOR UPDATE TO authenticated
  USING (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'))
  WITH CHECK (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'));

-- ============ tk_punches ============
DROP POLICY IF EXISTS "tenant read punches" ON public.tk_punches;
DROP POLICY IF EXISTS "tenant insert punches" ON public.tk_punches;
DROP POLICY IF EXISTS "client admin update punches" ON public.tk_punches;
DROP POLICY IF EXISTS "super admin all punches" ON public.tk_punches;

CREATE POLICY "punches super admin" ON public.tk_punches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "punches client admin" ON public.tk_punches
  FOR ALL TO authenticated
  USING (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'))
  WITH CHECK (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "punches employee read own" ON public.tk_punches
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());
CREATE POLICY "punches employee insert own" ON public.tk_punches
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.current_employee_id()
    AND company_id::text = public.get_user_company(auth.uid())
  );

-- ============ tk_timecards ============
DROP POLICY IF EXISTS "tenant read tc" ON public.tk_timecards;
DROP POLICY IF EXISTS "tenant write tc" ON public.tk_timecards;
DROP POLICY IF EXISTS "tenant update tc" ON public.tk_timecards;
DROP POLICY IF EXISTS "super admin all tc" ON public.tk_timecards;

CREATE POLICY "tc super admin" ON public.tk_timecards
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tc client admin" ON public.tk_timecards
  FOR ALL TO authenticated
  USING (
    company_id::text = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'client_admin')
    AND locked_at IS NULL
  )
  WITH CHECK (
    company_id::text = public.get_user_company(auth.uid())
    AND public.has_role(auth.uid(), 'client_admin')
  );
CREATE POLICY "tc employee read own" ON public.tk_timecards
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());
CREATE POLICY "tc employee insert own" ON public.tk_timecards
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = public.current_employee_id()
    AND company_id::text = public.get_user_company(auth.uid())
    AND status IN ('draft','submitted')
  );
CREATE POLICY "tc employee update own draft" ON public.tk_timecards
  FOR UPDATE TO authenticated
  USING (
    employee_id = public.current_employee_id()
    AND status IN ('draft','rejected')
    AND locked_at IS NULL
  )
  WITH CHECK (
    employee_id = public.current_employee_id()
    AND status IN ('draft','submitted')
  );

-- ============ tk_timecard_entries ============
DROP POLICY IF EXISTS "tenant rw entries" ON public.tk_timecard_entries;
DROP POLICY IF EXISTS "super admin all entries" ON public.tk_timecard_entries;

CREATE POLICY "entries super admin" ON public.tk_timecard_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "entries client admin" ON public.tk_timecard_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_timecard_entries.timecard_id
        AND t.company_id::text = public.get_user_company(auth.uid())
        AND public.has_role(auth.uid(), 'client_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_timecard_entries.timecard_id
        AND t.company_id::text = public.get_user_company(auth.uid())
        AND public.has_role(auth.uid(), 'client_admin')
    )
  );
CREATE POLICY "entries employee read own" ON public.tk_timecard_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_timecard_entries.timecard_id
        AND t.employee_id = public.current_employee_id()
    )
  );
CREATE POLICY "entries employee write own draft" ON public.tk_timecard_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_timecard_entries.timecard_id
        AND t.employee_id = public.current_employee_id()
        AND t.status IN ('draft','rejected')
        AND t.locked_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_timecard_entries.timecard_id
        AND t.employee_id = public.current_employee_id()
        AND t.status IN ('draft','rejected')
    )
  );

-- ============ tk_approval_records ============
DROP POLICY IF EXISTS "tenant rw approvals" ON public.tk_approval_records;
DROP POLICY IF EXISTS "super admin all approvals" ON public.tk_approval_records;

CREATE POLICY "approvals super admin" ON public.tk_approval_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "approvals tenant read" ON public.tk_approval_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_approval_records.timecard_id
        AND t.company_id::text = public.get_user_company(auth.uid())
    )
  );
CREATE POLICY "approvals client admin write" ON public.tk_approval_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'client_admin')
    AND EXISTS (
      SELECT 1 FROM public.tk_timecards t
      WHERE t.id = tk_approval_records.timecard_id
        AND t.company_id::text = public.get_user_company(auth.uid())
    )
  );

-- ============ tk_attendance_exceptions ============
DROP POLICY IF EXISTS "tenant rw exc" ON public.tk_attendance_exceptions;
DROP POLICY IF EXISTS "super admin all exc" ON public.tk_attendance_exceptions;

CREATE POLICY "exc super admin" ON public.tk_attendance_exceptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "exc client admin" ON public.tk_attendance_exceptions
  FOR ALL TO authenticated
  USING (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'))
  WITH CHECK (company_id::text = public.get_user_company(auth.uid()) AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "exc employee read own" ON public.tk_attendance_exceptions
  FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());
