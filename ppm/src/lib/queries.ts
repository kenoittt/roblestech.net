import type { APIContext } from 'astro';
import { createSupabaseServer } from './supabase';

export type Task = {
  id: string; title: string; description: string | null; status: string; priority: string;
  due_date: string | null; assignee_id: string | null; project_id: string | null; completed_at: string | null;
};
export type Person = { id: string; full_name: string | null; role: string };
export type Project = { id: string; name: string; color: string };

/** Load tasks/people/projects and apply ?assignee= ?project= ?status= filters. */
export async function loadPpmData(context: { request: Request; cookies: any; url: URL }) {
  const supabase = createSupabaseServer(context as unknown as APIContext);
  const [{ data: tasksData }, { data: peopleData }, { data: projData }] = await Promise.all([
    supabase.from('ppm_tasks').select('id,title,description,status,priority,due_date,assignee_id,project_id,completed_at').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,full_name,role').in('role', ['super_admin', 'admin', 'staff']).order('full_name'),
    supabase.from('ppm_projects').select('id,name,color').eq('archived', false).order('name'),
  ]);
  const all: Task[] = (tasksData as Task[]) ?? [];
  const people: Person[] = (peopleData as Person[]) ?? [];
  const projects: Project[] = (projData as Project[]) ?? [];

  const fAssignee = context.url.searchParams.get('assignee') ?? '';
  const fProject = context.url.searchParams.get('project') ?? '';
  const fStatus = context.url.searchParams.get('status') ?? '';

  const tasks = all.filter((t) =>
    (!fAssignee || (fAssignee === 'none' ? !t.assignee_id : t.assignee_id === fAssignee)) &&
    (!fProject || t.project_id === fProject) &&
    (!fStatus || t.status === fStatus)
  );

  return { supabase, all, tasks, people, projects, fAssignee, fProject, fStatus };
}

export const nameOf = (people: Person[], id: string | null) =>
  people.find((p) => p.id === id)?.full_name || '—';
