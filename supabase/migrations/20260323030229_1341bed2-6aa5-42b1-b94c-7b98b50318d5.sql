
-- ═══════════════════════════════════════════════
-- audit_logs — append-only audit trail
-- ═══════════════════════════════════════════════
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id uuid,                               -- NULL for system/trigger actions
  user_email text,
  user_role text,
  
  -- What
  action text NOT NULL,                        -- INSERT, UPDATE, DELETE
  table_name text NOT NULL,
  record_id text NOT NULL,                     -- PK of affected row
  
  -- Change detail
  old_data jsonb,                              -- previous row state (NULL on INSERT)
  new_data jsonb,                              -- new row state (NULL on DELETE)
  changed_fields text[],                       -- list of changed column names
  
  -- Context
  company_id text,                             -- tenant context if applicable
  ip_address inet,
  user_agent text,
  
  -- When
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_table ON public.audit_logs (table_name, created_at DESC);
CREATE INDEX idx_audit_logs_record ON public.audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_company ON public.audit_logs (company_id, created_at DESC) WHERE company_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- Make table append-only: no UPDATE or DELETE allowed
-- (enforced via RLS — only INSERT permitted)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can read all audit logs
CREATE POLICY "sa_read_audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Client admins can read audit logs for their company
CREATE POLICY "ca_read_own_audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND company_id = public.get_user_company(auth.uid())
  );

-- Allow inserts from triggers (service role / trigger context)
-- Triggers run as table owner, bypassing RLS, so this policy
-- is for edge-function or app-level inserts
CREATE POLICY "system_insert_audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policies = append-only enforced by RLS

-- ═══════════════════════════════════════════════
-- Generic audit trigger function
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _record_id text;
  _old_data jsonb := NULL;
  _new_data jsonb := NULL;
  _changed_fields text[] := '{}';
  _company_id text := NULL;
  _user_id uuid := NULL;
  _user_email text := NULL;
  _user_role text := NULL;
  _action text;
  _col text;
BEGIN
  -- Determine action
  _action := TG_OP;

  -- Get current user context (may be NULL in trigger context)
  BEGIN
    _user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
  END;

  -- Try to get user email
  IF _user_id IS NOT NULL THEN
    SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
    SELECT role::text INTO _user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  END IF;

  -- Build old/new data and extract record ID + company_id
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::text;
    _old_data := to_jsonb(OLD);
    -- Extract company_id if column exists
    IF _old_data ? 'company_id' THEN
      _company_id := _old_data->>'company_id';
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    _record_id := NEW.id::text;
    _new_data := to_jsonb(NEW);
    IF _new_data ? 'company_id' THEN
      _company_id := _new_data->>'company_id';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    _record_id := NEW.id::text;
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    IF _new_data ? 'company_id' THEN
      _company_id := _new_data->>'company_id';
    END IF;

    -- Compute changed fields (skip updated_at noise)
    FOR _col IN SELECT key FROM jsonb_each(_new_data)
    LOOP
      IF _col NOT IN ('updated_at', 'created_at') THEN
        IF (_old_data->_col)::text IS DISTINCT FROM (_new_data->_col)::text THEN
          _changed_fields := array_append(_changed_fields, _col);
        END IF;
      END IF;
    END LOOP;

    -- Skip audit if nothing meaningful changed
    IF array_length(_changed_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Strip sensitive fields from stored data
  _old_data := _old_data - 'ssn_encrypted';
  _new_data := _new_data - 'ssn_encrypted';

  -- Insert audit record
  INSERT INTO public.audit_logs (
    user_id, user_email, user_role,
    action, table_name, record_id,
    old_data, new_data, changed_fields,
    company_id
  ) VALUES (
    _user_id, _user_email, _user_role,
    _action, TG_TABLE_NAME, _record_id,
    _old_data, _new_data, _changed_fields,
    _company_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════
-- Attach triggers to sensitive tables
-- ═══════════════════════════════════════════════

-- employees
CREATE TRIGGER trg_audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- payroll_runs
CREATE TRIGGER trg_audit_payroll_runs
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- payroll_run_employees
CREATE TRIGGER trg_audit_payroll_run_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.payroll_run_employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- companies
CREATE TRIGGER trg_audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- compensation_records
CREATE TRIGGER trg_audit_compensation_records
  AFTER INSERT OR UPDATE OR DELETE ON public.compensation_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- employment_records
CREATE TRIGGER trg_audit_employment_records
  AFTER INSERT OR UPDATE OR DELETE ON public.employment_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- user_roles
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- invoices
CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
