import type { APIRoute } from 'astro';
import { getSession, canUsePpm } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { notifyUser } from '../../lib/notify';

export const prerender = false;

/*
 * Permanently delete a task. The task's own event history is removed with it
 * (ppm_task_events cascades), so we write one standalone "deleted" event with
 * task_id = null AFTER the delete — that row survives the cascade and keeps the
 * activity log honest about who removed what.
 */
export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || !canUsePpm(profile)) return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const backRaw = String(form.get('back') ?? '');
  const back = backRaw.startsWith('/') && !backRaw.startsWith('//') ? backRaw : '/tasks';
  const to = (key: 'ok' | 'err', msg: string) =>
    context.redirect(back + (back.includes('?') ? '&' : '?') + key + '=' + encodeURIComponent(msg));
  if (!id) return context.redirect(back);

  const admin = createSupabaseAdmin();
  const { data: cur } = await admin
    .from('ppm_tasks')
    .select('title, status, priority, due_date, assignee_id, project_id')
    .eq('id', id)
    .single();
  if (!cur) return to('err', 'That task no longer exists.');
  const task = cur as {
    title: string; status: string; priority: string; due_date: string | null;
    assignee_id: string | null; project_id: string | null;
  };

  const { error } = await admin.from('ppm_tasks').delete().eq('id', id);
  if (error) return to('err', error.message);

  await admin.from('ppm_task_events').insert({
    task_id: null,
    actor_id: user.id,
    type: 'deleted',
    from_status: task.status,
    meta: {
      title: task.title,
      task_id: id,
      priority: task.priority,
      due_date: task.due_date,
      assignee_id: task.assignee_id,
      project_id: task.project_id,
    },
  });

  // Let the assignee know their task is gone (unless it was their own doing).
  if (task.assignee_id !== user.id) {
    await notifyUser(admin, task.assignee_id, `Task deleted: ${task.title}`, 'A task assigned to you was deleted', [
      `<b>${task.title}</b>`,
      `Deleted by ${profile?.full_name || 'a team member'}.`,
    ]);
  }

  return to('ok', `Deleted "${task.title}".`);
};
