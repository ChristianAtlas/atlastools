
-- 1) Add is_active_w9 flag to vendor_documents
ALTER TABLE public.vendor_documents
  ADD COLUMN IF NOT EXISTS is_active_w9 boolean NOT NULL DEFAULT false;

-- Backfill: for each vendor, mark the most recent W-9 as active
WITH ranked AS (
  SELECT id,
         vendor_id,
         row_number() OVER (PARTITION BY vendor_id ORDER BY created_at DESC) AS rn
  FROM public.vendor_documents
  WHERE document_type = 'w9'
)
UPDATE public.vendor_documents vd
SET is_active_w9 = true
FROM ranked
WHERE vd.id = ranked.id AND ranked.rn = 1;

-- Partial unique index: at most one active W-9 per vendor
CREATE UNIQUE INDEX IF NOT EXISTS vendor_documents_one_active_w9
  ON public.vendor_documents (vendor_id)
  WHERE document_type = 'w9' AND is_active_w9 = true;

-- 2) Trigger function: when a new W-9 is inserted (or updated to active),
-- demote any previous active W-9 for the same vendor and sync the vendor row.
CREATE OR REPLACE FUNCTION public.enforce_single_active_w9()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_type <> 'w9' THEN
    RETURN NEW;
  END IF;

  -- New W-9 rows default to active unless caller explicitly set false
  IF TG_OP = 'INSERT' AND NEW.is_active_w9 IS DISTINCT FROM false THEN
    NEW.is_active_w9 := true;
  END IF;

  -- Demote any other active W-9s for this vendor BEFORE writing this row,
  -- so the partial unique index never conflicts.
  IF NEW.is_active_w9 = true THEN
    UPDATE public.vendor_documents
       SET is_active_w9 = false,
           updated_at = now()
     WHERE vendor_id = NEW.vendor_id
       AND document_type = 'w9'
       AND is_active_w9 = true
       AND id <> NEW.id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_single_active_w9 ON public.vendor_documents;
CREATE TRIGGER trg_enforce_single_active_w9
BEFORE INSERT OR UPDATE OF is_active_w9, document_type
ON public.vendor_documents
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_w9();

-- 3) Sync the parent vendor's W-9 status when the active W-9 changes.
CREATE OR REPLACE FUNCTION public.sync_vendor_w9_from_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_doc RECORD;
BEGIN
  -- Pick the vendor we care about based on the operation
  IF (TG_OP = 'DELETE') THEN
    SELECT * INTO active_doc
      FROM public.vendor_documents
     WHERE vendor_id = OLD.vendor_id
       AND document_type = 'w9'
       AND is_active_w9 = true
     LIMIT 1;

    IF NOT FOUND THEN
      UPDATE public.vendors
         SET w9_status = CASE
                           WHEN w9_expires_at IS NOT NULL AND w9_expires_at < CURRENT_DATE
                             THEN 'expired'::vendor_w9_status
                           ELSE 'not_collected'::vendor_w9_status
                         END,
             w9_collected_at = NULL,
             updated_at = now()
       WHERE id = OLD.vendor_id;
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT or UPDATE: only act when this row is (or just became) the active W-9
  IF NEW.document_type = 'w9' AND NEW.is_active_w9 = true THEN
    UPDATE public.vendors
       SET w9_status = 'on_file'::vendor_w9_status,
           w9_collected_at = COALESCE(NEW.created_at, now()),
           updated_at = now()
     WHERE id = NEW.vendor_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_vendor_w9_after ON public.vendor_documents;
CREATE TRIGGER trg_sync_vendor_w9_after
AFTER INSERT OR UPDATE OF is_active_w9 OR DELETE
ON public.vendor_documents
FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_w9_from_documents();
