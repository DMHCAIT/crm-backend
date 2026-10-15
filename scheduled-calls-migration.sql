BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS "scheduledCallAt" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "scheduledCallDismissedAt" timestamp with time zone;

CREATE INDEX IF NOT EXISTS leads_pending_scheduled_calls_idx
  ON public.leads ("scheduledCallAt")
  WHERE "scheduledCallAt" IS NOT NULL AND "scheduledCallDismissedAt" IS NULL;

COMMIT;
