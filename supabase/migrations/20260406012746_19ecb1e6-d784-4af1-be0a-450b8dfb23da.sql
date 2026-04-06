-- Enterprise Settings table
CREATE TABLE public.enterprise_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'general',
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '""'::jsonb,
  data_type text NOT NULL DEFAULT 'string',
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_enterprise_settings" ON public.enterprise_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Client Setting Overrides table
CREATE TABLE public.client_setting_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  override_value jsonb NOT NULL DEFAULT '""'::jsonb,
  inherited boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, setting_key)
);

ALTER TABLE public.client_setting_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_client_overrides" ON public.client_setting_overrides
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_overrides" ON public.client_setting_overrides
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND (company_id::text = get_user_company(auth.uid())));

CREATE TRIGGER update_client_overrides_updated_at
  BEFORE UPDATE ON public.client_setting_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Setting Audit Logs table
CREATE TABLE public.setting_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  scope text NOT NULL DEFAULT 'enterprise',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_by_email text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.setting_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_setting_audit" ON public.setting_audit_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_setting_audit" ON public.setting_audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client_admin'::app_role) AND company_id IS NOT NULL AND (company_id::text = get_user_company(auth.uid())));
