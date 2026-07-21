-- ============================================================================
-- Robles Technologies Corp. — client portal schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It creates the tables, the private report bucket, and the Row-Level Security
-- policies that guarantee a client can only ever see their own data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per client company.
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Links each auth user to a client and a role.
--   role = 'admin'  -> RTC staff (see everything, use the admin page)
--   role = 'client' -> a client login (sees only their own client's reports)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  client_id   uuid references public.clients(id) on delete set null,
  role        text not null default 'client' check (role in ('admin', 'client')),
  full_name   text,
  created_at  timestamptz not null default now()
);

-- One row per monthly report. The HTML itself lives in private Storage;
-- storage_path points at it. This table is what gives clients their history.
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  title         text not null,                 -- e.g. "SEO Report — March 2026"
  period        date not null,                 -- first day of the reported month
  storage_path  text not null,                 -- path in the 'reports' bucket
  created_at    timestamptz not null default now()
);

create index if not exists reports_client_period_idx
  on public.reports (client_id, period desc);

-- ---------------------------------------------------------------------------
-- Helper: is the current user an RTC admin?
-- SECURITY DEFINER so it can read profiles without tripping RLS recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: the client_id attached to the current user (null for admins/unlinked).
create or replace function public.my_client_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security — the core of the isolation guarantee
-- ---------------------------------------------------------------------------
alter table public.clients  enable row level security;
alter table public.profiles enable row level security;
alter table public.reports  enable row level security;

-- profiles: you can read your own profile; admins can read all.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- clients: you can read only the client you belong to; admins can read all.
drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients
  for select using (id = public.my_client_id() or public.is_admin());

-- reports: you can read only your own client's reports; admins can read all.
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports
  for select using (client_id = public.my_client_id() or public.is_admin());

-- Writes (create clients, profiles, reports) happen only through the server
-- using the service_role key, which bypasses RLS. No client-side writes.

-- ---------------------------------------------------------------------------
-- Private Storage bucket for the report HTML files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

-- No public storage policies: report files are fetched server-side with the
-- service_role key only after the request's session is verified to own them.
