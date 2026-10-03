-- =============================================================================
-- Baseline: the live PPM and portal schema, copied from the roblestech.net repo
-- (commit 446741f, 2026-10-01) in the safe order recorded in
-- RTC-Website-Notes/docs/system/platform.md. It recreates the shared database
-- locally so the new PPM can be built without touching production.
-- The only change: inserts into storage.buckets are wrapped in a guard, because
-- a local database can apply migrations before the storage schema exists.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- From portal/supabase/schema.sql
-- -----------------------------------------------------------------------------
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

-- Living-dashboard fields (GSC-driven dashboard).
--   gsc_property   : Search Console property, e.g. 'https://promixnutrition.com/'
--   config         : per-client manual content (brand, hero, baseline, aiAudit,
--                    pipeline, openItems) — edited in the admin panel
--   gsc_data       : the GSC numbers, refreshed daily by the cron
alter table public.clients add column if not exists gsc_property   text;
alter table public.clients add column if not exists config         jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists gsc_data       jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists gsc_updated_at timestamptz;

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

-- Self-service profile fields (see supabase/profiles-avatar-and-prefs.sql).
--   avatar_url    : path in the private 'avatars' bucket, not a public URL
--   email_opt_out : user turned off PPM notification emails
alter table public.profiles add column if not exists avatar_url    text;
alter table public.profiles add column if not exists email_opt_out boolean not null default false;

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
do $guard$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('reports', 'reports', false)
    on conflict (id) do nothing;
  end if;
end $guard$;

-- No public storage policies: report files are fetched server-side with the
-- service_role key only after the request's session is verified to own them.

-- -----------------------------------------------------------------------------
-- From ppm/supabase/schema.sql
-- -----------------------------------------------------------------------------
-- ============================================================================
-- Robles Tech PPM — schema (run once in the SAME Supabase project as the portal)
-- ============================================================================

-- Allow a 'staff' role for internal PPM users (portal used admin/client only).
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'staff', 'client'));

-- Projects -------------------------------------------------------------------
create table if not exists public.ppm_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text default '#0464DD',
  archived    boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Tasks ----------------------------------------------------------------------
create table if not exists public.ppm_tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.ppm_projects(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date     date,
  assignee_id  uuid references auth.users(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
-- Widen the status check on projects created before 'cancelled' existed.
-- (create table if not exists above is a no-op on an existing table.)
alter table public.ppm_tasks drop constraint if exists ppm_tasks_status_check;
alter table public.ppm_tasks
  add constraint ppm_tasks_status_check check (status in ('todo', 'in_progress', 'done', 'cancelled'));

create index if not exists ppm_tasks_status_idx on public.ppm_tasks (status);
create index if not exists ppm_tasks_assignee_idx on public.ppm_tasks (assignee_id);
create index if not exists ppm_tasks_completed_idx on public.ppm_tasks (completed_at);

-- Immutable history of everything that happens to a task (drives analytics) --
create table if not exists public.ppm_task_events (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid references public.ppm_tasks(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  type        text not null,            -- created | assigned | status_changed | updated
  from_status text,
  to_status   text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ppm_task_events_task_idx on public.ppm_task_events (task_id, created_at);

-- Helper: is the current user PPM staff (staff or admin)? -------------------
create or replace function public.is_ppm_user()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'staff'));
$$;

-- RLS: any PPM user can read; writes go through the service role (server) ----
alter table public.ppm_projects    enable row level security;
alter table public.ppm_tasks       enable row level security;
alter table public.ppm_task_events enable row level security;

drop policy if exists ppm_projects_read on public.ppm_projects;
create policy ppm_projects_read on public.ppm_projects for select using (public.is_ppm_user());
drop policy if exists ppm_tasks_read on public.ppm_tasks;
create policy ppm_tasks_read on public.ppm_tasks for select using (public.is_ppm_user());
drop policy if exists ppm_events_read on public.ppm_task_events;
create policy ppm_events_read on public.ppm_task_events for select using (public.is_ppm_user());

-- Let PPM users read each other's names for assignee pickers ----------------
drop policy if exists profiles_ppm_read on public.profiles;
create policy profiles_ppm_read on public.profiles
  for select using (id = auth.uid() or public.is_admin() or public.is_ppm_user());

-- -----------------------------------------------------------------------------
-- From portal/supabase/profiles-avatar-and-prefs.sql
-- -----------------------------------------------------------------------------
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
do $guard$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', false)
    on conflict (id) do nothing;
  end if;
end $guard$;

-- -----------------------------------------------------------------------------
-- From portal/supabase/roles-and-approvals.sql
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- From ppm/supabase/cancelled-status.sql
-- -----------------------------------------------------------------------------
-- ============================================================================
-- PPM migration — add the 'cancelled' task status (kanban Cancelled column)
-- Run once in the Supabase SQL editor against the shared project.
-- Safe to re-run: both statements are idempotent.
-- ============================================================================

alter table public.ppm_tasks drop constraint if exists ppm_tasks_status_check;
alter table public.ppm_tasks
  add constraint ppm_tasks_status_check check (status in ('todo', 'in_progress', 'done', 'cancelled'));

-- Task deletes cascade their history away, so /api/task-delete writes one
-- audit row with task_id = null and the title in meta. Nothing to change here —
-- task_id is already nullable — this comment just records why null rows exist.

-- -----------------------------------------------------------------------------
-- From ppm/supabase/kb.sql
-- -----------------------------------------------------------------------------
-- ============================================================================
-- PPM migration — knowledge base
-- Run once in the Supabase SQL editor, in the SAME project as the rest of PPM.
-- Safe to re-run: every statement is idempotent and the seed is ON CONFLICT
-- DO NOTHING, so running it twice will not duplicate or overwrite edits made
-- in the admin centre.
-- ============================================================================

-- Categories are data, not code, because the team needs to add and rename them
-- without a deploy. `sort` orders them on the hub; `color` is the card colour
-- in the nav and the accent on the category page.
create table if not exists public.kb_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  title      text not null,
  blurb      text,
  color      text not null default '#032C7C',
  sort       int  not null default 100,
  created_at timestamptz not null default now()
);

-- Topics are an optional second axis inside a category. A category with no
-- topics renders flat, which is what most of them will be.
create table if not exists public.kb_topics (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.kb_categories(id) on delete cascade,
  slug        text not null,
  title       text not null,
  sort        int  not null default 100,
  unique (category_id, slug)
);

create table if not exists public.kb_articles (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.kb_categories(id) on delete set null,
  topic_id    uuid references public.kb_topics(id) on delete set null,
  slug        text not null unique,
  title       text not null,
  summary     text,
  -- Markdown. Rendered server-side; raw HTML is not passed through.
  body        text not null default '',
  -- ready | draft | needed. A knowledge base that mixes settled procedure with
  -- plausible guesses is worse than an empty one, so every article says which
  -- it is and the UI shows it.
  status      text not null default 'draft' check (status in ('ready','draft','needed')),
  owner       text,
  -- Extra words people would search for, beyond title and summary.
  keywords    text,
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists kb_articles_category_idx on public.kb_articles (category_id);
create index if not exists kb_articles_status_idx   on public.kb_articles (status);

-- Full-text search across everything that matters, so one box finds an article
-- by its title, its summary, its keywords or a phrase in the body.
alter table public.kb_articles
  add column if not exists search tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(keywords, '')),'B') ||
    setweight(to_tsvector('english', coalesce(body, '')),    'C')
  ) stored;
create index if not exists kb_articles_search_idx on public.kb_articles using gin (search);

-- Row level security ---------------------------------------------------------
-- Reads: any internal PPM account. Writes: admins only, and they go through
-- the API with the service role anyway. Clients are already refused by the
-- app's middleware; this is the second lock, on the data itself.
alter table public.kb_categories enable row level security;
alter table public.kb_topics     enable row level security;
alter table public.kb_articles   enable row level security;

-- SECURITY DEFINER is not optional here, and it is not about privilege.
-- This function reads public.profiles, and profiles' own SELECT policy calls
-- this function. Without SECURITY DEFINER the inner read is itself subject to
-- that policy, so the function calls itself until the stack runs out:
-- "stack depth limit exceeded", on every query that touches profiles.
--
-- It hid for weeks because admins never saw it. The profiles policy reads
-- (id = auth.uid() or is_admin() or is_ppm_user()), is_admin() is already
-- SECURITY DEFINER, and for an admin it returns true and short-circuits the OR
-- before this function is reached. Staff fell through to it and recursed, so
-- staff could not read the handbook, or even their own profile row.
--
-- Running as the owner makes the inner read bypass RLS, which breaks the
-- cycle. search_path is pinned for the usual reason a definer function pins
-- it: it must not resolve its names through the caller's search_path.
create or replace function public.is_ppm_user() returns boolean
language sql stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('super_admin','admin','staff')
  );
$$;

drop policy if exists kb_cat_read on public.kb_categories;
create policy kb_cat_read on public.kb_categories for select using (public.is_ppm_user());
drop policy if exists kb_top_read on public.kb_topics;
create policy kb_top_read on public.kb_topics for select using (public.is_ppm_user());
drop policy if exists kb_art_read on public.kb_articles;
create policy kb_art_read on public.kb_articles for select using (public.is_ppm_user());


-- Seed: categories ------------------------------------------------------------
--
-- The shelves from the RTC Knowledge Base Categories document, in its order.
-- "Service Lines" and "Tools" are headings in that document rather than shelves
-- of their own: they carry no description, and their children are what articles
-- are filed under, so the children appear here and the headings do not.
--
-- do nothing on conflict, so re-running this never overwrites a title, blurb or
-- colour someone has since edited in the admin centre.

insert into public.kb_categories (slug, title, blurb, color, sort) values ('faq', 'FAQ', 'Quick answers to common questions from clients, prospects, and the team about RTC''s services, process, and reporting.', '#0464DD', 1) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('marketing-sales', 'Marketing & Sales', 'Outreach playbooks, cold email frameworks, talk tracks, objection handling, and positioning guidance for winning new clients.', '#032C7C', 2) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('cost-guidelines', 'Cost Guidelines', 'Current pricing, retainer tiers, discounts, referral fees, and approval rules for quotes and proposals.', '#0464DD', 3) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('standard-procedure', 'Standard Procedure', 'Step-by-step SOPs for recurring work, from prospecting and audits to content production and client delivery.', '#2F58A3', 4) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('seo-geo', 'SEO & GEO', 'Everything on improving client visibility in Google and AI answer engines like ChatGPT, Gemini, and Perplexity.', '#16305E', 5) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('smartsheet', 'Smartsheet', 'Implementation, consulting, and build guidance for Smartsheet solutions, especially construction and PMO environments.', '#3992FF', 6) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('automation', 'Automation', 'Workflow and AI-assisted automations that cut manual work across client operations and systems.', '#3992FF', 7) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('web-development', 'Web Development', 'Website builds, restructuring, and technical setup for client sites, including Shopify and standard hosting.', '#032C7C', 8) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('advisory', 'Advisory', 'Strategic consulting on digital operations, tools, and growth for clients who need guidance beyond a single service.', '#2F58A3', 9) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('claude', 'Claude', 'How RTC uses Claude across departments, covering Projects, skills, prompts, and workflows for marketing, finance, legal, and development work.', '#16305E', 10) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('salesforce', 'Salesforce', 'How RTC runs its CRM, covering pipelines, campaign lines, custom fields, imports, email outreach, and this knowledge base.', '#0464DD', 11) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('outlook', 'Outlook', 'How RTC uses Outlook for email and calendars, covering mailbox setup, shared inboxes, signatures, scheduling, and email etiquette for client and prospect communication.', '#2F58A3', 12) on conflict (slug) do nothing;
insert into public.kb_categories (slug, title, blurb, color, sort) values ('teams', 'Teams', 'How RTC uses Microsoft Teams for internal communication, covering channels, chats, meetings, file sharing, and guidelines for collaborating with the team and clients.', '#3992FF', 13) on conflict (slug) do nothing;

-- Topics are a second grouping inside a category. None are seeded: the handbook
-- files articles straight onto a shelf, and an unused sub-level only shows up
-- as stale options in the article editor.

-- Articles ---------------------------------------------------------------------
--
-- None are seeded, on purpose. The handbook's content is written and edited in
-- the admin centre by the people who keep it current, which is the whole reason
-- articles live in the database rather than in files. Seeding a set here would
-- mean a deploy could resurrect content someone had deliberately removed.
--
-- The live handbook's articles come from the RTC Knowledge Base document and
-- are authored at /admin/kb.

-- ────────────────────────────────────────────────────────────────────────────
-- Was this article helpful?
--
-- One row per person per article, so a second vote replaces the first rather
-- than stacking. The point is not a score: it is to surface which articles are
-- failing the people who actually had to use them, which is why the vote is
-- attributed rather than anonymous — an admin can go and ask.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.kb_feedback (
  article_id uuid not null references public.kb_articles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  helpful    boolean not null,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists kb_feedback_article_idx on public.kb_feedback (article_id);

alter table public.kb_feedback enable row level security;

drop policy if exists kb_feedback_read on public.kb_feedback;
create policy kb_feedback_read on public.kb_feedback
  for select using (public.is_ppm_user());

-- You may only write your own vote, whatever the request body claims.
drop policy if exists kb_feedback_insert on public.kb_feedback;
create policy kb_feedback_insert on public.kb_feedback
  for insert with check (public.is_ppm_user() and user_id = auth.uid());

drop policy if exists kb_feedback_update on public.kb_feedback;
create policy kb_feedback_update on public.kb_feedback
  for update using (public.is_ppm_user() and user_id = auth.uid())
  with check (public.is_ppm_user() and user_id = auth.uid());

