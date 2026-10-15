-- Run before deploying the overdue-filter update. No lead records are changed.
BEGIN;

CREATE OR REPLACE VIEW public.crm_overdue_leads
WITH (security_invoker = true)
AS
SELECT *
FROM public.leads
WHERE "followUp" IS NOT NULL
  AND "followUp" < now()
  AND (status IS NULL OR status NOT IN ('Enrolled', 'Not Interested'))
  AND ("updatedAt" IS NULL OR "updatedAt" <= "followUp");

REVOKE ALL ON public.crm_overdue_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.crm_overdue_leads TO service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;
