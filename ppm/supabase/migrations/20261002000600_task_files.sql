-- =============================================================================
-- Files on tasks: a draft, a screenshot, a brief. Stored in the private
-- "task-files" bucket under the task's id; anyone who can see the task can see
-- and add its files; the person who added one (or an admin) can remove it.
-- =============================================================================
create table if not exists public.ppm_task_files (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.ppm_tasks(id) on delete cascade,
  uploaded_by  uuid default auth.uid() references auth.users(id) on delete set null,
  name         text not null,
  size         bigint not null default 0,
  content_type text,
  path         text not null unique,
  created_at   timestamptz not null default now()
);
create index if not exists ppm_task_files_task_idx on public.ppm_task_files (task_id, created_at);

alter table public.ppm_task_files enable row level security;
drop policy if exists ppm_files_read on public.ppm_task_files;
create policy ppm_files_read on public.ppm_task_files
  for select using (public.is_ppm_user() and public.ppm_task_visible(task_id));
drop policy if exists ppm_files_insert on public.ppm_task_files;
create policy ppm_files_insert on public.ppm_task_files
  for insert with check (public.is_ppm_user() and uploaded_by = auth.uid() and public.ppm_task_visible(task_id));
drop policy if exists ppm_files_delete on public.ppm_task_files;
create policy ppm_files_delete on public.ppm_task_files
  for delete using (uploaded_by = auth.uid() or public.is_admin());

-- The task's history says when a file was added.
create or replace function public.ppm_files_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.ppm_task_events (task_id, actor_id, type, meta)
  values (new.task_id, new.uploaded_by, 'attached', jsonb_build_object('name', new.name));
  return new;
end $$;

drop trigger if exists ppm_files_after on public.ppm_task_files;
create trigger ppm_files_after after insert on public.ppm_task_files
  for each row execute function public.ppm_files_after();

do $$
begin
  if to_regclass('storage.objects') is null then return; end if;

  insert into storage.buckets (id, name, public, file_size_limit)
  values ('task-files', 'task-files', false, 26214400)
  on conflict (id) do nothing;

  drop policy if exists "task files: read where the task is visible" on storage.objects;
  create policy "task files: read where the task is visible" on storage.objects
    for select to authenticated
    using (bucket_id = 'task-files' and public.is_ppm_user()
           and public.ppm_task_visible(((storage.foldername(name))[1])::uuid));

  drop policy if exists "task files: add where the task is visible" on storage.objects;
  create policy "task files: add where the task is visible" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'task-files' and public.is_ppm_user()
                and public.ppm_task_visible(((storage.foldername(name))[1])::uuid));

  drop policy if exists "task files: remove your own" on storage.objects;
  create policy "task files: remove your own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'task-files' and (owner = auth.uid() or public.is_admin()));
end $$;
