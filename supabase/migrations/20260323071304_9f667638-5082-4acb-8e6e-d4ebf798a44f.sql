
-- internal_notes: super_admin-only notes linked to any record
CREATE TABLE public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL,          -- e.g. 'payroll_run', 'employee'
  record_id text NOT NULL,            -- FK to the record
  author_id uuid NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL,
  content text NOT NULL,
  jira_ref text,                      -- optional Jira ticket reference
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_internal_notes_record ON public.internal_notes (record_type, record_id);

-- RLS: super_admin only
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_internal_notes" ON public.internal_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Audit trigger
CREATE TRIGGER audit_internal_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.internal_notes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
