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
