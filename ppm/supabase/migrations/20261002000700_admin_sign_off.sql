-- =============================================================================
-- Signing off as an admin, made visible.
-- Admins can still mark any task done, in place of the person its rule names
-- (a reviewer on leave shouldn't block the team). The history now says so:
-- the status change carries "as_admin", so a reviewer's sign-off and an
-- admin's can be told apart.
-- Also: a rule that names nobody (an "assigner" task with no assigner) now
-- refuses, where before its empty answer let anyone through.
-- =============================================================================

-- The task's own rule, without the admin exception. Never null.
create or replace function public.ppm_rule_allows(t public.ppm_tasks, uid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return coalesce(case t.completion_policy
    when 'anyone'       then true
    when 'not_assignee' then t.assignee_id is distinct from uid
    when 'assigner'     then uid = coalesce(t.assigned_by, t.created_by)
    when 'reviewer'     then t.reviewer_id is not null and uid = t.reviewer_id
    when 'specific'     then uid = any (t.completion_approvers)
    else true
  end, false);
end $$;

create or replace function public.ppm_can_complete(t public.ppm_tasks, uid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = uid and role in ('admin', 'super_admin')) then
    return true;
  end if;
  return public.ppm_rule_allows(t, uid);
end $$;

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
