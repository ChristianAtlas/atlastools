
-- Drop existing permissive policies on nsf_events
DROP POLICY IF EXISTS "Authenticated users can manage nsf_events" ON public.nsf_events;
DROP POLICY IF EXISTS "Authenticated users can read nsf_events" ON public.nsf_events;
DROP POLICY IF EXISTS "authenticated_all_nsf_events" ON public.nsf_events;
DROP POLICY IF EXISTS "authenticated_read_nsf_events" ON public.nsf_events;

-- Remove any remaining ALL/SELECT policies that use true
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'nsf_events' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.nsf_events', pol.policyname);
  END LOOP;
END $$;

-- Super admins: full access
CREATE POLICY "sa_all_nsf_events"
ON public.nsf_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Client admins: read-only, scoped to own company
CREATE POLICY "ca_read_own_nsf_events"
ON public.nsf_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'client_admin'::app_role)
  AND (company_id)::text = public.get_user_company(auth.uid())
);
