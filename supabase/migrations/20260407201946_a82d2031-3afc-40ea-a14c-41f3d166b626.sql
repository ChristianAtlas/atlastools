
CREATE TABLE public.ach_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'employee')),
  entity_id uuid NOT NULL,
  entity_label text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  collection_date date NOT NULL,
  settle_date date NOT NULL,
  internal_note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'settled', 'failed', 'cancelled')),
  nacha_generated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ach_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_all_ach_transactions" ON public.ach_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_ach_transactions_updated_at
  BEFORE UPDATE ON public.ach_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
