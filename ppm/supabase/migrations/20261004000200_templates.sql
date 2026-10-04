-- =============================================================================
-- Templates: tasks and calendar entries people make again and again.
--
-- Christian, via Kyan, 2026-10-04: the outreach team sends emails every day,
-- so they make the same task, and block the same time, day after day. A
-- template keeps the details of one, so the next is a couple of clicks away.
--
-- A template is a starting point, not a schedule: nothing is made until
-- someone uses it, and they can change anything before it's made. (Repeat is
-- the schedule: finishing a repeating task makes the next one by itself.)
--
-- Each template belongs to the person who saved it. A shared one is offered to
-- the whole team; the rest only to their owner. The owner can rename, share or
-- delete it; an admin can also rename or delete a shared one, say once its
-- owner has left. Nobody can hand a template to someone else.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Task templates: the fields of a new task, plus its checklist
-- -----------------------------------------------------------------------------
create table if not exists public.ppm_task_templates (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (length(btrim(name)) between 1 and 120),
  created_by           uuid default auth.uid() references auth.users(id) on delete set null,
  shared               boolean not null default false,
  title                text not null check (length(btrim(title)) between 1 and 500),
  description          text,
  -- A template starts work; it can't start in review, done or cancelled.
  status               text not null default 'todo' check (status in ('backlog', 'todo', 'in_progress')),
  priority             text not null default 'none' check (priority in ('none', 'low', 'medium', 'high', 'urgent')),
  project_id           uuid references public.ppm_projects(id) on delete set null,
  -- Who gets the task: a named person, or (assign_to_user) whoever uses the
  -- template, so one shared template serves everyone on the outreach team.
  assignee_id          uuid references auth.users(id) on delete set null,
  assign_to_user       boolean not null default false,
  reviewer_id          uuid references auth.users(id) on delete set null,
  completion_policy    text not null default 'anyone'
                       check (completion_policy in ('anyone', 'not_assignee', 'assigner', 'reviewer', 'specific')),
  completion_approvers uuid[] not null default '{}',
  is_private           boolean not null default false,
  -- Due this many days after the task is made (0: the same day). Null: no due date.
  due_in_days          integer check (due_in_days between 0 and 365),
  -- The checklist, in order. Each item becomes an unticked checklist line.
  checklist            text[] not null default '{}' check (cardinality(checklist) <= 100),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (not (assign_to_user and assignee_id is not null))
);
create index if not exists ppm_task_templates_owner_idx on public.ppm_task_templates (created_by);

-- -----------------------------------------------------------------------------
-- Calendar templates: a time block or a meeting, at a time of day
-- -----------------------------------------------------------------------------
create table if not exists public.cal_event_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) between 1 and 120),
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  shared        boolean not null default false,
  kind          text not null default 'block' check (kind in ('block', 'meeting')),
  title         text not null check (length(btrim(title)) between 1 and 300),
  notes         text,
  -- Minutes after midnight, Manila time: 9:00 to 11:00 is 540 to 660.
  start_minute  integer not null check (start_minute between 0 and 1439),
  end_minute    integer not null check (end_minute between 1 and 1440),
  visibility    text not null default 'public' check (visibility in ('public', 'busy', 'private')),
  auto_complete boolean not null default false,
  -- A meeting's people, its owner included. Whoever uses the template owns
  -- the new meeting, so they're left out of its invitations.
  attendee_ids  uuid[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index if not exists cal_event_templates_owner_idx on public.cal_event_templates (created_by);

-- -----------------------------------------------------------------------------
-- The owner and the creation date never change; updated_at keeps up.
-- -----------------------------------------------------------------------------
create or replace function public.ppm_templates_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ppm_task_templates_before on public.ppm_task_templates;
create trigger ppm_task_templates_before before insert or update on public.ppm_task_templates
  for each row execute function public.ppm_templates_before();
drop trigger if exists cal_event_templates_before on public.cal_event_templates;
create trigger cal_event_templates_before before insert or update on public.cal_event_templates
  for each row execute function public.ppm_templates_before();

-- -----------------------------------------------------------------------------
-- Who sees and changes what
-- -----------------------------------------------------------------------------
alter table public.ppm_task_templates  enable row level security;
alter table public.cal_event_templates enable row level security;

drop policy if exists ppm_task_templates_read on public.ppm_task_templates;
create policy ppm_task_templates_read on public.ppm_task_templates
  for select using (public.is_ppm_user() and (created_by = auth.uid() or shared));
drop policy if exists ppm_task_templates_insert on public.ppm_task_templates;
create policy ppm_task_templates_insert on public.ppm_task_templates
  for insert with check (public.is_ppm_user() and created_by = auth.uid());
drop policy if exists ppm_task_templates_update on public.ppm_task_templates;
create policy ppm_task_templates_update on public.ppm_task_templates
  for update using (public.is_ppm_user() and (created_by = auth.uid() or (shared and public.is_admin())))
  with check (public.is_ppm_user() and (created_by = auth.uid() or (shared and public.is_admin())));
drop policy if exists ppm_task_templates_delete on public.ppm_task_templates;
create policy ppm_task_templates_delete on public.ppm_task_templates
  for delete using (public.is_ppm_user() and (created_by = auth.uid() or (shared and public.is_admin())));

drop policy if exists cal_event_templates_read on public.cal_event_templates;
create policy cal_event_templates_read on public.cal_event_templates
  for select using (public.is_ppm_user() and (created_by = auth.uid() or shared));
drop policy if exists cal_event_templates_insert on public.cal_event_templates;
create policy cal_event_templates_insert on public.cal_event_templates
  for insert with check (public.is_ppm_user() and created_by = auth.uid());
drop policy if exists cal_event_templates_update on public.cal_event_templates;
create policy cal_event_templates_update on public.cal_event_templates
  for update using (public.is_ppm_user() and (created_by = auth.uid() or (shared and public.is_admin())))
  with check (public.is_ppm_user() and (created_by = auth.uid() or (shared and public.is_admin())));
drop policy if exists cal_event_templates_delete on public.cal_event_templates;
create policy cal_event_templates_delete on public.cal_event_templates
  for delete using (public.is_ppm_user() and (created_by = auth.uid() or (shared and public.is_admin())));
