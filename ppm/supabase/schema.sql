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
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date     date,
  assignee_id  uuid references auth.users(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
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
