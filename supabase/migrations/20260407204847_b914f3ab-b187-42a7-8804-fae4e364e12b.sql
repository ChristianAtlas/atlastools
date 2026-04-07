
-- Create storage bucket for rate notices
INSERT INTO storage.buckets (id, name, public) VALUES ('rate-notices', 'rate-notices', false);

-- Storage policies for rate-notices bucket
CREATE POLICY "Super admins can view all rate notices"
ON storage.objects FOR SELECT
USING (bucket_id = 'rate-notices' AND public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Client admins can view own rate notices"
ON storage.objects FOR SELECT
USING (bucket_id = 'rate-notices' AND public.has_role(auth.uid(), 'client_admin'::public.app_role) AND (storage.foldername(name))[1] = public.get_user_company(auth.uid()));

CREATE POLICY "Authenticated users can upload rate notices"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rate-notices' AND auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can delete rate notices"
ON storage.objects FOR DELETE
USING (bucket_id = 'rate-notices' AND public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Add account_number and rate_notice_path to client_sui_rates
ALTER TABLE public.client_sui_rates
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS rate_notice_path text;
