-- Run in the Supabase SQL editor before deploying duplicate-aware lead entry.
-- Existing duplicates are preserved; only new or changed contacts are checked.
BEGIN;

CREATE OR REPLACE FUNCTION public.crm_normalize_lead_email(value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT nullif(lower(btrim(value)), '') $$;

CREATE OR REPLACE FUNCTION public.crm_normalize_lead_phone(value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT nullif(regexp_replace(regexp_replace(value, '[^0-9]', '', 'g'), '^00', ''), '') $$;

CREATE INDEX IF NOT EXISTS leads_contact_email_lookup
ON public.leads (public.crm_normalize_lead_email(email))
WHERE public.crm_normalize_lead_email(email) IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_contact_phone_lookup
ON public.leads (public.crm_normalize_lead_phone(phone))
WHERE public.crm_normalize_lead_phone(phone) IS NOT NULL;

-- A row per contact serializes competing writers without changing legacy leads.
CREATE TABLE IF NOT EXISTS public.crm_lead_contact_locks (
  contact_type text NOT NULL CHECK (contact_type IN ('email', 'phone')),
  contact text NOT NULL,
  PRIMARY KEY (contact_type, contact)
);
REVOKE ALL ON TABLE public.crm_lead_contact_locks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.crm_prevent_new_lead_duplicates()
RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  new_email text := public.crm_normalize_lead_email(NEW.email);
  new_phone text := public.crm_normalize_lead_phone(NEW.phone);
  check_email boolean := true;
  check_phone boolean := true;
  contact_key record;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    check_email := new_email IS DISTINCT FROM public.crm_normalize_lead_email(OLD.email);
    check_phone := new_phone IS DISTINCT FROM public.crm_normalize_lead_phone(OLD.phone);
  END IF;

  IF check_phone AND (
    NEW.phone IS NULL
    OR btrim(NEW.phone) !~ '^\+[1-9][0-9[:space:]()-]{6,28}$'
    OR length(new_phone) NOT BETWEEN 7 AND 15
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Phone must include +country code and 7 to 15 digits (for example +91 9876543210)';
  END IF;

  FOR contact_key IN
    SELECT v.contact_type, v.contact
    FROM (VALUES
      ('email', CASE WHEN check_email THEN new_email END),
      ('phone', CASE WHEN check_phone THEN new_phone END)
    ) AS v(contact_type, contact)
    WHERE v.contact IS NOT NULL
    ORDER BY v.contact_type, v.contact
  LOOP
    -- An UPDATE, not DO NOTHING, also prevents stale-snapshot writes at higher isolation.
    INSERT INTO public.crm_lead_contact_locks AS locks (contact_type, contact)
    VALUES (contact_key.contact_type, contact_key.contact)
    ON CONFLICT (contact_type, contact) DO UPDATE SET contact = EXCLUDED.contact;

    IF EXISTS (
      SELECT 1 FROM public.leads l
      WHERE (TG_OP = 'INSERT' OR l.id IS DISTINCT FROM OLD.id)
        AND (
          (contact_key.contact_type = 'email' AND public.crm_normalize_lead_email(l.email) = contact_key.contact)
          OR (contact_key.contact_type = 'phone' AND public.crm_normalize_lead_phone(l.phone) = contact_key.contact)
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'Duplicate lead violates unique constraint "leads_unique_contact_' || contact_key.contact_type || '"',
        CONSTRAINT = 'leads_unique_contact_' || contact_key.contact_type;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.crm_prevent_new_lead_duplicates() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS crm_prevent_new_lead_duplicates ON public.leads;
CREATE TRIGGER crm_prevent_new_lead_duplicates
BEFORE INSERT OR UPDATE OF email, phone ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_prevent_new_lead_duplicates();

CREATE OR REPLACE FUNCTION public.crm_find_lead_contacts(emails text[], phones text[])
RETURNS TABLE(id text, email text, phone text, "assignedTo" text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT l.id::text, l.email::text, l.phone::text, l."assignedTo"::text
  FROM public.leads l
  WHERE public.crm_normalize_lead_email(l.email) = ANY(emails)
     OR public.crm_normalize_lead_phone(l.phone) = ANY(phones)
  ORDER BY l.id
$$;

REVOKE ALL ON FUNCTION public.crm_find_lead_contacts(text[], text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_find_lead_contacts(text[], text[]) TO service_role;

COMMIT;
