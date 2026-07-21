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
  const id = String(form.get('id') ?? '');
  const newStatus = form.has('status') ? String(form.get('status')) : null;
  const newAssignee = form.has('assignee_id') ? (String(form.get('assignee_id')) || null) : undefined;
  if (!id) return context.redirect('/?err=' + encodeURIComponent('Missing task id.'));

  const admin = createSupabaseAdmin();
  const { data: cur } = await admin
    .from('ppm_tasks')
    .select('title, status, assignee_id, created_by')
    .eq('id', id)
    .single();
  if (!cur) return context.redirect('/?err=' + encodeURIComponent('Task not found.'));
  const task = cur as { title: string; status: string; assignee_id: string | null; created_by: string | null };

  const patch: Record<string, unknown> = {};
  const events: Record<string, unknown>[] = [];
  const emailFor = async (uid: string | null, subject: string, title: string, lines: string[]) => {
    if (!uid) return;
    try {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) await sendMail(u.user.email, subject, notifyHtml(title, lines, `${APP_URL}/`));
    } catch { /* best-effort */ }
  };

  if (newStatus && newStatus !== task.status) {
    patch.status = newStatus;
    patch.completed_at = newStatus === 'done' ? new Date().toISOString() : null;
    events.push({ task_id: id, actor_id: user.id, type: 'status_changed', from_status: task.status, to_status: newStatus });
  }
  if (newAssignee !== undefined && newAssignee !== task.assignee_id) {
    patch.assignee_id = newAssignee;
    events.push({ task_id: id, actor_id: user.id, type: 'assigned', meta: { assignee_id: newAssignee } });
  }

  if (Object.keys(patch).length === 0) return context.redirect('/');

  const { error } = await admin.from('ppm_tasks').update(patch).eq('id', id);
  if (error) return context.redirect('/?err=' + encodeURIComponent(error.message));
  if (events.length) await admin.from('ppm_task_events').insert(events);

  // Notifications (best-effort)
  if (patch.assignee_id) {
    await emailFor(newAssignee, `Task assigned: ${task.title}`, 'A task was assigned to you', [`<b>${task.title}</b>`]);
  }
  if (patch.status) {
    const label = newStatus === 'done' ? 'completed' : `moved to ${String(newStatus).replace('_', ' ')}`;
    await emailFor(task.created_by, `Task ${label}: ${task.title}`, `Task ${label}`, [`<b>${task.title}</b>`]);
  }

  return context.redirect('/');
};
