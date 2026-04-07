-- Add rate basis (per_hundred or per_hour) and internal markup rate
ALTER TABLE public.workers_comp_codes
  ADD COLUMN rate_basis text NOT NULL DEFAULT 'per_hundred',
  ADD COLUMN internal_markup_rate numeric NOT NULL DEFAULT 0;