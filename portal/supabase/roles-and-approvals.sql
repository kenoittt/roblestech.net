-- ============================================================================
-- Roles + approval workflow (run once in Supabase for the portal/PPM project)
-- ============================================================================

-- 1. Add the super_admin role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('super_admin', 'admin', 'staff', 'client'));

-- 2. Make the two of us super admins (edit the emails if needed).
update public.profiles set role = 'super_admin'
where id in (select id from auth.users where email in ('kenneth@roblestech.net', 'christian@roblestech.net'));

-- 3. super_admin counts as admin AND as a PPM user everywhere (so existing
--    RLS policies and PPM access keep working for super admins).
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'));
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.is_ppm_user()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('super_admin', 'admin', 'staff'));
$$;

-- 4. Approval queue: regular admins' add/edit/delete land here as pending
--    requests until a super admin approves (then the change is applied).
create table if not exists public.change_requests (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,                 -- client_create | client_update | client_delete | link_client | save_config
  payload      jsonb not null default '{}'::jsonb,
  reason       text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by   uuid references auth.users(id) on delete set null,
  decided_at   timestamptz,
  note         text
);
create index if not exists change_requests_status_idx on public.change_requests (status, requested_at desc);

alter table public.change_requests enable row level security;
drop policy if exists cr_read on public.change_requests;
create policy cr_read on public.change_requests for select using (public.is_admin());
-- Writes go through the server (service role); no client-side write policy.
