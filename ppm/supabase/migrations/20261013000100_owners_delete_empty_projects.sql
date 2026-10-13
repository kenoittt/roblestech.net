-- =============================================================================
-- A project's owner may delete it while it's empty (Kenneth, 2026-10-07:
-- decision 0013). Until now only admins could delete a project, so one made by
-- mistake, or for a test, needed an admin before it could go away.
--
-- "Empty" means no tasks at all. Deleted tasks count, and so do tasks the owner
-- can't see (someone's private one): a project that has held work keeps the
-- safer path, where its owner archives it and an admin deletes it. That way
-- nobody's task, or its history, loses its project because someone else
-- tidied up.
--
-- Two places decide who may delete a project, and they change together: the
-- delete rule on ppm_projects, and ppm_delete_project(), which the app calls
-- so a refusal can say why. Admins keep everything they had. Safe to run twice.
-- =============================================================================

-- Who may delete a project: an admin, always; its owner, while it has no tasks.
-- It runs as the database's owner because it has to count every task in the
-- project, including the ones the person asking can't see. It only ever
-- answers for the person asking, with a yes or a no.
create or replace function public.ppm_can_delete_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or (public.is_ppm_user()
          and exists (select 1 from public.ppm_projects p where p.id = pid and p.owner_id = auth.uid())
          and not exists (select 1 from public.ppm_tasks t where t.project_id = pid));
$$;

revoke execute on function public.ppm_can_delete_project(uuid) from public, anon;
grant execute on function public.ppm_can_delete_project(uuid) to authenticated;

drop policy if exists ppm_projects_delete on public.ppm_projects;
create policy ppm_projects_delete on public.ppm_projects
  for delete using (public.ppm_can_delete_project(id));

-- The same function as before, with the new rule and a reason for an owner
-- whose project isn't empty. Everything after the check is unchanged.
create or replace function public.ppm_delete_project(pid uuid, delete_tasks boolean default false)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  hidden integer := 0;
begin
  -- Who's asking comes first, so nobody else learns anything, even whether it exists.
  if not public.ppm_can_delete_project(pid) then
    if exists (select 1 from public.ppm_projects where id = pid and owner_id = auth.uid()) then
      raise exception 'This project has tasks, deleted ones included, so only an admin can delete it. You can archive it instead.' using errcode = '42501';
    end if;
    raise exception 'Only admins can delete a project. You can archive it instead.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ppm_projects where id = pid) then
    raise exception 'That project no longer exists.' using errcode = 'P0002';
  end if;

  if delete_tasks then
    update public.ppm_tasks set deleted_at = now() where project_id = pid and deleted_at is null;
    get diagnostics hidden = row_count;
  end if;

  delete from public.ppm_projects where id = pid;
  if not found then
    raise exception 'Only admins can delete a project. You can archive it instead.' using errcode = '42501';
  end if;
  -- How many tasks went with it, for the confirmation.
  return hidden;
end $$;

revoke execute on function public.ppm_delete_project(uuid, boolean) from public, anon;
grant execute on function public.ppm_delete_project(uuid, boolean) to authenticated;
