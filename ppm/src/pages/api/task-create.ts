import type { APIRoute } from 'astro';
import { getSession, canUsePpm } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { sendMail, notifyHtml } from '../../lib/email';
import { APP_URL } from '../../lib/env';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || !canUsePpm(profile)) return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const title = String(form.get('title') ?? '').trim();
  const assignee_id = String(form.get('assignee_id') ?? '') || null;
  const priority = String(form.get('priority') ?? 'medium');
  const due_date = String(form.get('due_date') ?? '') || null;
  const project_id = String(form.get('project_id') ?? '') || null;
  const description = String(form.get('description') ?? '') || null;
  if (!title) return context.redirect('/?err=' + encodeURIComponent('Task title is required.'));

  const admin = createSupabaseAdmin();
  const { data: task, error } = await admin
    .from('ppm_tasks')
    .insert({ title, assignee_id, priority, due_date, project_id, description, created_by: user.id })
    .select('id')
    .single();
  if (error || !task) return context.redirect('/?err=' + encodeURIComponent(error?.message ?? 'Could not create task.'));

  const taskId = (task as { id: string }).id;
  await admin.from('ppm_task_events').insert([
    { task_id: taskId, actor_id: user.id, type: 'created', to_status: 'todo' },
    ...(assignee_id ? [{ task_id: taskId, actor_id: user.id, type: 'assigned', meta: { assignee_id } }] : []),
  ]);

  // Notify the assignee (best-effort).
  if (assignee_id) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(assignee_id);
      if (u?.user?.email) {
        await sendMail(
          u.user.email,
          `New task assigned: ${title}`,
          notifyHtml('You have a new task', [
            `<b>${title}</b>`,
            priority === 'high' ? 'Priority: <b>High</b>' : `Priority: ${priority}`,
            due_date ? `Due: ${due_date}` : 'No due date',
          ], `${APP_URL}/`)
        );
      }
    } catch { /* email is best-effort */ }
  }

  return context.redirect('/?ok=' + encodeURIComponent('Task added.'));
};
