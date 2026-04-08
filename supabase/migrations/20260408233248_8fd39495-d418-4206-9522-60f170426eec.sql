-- Add is_demo flag to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Add is_demo flag to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Flag existing demo company (Acme Corp used by demo accounts)
UPDATE public.companies SET is_demo = true WHERE id = 'd5415c8f-a972-4d62-998a-7468fc913578';

-- Flag all employees belonging to demo companies
UPDATE public.employees SET is_demo = true WHERE company_id IN (SELECT id FROM public.companies WHERE is_demo = true);