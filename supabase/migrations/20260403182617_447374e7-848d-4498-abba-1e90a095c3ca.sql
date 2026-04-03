
-- Compliance items: universal compliance tracker
CREATE TABLE public.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('enterprise', 'client', 'employee')),
  entity_id text NOT NULL, -- company_id or employee_id depending on entity_type
  company_id text, -- for client/employee items, links to company
  category text NOT NULL DEFAULT 'general',
  subcategory text,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'compliant', 'at_risk', 'non_compliant', 'expired', 'waived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date date,
  completed_at timestamptz,
  completed_by uuid,
  assigned_to uuid,
  assigned_to_name text,
  state_code text, -- US state abbreviation
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  compliance_score integer DEFAULT 0 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  is_recurring boolean DEFAULT false,
  recurrence_interval text CHECK (recurrence_interval IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  next_recurrence_date date,
  parent_item_id uuid REFERENCES public.compliance_items(id),
  blocker boolean DEFAULT false, -- blocks payroll if true
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_compliance_items" ON public.compliance_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_compliance_items" ON public.compliance_items
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role) 
    AND entity_type IN ('client', 'employee')
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "emp_read_own_compliance_items" ON public.compliance_items
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'employee'::app_role)
    AND entity_type = 'employee'
    AND entity_id IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
  );

CREATE INDEX idx_compliance_items_entity ON public.compliance_items(entity_type, entity_id);
CREATE INDEX idx_compliance_items_status ON public.compliance_items(status);
CREATE INDEX idx_compliance_items_due_date ON public.compliance_items(due_date);
CREATE INDEX idx_compliance_items_company ON public.compliance_items(company_id);

-- Compliance licenses & registrations
CREATE TABLE public.compliance_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('enterprise', 'client')),
  entity_id text NOT NULL,
  company_id text,
  license_type text NOT NULL, -- peo_license, sui_account, state_withholding, workers_comp, business_entity, cpeo, etc.
  state_code text,
  license_number text,
  account_number text,
  issuing_authority text,
  issue_date date,
  expiration_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'expiring', 'expired', 'revoked', 'not_required')),
  renewal_date date,
  renewal_status text CHECK (renewal_status IN ('not_due', 'upcoming', 'in_progress', 'submitted', 'approved', 'overdue')),
  owner_id uuid,
  owner_name text,
  filing_frequency text CHECK (filing_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  sui_rate numeric,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_compliance_licenses" ON public.compliance_licenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_compliance_licenses" ON public.compliance_licenses
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND entity_type = 'client'
    AND company_id = get_user_company(auth.uid())
  );

CREATE INDEX idx_compliance_licenses_entity ON public.compliance_licenses(entity_type, entity_id);
CREATE INDEX idx_compliance_licenses_state ON public.compliance_licenses(state_code);
CREATE INDEX idx_compliance_licenses_expiration ON public.compliance_licenses(expiration_date);

-- Compliance documents
CREATE TABLE public.compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('enterprise', 'client', 'employee')),
  entity_id text NOT NULL,
  company_id text,
  compliance_item_id uuid REFERENCES public.compliance_items(id),
  compliance_license_id uuid REFERENCES public.compliance_licenses(id),
  document_type text NOT NULL, -- license, certificate, filing, form, agreement, notice, etc.
  title text NOT NULL,
  description text,
  file_name text,
  file_path text,
  file_size integer,
  mime_type text,
  version integer DEFAULT 1,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'superseded', 'draft')),
  uploaded_by uuid NOT NULL,
  uploaded_by_name text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_compliance_documents" ON public.compliance_documents
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_compliance_documents" ON public.compliance_documents
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "ca_insert_own_compliance_documents" ON public.compliance_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "emp_read_own_compliance_documents" ON public.compliance_documents
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'employee'::app_role)
    AND entity_type = 'employee'
    AND entity_id IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "emp_insert_own_compliance_documents" ON public.compliance_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'employee'::app_role)
    AND entity_type = 'employee'
    AND entity_id IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
  );

CREATE INDEX idx_compliance_documents_entity ON public.compliance_documents(entity_type, entity_id);
CREATE INDEX idx_compliance_documents_item ON public.compliance_documents(compliance_item_id);

-- Compliance alerts
CREATE TABLE public.compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('enterprise', 'client', 'employee')),
  entity_id text NOT NULL,
  company_id text,
  compliance_item_id uuid REFERENCES public.compliance_items(id),
  compliance_license_id uuid REFERENCES public.compliance_licenses(id),
  alert_type text NOT NULL CHECK (alert_type IN ('expiration', 'deadline', 'missing_document', 'missing_registration', 'overdue', 'risk_change', 'escalation', 'renewal', 'new_requirement')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  escalated boolean DEFAULT false,
  escalated_at timestamptz,
  due_date date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_compliance_alerts" ON public.compliance_alerts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "ca_read_own_compliance_alerts" ON public.compliance_alerts
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'client_admin'::app_role)
    AND company_id = get_user_company(auth.uid())
  );

CREATE POLICY "emp_read_own_compliance_alerts" ON public.compliance_alerts
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'employee'::app_role)
    AND entity_type = 'employee'
    AND entity_id IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
  );

CREATE INDEX idx_compliance_alerts_entity ON public.compliance_alerts(entity_type, entity_id);
CREATE INDEX idx_compliance_alerts_severity ON public.compliance_alerts(severity);
CREATE INDEX idx_compliance_alerts_unread ON public.compliance_alerts(is_read) WHERE is_read = false;

-- Triggers for updated_at
CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_compliance_licenses_updated_at
  BEFORE UPDATE ON public.compliance_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_compliance_documents_updated_at
  BEFORE UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit triggers
CREATE TRIGGER audit_compliance_items
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_compliance_licenses
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_licenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
