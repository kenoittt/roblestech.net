-- =============================================================================
-- A task's time blocks follow it to done (Kyan, 2026-10-06).
--
-- A time block can be for a task. When the task is finished, its blocks that
-- aren't ticked off yet are ticked off, whoever finished it: the time set
-- aside for it is done with. Reopening the task unticks exactly those blocks,
-- and leaves alone any block someone ticked off themselves.
--
-- Nothing else changes: a block can still be ticked off while its task goes
-- on (you worked on it, and it continues tomorrow), by hand or by itself once
-- its time has passed.
--
-- It runs as the database's owner because blocks belong to whoever planned
-- them, and the person finishing the task (a reviewer, an admin signing off)
-- often isn't that person. It changes one column, completed_at, and only on
-- blocks for the task that changed.
-- =============================================================================

create or replace function public.cal_blocks_follow_task() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    -- Stamped with the task's own finishing time, so reopening can tell them apart.
    update public.cal_events
       set completed_at = coalesce(new.completed_at, now())
     where task_id = new.id and kind = 'block' and completed_at is null;
  elsif old.status = 'done' and new.status is distinct from 'done' and old.completed_at is not null then
    update public.cal_events
       set completed_at = null
     where task_id = new.id and kind = 'block' and completed_at = old.completed_at;
  end if;
  return null;
end $$;

drop trigger if exists cal_blocks_follow_task on public.ppm_tasks;
create trigger cal_blocks_follow_task after update of status on public.ppm_tasks
  for each row execute function public.cal_blocks_follow_task();

-- Finding a task's blocks, here and in the calendar, shouldn't read every block.
create index if not exists cal_events_task_idx on public.cal_events (task_id) where task_id is not null;
