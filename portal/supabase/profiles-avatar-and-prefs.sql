-- ============================================================================
-- Self-service profiles: display name (already there), profile picture, and an
-- opt-out for PPM notification emails. Run once in the shared Supabase project
-- (the one the portal and PPM both use). Safe to re-run.
-- ============================================================================

alter table public.profiles add column if not exists avatar_url     text;
alter table public.profiles add column if not exists email_opt_out  boolean not null default false;

-- Private bucket for profile pictures. Like the reports bucket, there are no
-- public storage policies: each app streams an avatar through its own
-- /api/avatar/<user-id> route with the service role, after checking the
-- request's session. That also keeps the images same-origin, which the apps'
-- Content-Security-Policy (img-src 'self') requires.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;
