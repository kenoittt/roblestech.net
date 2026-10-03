-- =============================================================================
-- Recurring tasks.
-- A task can repeat every day, every weekday, every week, every two weeks or
-- every month. When one is marked done, the database makes the next one: the
-- same title, description, people, project, priority, privacy and sign-off
-- rule, the checklist unticked, due on the next date in the pattern that
-- hasn't passed. The series moves to the new task, so reopening and finishing
-- the old one again can't make a duplicate.
-- The next one keeps the series' creator and assigner. Without that, whoever
-- finished the last one would become its "assigner" and could then sign off
-- their own work under an assigner rule.
-- =============================================================================

alter table public.ppm_tasks add column if not exists repeat text;
alter table public.ppm_tasks drop constraint if exists ppm_tasks_repeat_check;
alter table public.ppm_tasks add constraint ppm_tasks_repeat_check
  check (repeat in ('daily', 'weekdays', 'weekly', 'biweekly', 'monthly'));

-- The next date after d in a pattern. Mirrors nextDue in src/domains/tasks/config.ts.
create or replace function public.ppm_next_due(d date, pattern text) returns date
language sql immutable as $$
  select case pattern
    when 'daily'    then d + 1
    when 'weekdays' then d + case extract(isodow from d)::int when 5 then 3 when 6 then 2 else 1 end
    when 'weekly'   then d + 7
    when 'biweekly' then d + 14
    when 'monthly'  then (d + interval '1 month')::date
  end
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
    -- The next copy of a recurring task, made by ppm_tasks_repeat: it keeps the
    -- creator and assigner of the series. Only that function sets this flag;
    -- nobody can set it from the app.
    if current_setting('ppm.repeating', true) = 'on' then
      new.sort_order := -extract(epoch from clock_timestamp());
      return new;
    end if;
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

create or replace function public.ppm_tasks_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  f   text;
begin
  if tg_op = 'INSERT' then
    -- A recurring task's next copy: ppm_tasks_repeat writes its history, and
    -- nobody is told they were "assigned" something they already had.
    if current_setting('ppm.repeating', true) = 'on' then
      return new;
    end if;
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
    insert into public.ppm_task_events (task_id, actor_id, type, from_status, to_status, meta)
    values (new.id, uid, 'status_changed', old.status, new.status,
            -- An admin signing off in the named person's place, which the history shows.
            case when new.status = 'done' and uid is not null and not public.ppm_rule_allows(new, uid)
                 then jsonb_build_object('as_admin', true) else '{}'::jsonb end);
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

create or replace function public.ppm_tasks_repeat() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  due   date;
  nxt   public.ppm_tasks;
begin
  if new.repeat is null or new.status <> 'done' or old.status = 'done' or new.deleted_at is not null then
    return null;
  end if;

  -- The next date in the pattern that hasn't passed yet.
  due := public.ppm_next_due(coalesce(new.due_date, today), new.repeat);
  while due < today loop
    due := public.ppm_next_due(due, new.repeat);
  end loop;

  perform set_config('ppm.repeating', 'on', true);
  insert into public.ppm_tasks (
    title, description, status, priority, project_id, assignee_id, assigned_by, reviewer_id,
    created_by, due_date, is_private, completion_policy, completion_approvers, repeat
  ) values (
    new.title, new.description, 'todo', new.priority, new.project_id, new.assignee_id, new.assigned_by, new.reviewer_id,
    new.created_by, due, new.is_private, new.completion_policy, new.completion_approvers, new.repeat
  ) returning * into nxt;
  perform set_config('ppm.repeating', '', true);

  insert into public.ppm_task_checklist (task_id, title, sort, created_by)
  select nxt.id, c.title, c.sort, c.created_by from public.ppm_task_checklist c where c.task_id = new.id;

  insert into public.ppm_task_events (task_id, actor_id, type, meta) values
    (new.id, auth.uid(), 'repeated', jsonb_build_object('number', nxt.number, 'due_date', due)),
    (nxt.id, auth.uid(), 'created', jsonb_build_object('title', nxt.title, 'repeat_of', new.number));

  -- The series continues on the new task.
  update public.ppm_tasks set repeat = null where id = new.id;
  return null;
end $$;

-- Named to run after ppm_tasks_after (triggers run in name order).
drop trigger if exists ppm_tasks_repeat on public.ppm_tasks;
create trigger ppm_tasks_repeat after update of status on public.ppm_tasks
  for each row execute function public.ppm_tasks_repeat();
