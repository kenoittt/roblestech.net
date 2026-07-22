-- ============================================================================
-- WanderWise — trip sharing enablement. Run once in the WanderWise Supabase
-- SQL editor (after schema.sql).
--  1) profiles.email so invites can look people up by email
--  2) members may remove THEMSELVES (leave a trip); owner still manages all
-- ============================================================================

-- 1) Email + passport country on profiles (synced on signup; email backfilled)
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists passport_country text;
create unique index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, passport_country)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
          new.email,
          nullif(new.raw_user_meta_data->>'passport_country', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null;

-- 2) Leave a trip: a member may delete their own membership row
drop policy if exists members_leave on public.trip_members;
create policy members_leave on public.trip_members
  for delete using (user_id = auth.uid());

-- 3) Destination photo cache (filled automatically from Wikipedia on first view)
alter table public.destinations add column if not exists image_url text;
