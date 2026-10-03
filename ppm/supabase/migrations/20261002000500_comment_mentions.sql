-- =============================================================================
-- @mentions in comments. The app sends who was mentioned; the database tells
-- them. Anyone mentioned gets one "mention" notification; the task's people who
-- weren't mentioned still get the usual "comment" one. Nobody gets both.
-- =============================================================================
alter table public.ppm_task_comments add column if not exists mentions uuid[] not null default '{}';

create or replace function public.ppm_comments_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t public.ppm_tasks;
  r uuid;
  excerpt text := left(new.body, 140);
begin
  select * into t from public.ppm_tasks where id = new.task_id;
  insert into public.ppm_task_events (task_id, actor_id, type, meta)
  values (new.task_id, new.author_id, 'commented', jsonb_build_object('comment_id', new.id));

  -- Only people who can see the task can be told about it.
  for r in select distinct x from unnest(new.mentions) as x
           where x is not null
             and exists (select 1 from public.profiles p
                         where p.id = x and p.role in ('super_admin', 'admin', 'staff') and p.deactivated_at is null)
             and (not t.is_private or x = t.created_by or x = t.assignee_id) loop
    perform public.ppm_notify(r, new.author_id, 'mention', new.task_id,
                              jsonb_build_object('comment_id', new.id, 'excerpt', excerpt));
  end loop;

  for r in select distinct x from unnest(array[t.assignee_id, t.created_by, t.assigned_by, t.reviewer_id]) as x
           where x is not null and not (x = any (new.mentions)) loop
    perform public.ppm_notify(r, new.author_id, 'comment', new.task_id,
                              jsonb_build_object('comment_id', new.id, 'excerpt', excerpt));
  end loop;
  return new;
end $$;
