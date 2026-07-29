-- TrailMate — extensions and private helper schema
-- SDS §6: PostGIS for "hikes within X km", pg_cron for auto-complete / payout release.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext" with schema extensions;
create extension if not exists "postgis" with schema extensions;

-- pg_cron and pg_net require superuser. On hosted Supabase enable them from
-- Dashboard → Database → Extensions; locally the CLI runs as superuser so these succeed.
-- Guarded so a restricted role can still apply the rest of the migration set.
do $$
begin
  create extension if not exists "pg_cron";
exception when insufficient_privilege or feature_not_supported then
  raise notice 'pg_cron unavailable — enable it in the dashboard, then re-run 000900_cron.sql';
end $$;

do $$
begin
  create extension if not exists "pg_net" with schema extensions;
exception when insufficient_privilege or feature_not_supported then
  raise notice 'pg_net unavailable — cron cannot invoke Edge Functions until it is enabled';
end $$;

-- `app` holds security helpers used by RLS policies and triggers. It is deliberately NOT
-- in PostgREST's exposed schema list, so nothing here is reachable from the client.
create schema if not exists app;

grant usage on schema app to authenticated, anon, service_role;

-- Default-deny: helpers are granted EXECUTE individually as they are defined.
alter default privileges in schema app revoke execute on functions from public;
