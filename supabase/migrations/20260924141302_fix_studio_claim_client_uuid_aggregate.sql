DO $migration$
DECLARE
  definition text;
BEGIN
  SELECT pg_get_functiondef('public.studio_claim_client_by_verified_email()'::regprocedure) INTO definition;
  IF strpos(definition, 'select count(*), min(id)') = 0 THEN
    RAISE EXCEPTION 'Client claim definition changed; re-audit before applying';
  END IF;
  EXECUTE replace(definition, 'select count(*), min(id)', 'select count(*), min(id::text)::uuid');
END;
$migration$;
