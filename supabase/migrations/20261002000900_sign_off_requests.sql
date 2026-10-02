-- =============================================================================
-- Sign-off requests go to the people who can mark the task done.
-- Before: moving a task to In review notified its reviewer, or else whoever
-- assigned it, whatever the sign-off rule said. So on a "chosen people" task
-- the chosen people weren't told. Now the rule decides; a rule that names
-- nobody keeps the old behaviour. The app's "waiting on you" lists use the
-- same rule (signOffPeople in src/domains/tasks/config.ts).
-- =============================================================================

-- The people a task's sign-off rule names. Mirrors signOffPeople in the app.
create or replace function public.ppm_sign_off_ids(t public.ppm_tasks) returns uuid[]
language sql stable as $$
  select case t.completion_policy
    when 'reviewer' then array_remove(array[t.reviewer_id], null)
    when 'specific' then coalesce(t.completion_approvers, '{}')
    when 'assigner' then array_remove(array[coalesce(t.assigned_by, t.created_by)], null)
    else '{}'::uuid[]
  end
$$;

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
      -- Ask the people who can mark it done. When the rule names nobody
      -- ("anyone", "not the assignee"), the reviewer, or else whoever assigned it.
      if cardinality(public.ppm_sign_off_ids(new)) > 0 then
        perform public.ppm_notify(r, uid, 'review', new.id) from unnest(public.ppm_sign_off_ids(new)) as r;
      else
        perform public.ppm_notify(coalesce(new.reviewer_id, new.assigned_by, new.created_by), uid, 'review', new.id);
      end if;
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
