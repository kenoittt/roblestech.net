-- =============================================================================
-- PPM revamp: what the new app adds to the shared database.
--
-- Additive only. Nothing is dropped or renamed, and every list the live app
-- knows (statuses, priorities, roles) is a subset of the new one, so the old
-- PPM keeps reading the same rows. Writes now go through row-level security
-- and triggers instead of the service role, which fixes issue S-02 ("writes
-- skip the database's rules") by design: the database itself decides who may
-- change what, and it records the history.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- People
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists email          text;
alter table public.profiles add column if not exists title          text;
alter table public.profiles add column if not exists timezone       text not null default 'Asia/Manila';
alter table public.profiles add column if not exists prefs          jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists deactivated_at timestamptz;
alter table public.profiles add column if not exists last_seen_at   timestamptz;

-- Keep profiles.email in step with the sign-in email, so the team list can show
-- it without reading auth.users.
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email
  where id = new.id and email is distinct from new.email;
  return new;
end $$;

drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();

update public.profiles p set email = u.email
from auth.users u where u.id = p.id and p.email is null;

-- A deactivated person keeps their history but loses access.
create or replace function public.is_ppm_user() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'staff')
      and p.deactivated_at is null
  );
$$;

-- You may edit your own name, picture and preferences, never your role.
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, email_opt_out, title, timezone, prefs, last_seen_at)
  on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------
alter table public.ppm_projects add column if not exists description  text;
alter table public.ppm_projects add column if not exists owner_id     uuid references auth.users(id) on delete set null;
alter table public.ppm_projects add column if not exists status       text not null default 'active';
alter table public.ppm_projects add column if not exists kind         text not null default 'internal';
alter table public.ppm_projects add column if not exists client_name  text;
alter table public.ppm_projects add column if not exists start_date   date;
alter table public.ppm_projects add column if not exists target_date  date;
alter table public.ppm_projects add column if not exists default_view text not null default 'list';
alter table public.ppm_projects add column if not exists updated_at   timestamptz not null default now();

alter table public.ppm_projects drop constraint if exists ppm_projects_status_check;
alter table public.ppm_projects add constraint ppm_projects_status_check
  check (status in ('planned', 'active', 'paused', 'closed'));
alter table public.ppm_projects drop constraint if exists ppm_projects_kind_check;
alter table public.ppm_projects add constraint ppm_projects_kind_check
  check (kind in ('client', 'internal'));
alter table public.ppm_projects drop constraint if exists ppm_projects_default_view_check;
alter table public.ppm_projects add constraint ppm_projects_default_view_check
  check (default_view in ('list', 'board', 'calendar'));

update public.ppm_projects set owner_id = created_by where owner_id is null;

create table if not exists public.ppm_project_members (
  project_id uuid not null references public.ppm_projects(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  added_by   uuid default auth.uid() references auth.users(id) on delete set null,
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists ppm_project_members_user_idx on public.ppm_project_members (user_id);

-- The owner, a project owner-member, or an admin manages a project.
create or replace function public.ppm_can_manage_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.ppm_projects p where p.id = pid and p.owner_id = auth.uid())
      or exists (select 1 from public.ppm_project_members m
                 where m.project_id = pid and m.user_id = auth.uid() and m.role = 'owner');
$$;

create or replace function public.ppm_projects_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.owner_id   := coalesce(new.owner_id, new.created_by);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ppm_projects_before on public.ppm_projects;
create trigger ppm_projects_before before insert or update on public.ppm_projects
  for each row execute function public.ppm_projects_before();

-- Whoever owns a project is always one of its members.
create or replace function public.ppm_projects_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id) then
    insert into public.ppm_project_members (project_id, user_id, role, added_by)
    values (new.id, new.owner_id, 'owner', auth.uid())
    on conflict (project_id, user_id) do update set role = 'owner';
  end if;
  return new;
end $$;

drop trigger if exists ppm_projects_after on public.ppm_projects;
create trigger ppm_projects_after after insert or update of owner_id on public.ppm_projects
  for each row execute function public.ppm_projects_after();

alter table public.ppm_project_members enable row level security;

drop policy if exists ppm_projects_insert on public.ppm_projects;
create policy ppm_projects_insert on public.ppm_projects
  for insert with check (public.is_ppm_user());
drop policy if exists ppm_projects_update on public.ppm_projects;
create policy ppm_projects_update on public.ppm_projects
  for update using (public.ppm_can_manage_project(id)) with check (public.is_ppm_user());
drop policy if exists ppm_projects_delete on public.ppm_projects;
create policy ppm_projects_delete on public.ppm_projects
  for delete using (public.is_admin());

drop policy if exists ppm_members_read on public.ppm_project_members;
create policy ppm_members_read on public.ppm_project_members
  for select using (public.is_ppm_user());
drop policy if exists ppm_members_insert on public.ppm_project_members;
create policy ppm_members_insert on public.ppm_project_members
  for insert with check (public.ppm_can_manage_project(project_id));
drop policy if exists ppm_members_update on public.ppm_project_members;
create policy ppm_members_update on public.ppm_project_members
  for update using (public.ppm_can_manage_project(project_id));
drop policy if exists ppm_members_delete on public.ppm_project_members;
create policy ppm_members_delete on public.ppm_project_members
  for delete using (public.ppm_can_manage_project(project_id) or user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Tasks
-- -----------------------------------------------------------------------------
-- Six statuses (the live app uses four of them) and five priorities (it uses three).
alter table public.ppm_tasks drop constraint if exists ppm_tasks_status_check;
alter table public.ppm_tasks add constraint ppm_tasks_status_check
  check (status in ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'));
alter table public.ppm_tasks drop constraint if exists ppm_tasks_priority_check;
alter table public.ppm_tasks add constraint ppm_tasks_priority_check
  check (priority in ('none', 'low', 'medium', 'high', 'urgent'));

-- A short number for every task, shown as RTC-123.
alter table public.ppm_tasks add column if not exists number bigint generated by default as identity;
create unique index if not exists ppm_tasks_number_key on public.ppm_tasks (number);

alter table public.ppm_tasks add column if not exists start_date   date;
alter table public.ppm_tasks add column if not exists updated_at   timestamptz not null default now();
alter table public.ppm_tasks add column if not exists assigned_by  uuid references auth.users(id) on delete set null;
alter table public.ppm_tasks add column if not exists reviewer_id  uuid references auth.users(id) on delete set null;
alter table public.ppm_tasks add column if not exists completed_by uuid references auth.users(id) on delete set null;
alter table public.ppm_tasks add column if not exists is_private   boolean not null default false;
alter table public.ppm_tasks add column if not exists sort_order   double precision not null default 0;
alter table public.ppm_tasks add column if not exists deleted_at   timestamptz;
alter table public.ppm_tasks add column if not exists deleted_by   uuid references auth.users(id) on delete set null;

-- Who may mark a task done (Kyan, 2026-10-02: "flexibility is good here").
--   anyone        anyone on the team, the assignee included (the default)
--   not_assignee  anyone except the assignee
--   assigner      only the person who assigned it
--   reviewer      only the named reviewer
--   specific      only the people listed in completion_approvers
-- Admins can always sign a task off, so work never gets stuck.
alter table public.ppm_tasks add column if not exists completion_policy text not null default 'anyone';
alter table public.ppm_tasks drop constraint if exists ppm_tasks_completion_policy_check;
alter table public.ppm_tasks add constraint ppm_tasks_completion_policy_check
  check (completion_policy in ('anyone', 'not_assignee', 'assigner', 'reviewer', 'specific'));
alter table public.ppm_tasks add column if not exists completion_approvers uuid[] not null default '{}';

update public.ppm_tasks set assigned_by = created_by where assignee_id is not null and assigned_by is null;

create index if not exists ppm_tasks_project_idx on public.ppm_tasks (project_id);
create index if not exists ppm_tasks_due_idx     on public.ppm_tasks (due_date);
create index if not exists ppm_tasks_live_idx    on public.ppm_tasks (deleted_at, status);

create or replace function public.ppm_can_complete(t public.ppm_tasks, uid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  r text;
begin
  select role into r from public.profiles where id = uid;
  if r in ('admin', 'super_admin') then return true; end if;
  case t.completion_policy
    when 'anyone'       then return true;
    when 'not_assignee' then return t.assignee_id is distinct from uid;
    when 'assigner'     then return uid = coalesce(t.assigned_by, t.created_by);
    when 'reviewer'     then return t.reviewer_id is not null and uid = t.reviewer_id;
    when 'specific'     then return uid = any (t.completion_approvers);
    else return true;
  end case;
end $$;

create or replace function public.ppm_completion_message(t public.ppm_tasks) returns text
language sql stable as $$
  select case t.completion_policy
    when 'not_assignee' then 'Someone other than the assignee has to mark this task done.'
    when 'assigner'     then 'Only the person who assigned this task can mark it done.'
    when 'reviewer'     then 'Only the reviewer can mark this task done.'
    when 'specific'     then 'Only the people chosen to sign this task off can mark it done.'
    else 'You can''t mark this task done.'
  end;
$$;

create or replace function public.ppm_tasks_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  new.updated_at := now();

  -- A signed-in person can't write someone else's name into the record. The
  -- service role (uid is null) keeps what it sends, which imports rely on.
  if tg_op = 'INSERT' then
    if uid is not null then
      new.created_by := uid;
    end if;
    if new.assignee_id is not null then
      new.assigned_by := case when uid is not null then uid else coalesce(new.assigned_by, new.created_by) end;
    end if;
    if new.status = 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      new.completed_by := case when uid is not null then uid else new.completed_by end;
    end if;
    if new.sort_order = 0 then
      new.sort_order := -extract(epoch from clock_timestamp());
    end if;
    return new;
  end if;

  new.number     := old.number;
  new.created_by := old.created_by;
  new.created_at := old.created_at;

  if new.assignee_id is distinct from old.assignee_id then
    new.assigned_by := coalesce(uid, old.assigned_by);
  end if;

  if new.is_private is distinct from old.is_private
     and uid is not null and uid is distinct from old.created_by then
    raise exception 'Only the person who created this task can change who sees it.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'done' then
      if uid is not null and not public.ppm_can_complete(new, uid) then
        raise exception '%', public.ppm_completion_message(new) using errcode = '42501';
      end if;
      new.completed_at := now();
      new.completed_by := uid;
    elsif old.status = 'done' then
      new.completed_at := null;
      new.completed_by := null;
    end if;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_by := case when new.deleted_at is null then null else uid end;
  end if;

  return new;
end $$;

drop trigger if exists ppm_tasks_before on public.ppm_tasks;
create trigger ppm_tasks_before before insert or update on public.ppm_tasks
  for each row execute function public.ppm_tasks_before();

-- Visibility: a private task is seen only by the person who made it and its assignee.
create or replace function public.ppm_task_visible(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ppm_tasks t
    where t.id = tid
      and (not t.is_private or t.created_by = auth.uid() or t.assignee_id = auth.uid())
  );
$$;

drop policy if exists ppm_tasks_read on public.ppm_tasks;
create policy ppm_tasks_read on public.ppm_tasks for select using (
  public.is_ppm_user()
  and (not is_private or created_by = auth.uid() or assignee_id = auth.uid())
);
drop policy if exists ppm_tasks_insert on public.ppm_tasks;
create policy ppm_tasks_insert on public.ppm_tasks for insert
  with check (public.is_ppm_user() and created_by = auth.uid());
drop policy if exists ppm_tasks_update on public.ppm_tasks;
create policy ppm_tasks_update on public.ppm_tasks for update using (
  public.is_ppm_user()
  and (not is_private or created_by = auth.uid() or assignee_id = auth.uid())
) with check (public.is_ppm_user());
drop policy if exists ppm_tasks_delete on public.ppm_tasks;
create policy ppm_tasks_delete on public.ppm_tasks for delete using (public.is_admin());

-- History is readable only where the task is.
drop policy if exists ppm_events_read on public.ppm_task_events;
create policy ppm_events_read on public.ppm_task_events for select using (
  public.is_ppm_user() and (task_id is null or public.ppm_task_visible(task_id))
);

-- -----------------------------------------------------------------------------
-- Notifications (the inbox)
-- -----------------------------------------------------------------------------
create table if not exists public.ppm_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete set null,
  type       text not null,   -- assigned | completed | reopened | review | comment | meeting | unassigned
  task_id    uuid references public.ppm_tasks(id) on delete cascade,
  event_id   uuid,
  meta       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ppm_notifications_user_idx on public.ppm_notifications (user_id, created_at desc);

alter table public.ppm_notifications enable row level security;
drop policy if exists ppm_notifications_read on public.ppm_notifications;
create policy ppm_notifications_read on public.ppm_notifications
  for select using (user_id = auth.uid());
drop policy if exists ppm_notifications_update on public.ppm_notifications;
create policy ppm_notifications_update on public.ppm_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists ppm_notifications_delete on public.ppm_notifications;
create policy ppm_notifications_delete on public.ppm_notifications
  for delete using (user_id = auth.uid());
revoke update on public.ppm_notifications from anon, authenticated;
grant update (read_at) on public.ppm_notifications to authenticated;

create or replace function public.ppm_notify(
  recipient uuid, actor uuid, kind text, task uuid, extra jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if recipient is null or recipient is not distinct from actor then return; end if;
  insert into public.ppm_notifications (user_id, actor_id, type, task_id, meta)
  values (recipient, actor, kind, task, coalesce(extra, '{}'::jsonb));
end $$;

-- Every change to a task is written to its history, and the people it affects
-- hear about it. Doing this in the database means no screen can forget.
create or replace function public.ppm_tasks_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  f   text;
begin
  if tg_op = 'INSERT' then
    insert into public.ppm_task_events (task_id, actor_id, type, to_status, meta)
    values (new.id, uid, 'created', new.status, jsonb_build_object('title', new.title));
    if new.assignee_id is not null then
      insert into public.ppm_task_events (task_id, actor_id, type, meta)
      values (new.id, uid, 'assigned', jsonb_build_object('assignee_id', new.assignee_id));
      perform public.ppm_notify(new.assignee_id, uid, 'assigned', new.id);
    end if;
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    insert into public.ppm_task_events (task_id, actor_id, type, meta)
    values (new.id, uid, case when new.deleted_at is null then 'restored' else 'deleted' end,
            jsonb_build_object('title', new.title));
  end if;

  if new.status is distinct from old.status then
    insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status)
    values (new.id, uid, 'status_changed', old.status, new.status);
    if new.status = 'done' then
      perform public.ppm_notify(coalesce(new.assigned_by, new.created_by), uid, 'completed', new.id);
      if new.assignee_id is distinct from coalesce(new.assigned_by, new.created_by) then
        perform public.ppm_notify(new.assignee_id, uid, 'completed', new.id);
      end if;
    elsif new.status = 'in_review' then
      perform public.ppm_notify(coalesce(new.reviewer_id, new.assigned_by, new.created_by), uid, 'review', new.id);
    elsif old.status = 'done' then
      perform public.ppm_notify(new.assignee_id, uid, 'reopened', new.id);
    end if;
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    insert into public.ppm_task_events (task_id, actor_id, type, meta)
    values (new.id, uid, 'assigned', jsonb_build_object('assignee_id', new.assignee_id, 'from', old.assignee_id));
    perform public.ppm_notify(new.assignee_id, uid, 'assigned', new.id);
    perform public.ppm_notify(old.assignee_id, uid, 'unassigned', new.id);
  end if;

  foreach f in array array['title', 'priority', 'due_date', 'start_date', 'project_id',
                           'reviewer_id', 'completion_policy', 'is_private'] loop
    if (to_jsonb(new) -> f) is distinct from (to_jsonb(old) -> f) then
      insert into public.ppm_task_events (task_id, actor_id, type, meta)
      values (new.id, uid, 'updated',
              jsonb_build_object('field', f, 'from', to_jsonb(old) -> f, 'to', to_jsonb(new) -> f));
    end if;
  end loop;
  if new.description is distinct from old.description then
    insert into public.ppm_task_events (task_id, actor_id, type, meta)
    values (new.id, uid, 'updated', jsonb_build_object('field', 'description'));
  end if;
  return new;
end $$;

drop trigger if exists ppm_tasks_after on public.ppm_tasks;
create trigger ppm_tasks_after after insert or update on public.ppm_tasks
  for each row execute function public.ppm_tasks_after();

-- -----------------------------------------------------------------------------
-- Comments and checklists
-- -----------------------------------------------------------------------------
create table if not exists public.ppm_task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.ppm_tasks(id) on delete cascade,
  author_id  uuid default auth.uid() references auth.users(id) on delete set null,
  body       text not null check (length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);
create index if not exists ppm_task_comments_task_idx on public.ppm_task_comments (task_id, created_at);

alter table public.ppm_task_comments enable row level security;
drop policy if exists ppm_comments_read on public.ppm_task_comments;
create policy ppm_comments_read on public.ppm_task_comments
  for select using (public.is_ppm_user() and public.ppm_task_visible(task_id));
drop policy if exists ppm_comments_insert on public.ppm_task_comments;
create policy ppm_comments_insert on public.ppm_task_comments
  for insert with check (public.is_ppm_user() and author_id = auth.uid() and public.ppm_task_visible(task_id));
drop policy if exists ppm_comments_update on public.ppm_task_comments;
create policy ppm_comments_update on public.ppm_task_comments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists ppm_comments_delete on public.ppm_task_comments;
create policy ppm_comments_delete on public.ppm_task_comments
  for delete using (author_id = auth.uid() or public.is_admin());

create or replace function public.ppm_comments_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t public.ppm_tasks;
  r uuid;
begin
  select * into t from public.ppm_tasks where id = new.task_id;
  insert into public.ppm_task_events (task_id, actor_id, type, meta)
  values (new.task_id, new.author_id, 'commented', jsonb_build_object('comment_id', new.id));
  for r in select distinct x from unnest(array[t.assignee_id, t.created_by, t.assigned_by, t.reviewer_id]) as x
           where x is not null loop
    perform public.ppm_notify(r, new.author_id, 'comment', new.task_id,
                              jsonb_build_object('comment_id', new.id, 'excerpt', left(new.body, 140)));
  end loop;
  return new;
end $$;

drop trigger if exists ppm_comments_after on public.ppm_task_comments;
create trigger ppm_comments_after after insert on public.ppm_task_comments
  for each row execute function public.ppm_comments_after();

create table if not exists public.ppm_task_checklist (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.ppm_tasks(id) on delete cascade,
  title      text not null check (length(btrim(title)) between 1 and 500),
  done       boolean not null default false,
  sort       double precision not null default 0,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ppm_task_checklist_task_idx on public.ppm_task_checklist (task_id, sort);

alter table public.ppm_task_checklist enable row level security;
drop policy if exists ppm_checklist_all on public.ppm_task_checklist;
create policy ppm_checklist_all on public.ppm_task_checklist
  for all using (public.is_ppm_user() and public.ppm_task_visible(task_id))
  with check (public.is_ppm_user() and public.ppm_task_visible(task_id));

-- -----------------------------------------------------------------------------
-- Team calendar (goal 1c)
-- -----------------------------------------------------------------------------
-- A block is time someone sets aside, optionally for a task. A meeting is a
-- block with attendees; it appears on every attendee's calendar automatically.
create table if not exists public.cal_events (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind          text not null default 'block' check (kind in ('block', 'meeting')),
  title         text not null check (length(btrim(title)) between 1 and 300),
  notes         text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  all_day       boolean not null default false,
  task_id       uuid references public.ppm_tasks(id) on delete set null,
  -- public: everyone sees it. busy: others see "Busy" and the time, nothing else.
  -- private: only you (and a meeting's attendees) see it at all.
  visibility    text not null default 'public' check (visibility in ('public', 'busy', 'private')),
  -- Tick the block off by itself once its time has passed.
  auto_complete boolean not null default false,
  completed_at  timestamptz,
  location      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists cal_events_owner_time_idx on public.cal_events (owner_id, starts_at);
create index if not exists cal_events_time_idx on public.cal_events (starts_at, ends_at);

create table if not exists public.cal_event_attendees (
  event_id uuid not null references public.cal_events(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  response text not null default 'accepted' check (response in ('pending', 'accepted', 'declined')),
  primary key (event_id, user_id)
);
create index if not exists cal_event_attendees_user_idx on public.cal_event_attendees (user_id);

-- Hide a whole day or week: as "busy" (time shown, details hidden) or "private" (nothing shown).
create table if not exists public.cal_privacy_ranges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  starts_on  date not null,
  ends_on    date not null,
  mode       text not null check (mode in ('busy', 'private')),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists cal_privacy_ranges_user_idx on public.cal_privacy_ranges (user_id, starts_on);

alter table public.ppm_notifications drop constraint if exists ppm_notifications_event_fk;
alter table public.ppm_notifications add constraint ppm_notifications_event_fk
  foreign key (event_id) references public.cal_events(id) on delete cascade;

create or replace function public.cal_is_owner(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cal_events e where e.id = eid and e.owner_id = auth.uid());
$$;

create or replace function public.cal_is_attendee(eid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cal_event_attendees a where a.event_id = eid and a.user_id = auth.uid());
$$;

create or replace function public.cal_events_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists cal_events_before on public.cal_events;
create trigger cal_events_before before update on public.cal_events
  for each row execute function public.cal_events_before();

create or replace function public.cal_attendees_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  e public.cal_events;
begin
  select * into e from public.cal_events where id = new.event_id;
  if new.user_id is distinct from e.owner_id then
    insert into public.ppm_notifications (user_id, actor_id, type, event_id, meta)
    values (new.user_id, e.owner_id, 'meeting', e.id,
            jsonb_build_object('title', e.title, 'starts_at', e.starts_at));
  end if;
  return new;
end $$;

drop trigger if exists cal_attendees_after on public.cal_event_attendees;
create trigger cal_attendees_after after insert on public.cal_event_attendees
  for each row execute function public.cal_attendees_after();

alter table public.cal_events          enable row level security;
alter table public.cal_event_attendees enable row level security;
alter table public.cal_privacy_ranges  enable row level security;

-- Directly, you read only your own events and the meetings you're in. The team
-- view goes through cal_team_events(), which applies everyone's privacy choices.
drop policy if exists cal_events_read on public.cal_events;
create policy cal_events_read on public.cal_events
  for select using (owner_id = auth.uid() or public.cal_is_attendee(id));
drop policy if exists cal_events_insert on public.cal_events;
create policy cal_events_insert on public.cal_events
  for insert with check (public.is_ppm_user() and owner_id = auth.uid());
drop policy if exists cal_events_update on public.cal_events;
create policy cal_events_update on public.cal_events
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists cal_events_delete on public.cal_events;
create policy cal_events_delete on public.cal_events
  for delete using (owner_id = auth.uid());

drop policy if exists cal_attendees_read on public.cal_event_attendees;
create policy cal_attendees_read on public.cal_event_attendees
  for select using (user_id = auth.uid() or public.cal_is_owner(event_id) or public.cal_is_attendee(event_id));
drop policy if exists cal_attendees_insert on public.cal_event_attendees;
create policy cal_attendees_insert on public.cal_event_attendees
  for insert with check (public.cal_is_owner(event_id));
drop policy if exists cal_attendees_update on public.cal_event_attendees;
create policy cal_attendees_update on public.cal_event_attendees
  for update using (user_id = auth.uid() or public.cal_is_owner(event_id));
drop policy if exists cal_attendees_delete on public.cal_event_attendees;
create policy cal_attendees_delete on public.cal_event_attendees
  for delete using (public.cal_is_owner(event_id) or user_id = auth.uid());

drop policy if exists cal_privacy_own on public.cal_privacy_ranges;
create policy cal_privacy_own on public.cal_privacy_ranges
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Everyone's calendar for a time range, with each owner's privacy applied:
-- details only where the owner allows them, "Busy" where they only share the
-- time, and nothing at all where they keep it private.
create or replace function public.cal_team_events(range_start timestamptz, range_end timestamptz)
returns table (
  id uuid, owner_id uuid, kind text, title text, notes text,
  starts_at timestamptz, ends_at timestamptz, all_day boolean, task_id uuid,
  visibility text, auto_complete boolean, completed_at timestamptz, location text,
  masked boolean, attendee_ids uuid[]
)
language sql stable security definer set search_path = public as $$
  with base as (
    select e.*,
           (e.owner_id = auth.uid()
            or exists (select 1 from public.cal_event_attendees a
                       where a.event_id = e.id and a.user_id = auth.uid())) as involved,
           coalesce((select max(case r.mode when 'private' then 2 else 1 end)
                     from public.cal_privacy_ranges r
                     join public.profiles p on p.id = e.owner_id
                     where r.user_id = e.owner_id
                       and (e.starts_at at time zone coalesce(p.timezone, 'Asia/Manila'))::date
                           between r.starts_on and r.ends_on), 0) as range_mode
    from public.cal_events e
    where e.starts_at < range_end and e.ends_at > range_start
  )
  select b.id, b.owner_id, b.kind,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.title else 'Busy' end,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.notes end,
         b.starts_at, b.ends_at, b.all_day,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.task_id end,
         b.visibility, b.auto_complete, b.completed_at,
         case when b.involved or (b.visibility = 'public' and b.range_mode = 0) then b.location end,
         not (b.involved or (b.visibility = 'public' and b.range_mode = 0)),
         coalesce((select array_agg(a.user_id) from public.cal_event_attendees a where a.event_id = b.id), '{}')
  from base b
  where public.is_ppm_user()
    and (b.involved or (b.visibility <> 'private' and b.range_mode < 2));
$$;

-- -----------------------------------------------------------------------------
-- Handbook: admins write through row-level security too
-- -----------------------------------------------------------------------------
drop policy if exists kb_cat_write on public.kb_categories;
create policy kb_cat_write on public.kb_categories
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists kb_top_write on public.kb_topics;
create policy kb_top_write on public.kb_topics
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists kb_art_write on public.kb_articles;
create policy kb_art_write on public.kb_articles
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Live updates: other people's changes arrive without a refresh
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table
        public.ppm_tasks, public.ppm_notifications, public.ppm_task_comments,
        public.ppm_task_checklist, public.cal_events;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
