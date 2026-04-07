
-- Communications table
CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_type text NOT NULL CHECK (audience_type IN ('company', 'employee')),
  contact_type text NOT NULL DEFAULT 'primary_admin',
  selection_method text NOT NULL DEFAULT 'all' CHECK (selection_method IN ('all', 'segment', 'upload')),
  segment_id uuid,
  segment_name text,
  upload_summary jsonb,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'AtlasOne HR Support',
  reply_to text,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled', 'failed')),
  recipient_count int NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/New_York',
  lock_minutes int NOT NULL DEFAULT 15,
  created_by uuid,
  creator_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_communications" ON public.communications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON public.communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Communication recipients
CREATE TABLE public.communication_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.communications(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'employee')),
  entity_id uuid NOT NULL,
  entity_label text NOT NULL,
  email text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'bounced', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_comm_recipients" ON public.communication_recipients
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_comm_recipients_comm_id ON public.communication_recipients(communication_id);

-- Saved segments
CREATE TABLE public.saved_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_type text NOT NULL CHECK (target_type IN ('company', 'employee')),
  category text NOT NULL DEFAULT 'general',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  recipient_count_cache int,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_saved_segments" ON public.saved_segments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_saved_segments_updated_at
  BEFORE UPDATE ON public.saved_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
