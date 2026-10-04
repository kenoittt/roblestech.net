-- =============================================================================
-- Archiving and deleting projects (Kyan, 2026-10-04: a test project couldn't be
-- removed; nobody, super admins included, had a way to delete or archive one).
--
-- Archive needs nothing new here. ppm_projects.archived has been in the schema
-- since the first PPM, the sidebar and the project pickers already hide
-- archived projects, and the existing update rule (whoever can manage the
-- project: its owner, an owner-member, an admin) decides who can set it. The
-- app now sets it, and can set it back.
--
-- Delete stays admins-only, as ppm_projects_delete already says. This function
-- deletes a project and, when asked, its tasks, in one transaction, so it never
-- stops halfway. Tasks are deleted the app's usual way: hidden, with history,
-- never removed. Tasks the person deleting can't see (someone's private task)
-- are left as they are and lose the project.
-- =============================================================================

create or replace function public.ppm_delete_project(pid uuid, delete_tasks boolean default false)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  hidden integer := 0;
begin
  -- Who's asking comes first, so nobody else learns anything, even whether it exists.
  if not public.is_admin() then
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
