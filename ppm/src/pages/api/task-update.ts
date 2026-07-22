import type { APIRoute } from 'astro';
import { getSession, canUsePpm } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { sendMail, notifyHtml } from '../../lib/email';
import { APP_URL } from '../../lib/env';

export const prerender = false;

// Inline task edit — accepts any of: title, status, assignee_id, priority,
// due_date, project_id. Only submitted fields are changed (sheet-style saves).
export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || !canUsePpm(profile)) return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const backRaw = String(form.get('back') ?? '');
  const back = backRaw.startsWith('/') && !backRaw.startsWith('//') ? backRaw : '/tasks';
  if (!id) return context.redirect(back);

  const admin = createSupabaseAdmin();
  const { data: cur } = await admin
    .from('ppm_tasks')
    .select('title, status, assignee_id, created_by, priority, due_date, project_id')
    .eq('id', id)
    .single();
  if (!cur) return context.redirect(back);
  const task = cur as {
    title: string; status: string; assignee_id: string | null; created_by: string | null;
    priority: string; due_date: string | null; project_id: string | null;
  };

  const patch: Record<string, unknown> = {};
  const events: Record<string, unknown>[] = [];

  if (form.has('title')) {
    const title = String(form.get('title') ?? '').trim();
    if (title && title !== task.title) { patch.title = title; events.push({ task_id: id, actor_id: user.id, type: 'updated', meta: { field: 'title', from: task.title, to: title } }); }
  }
  if (form.has('priority')) {
    const p = String(form.get('priority'));
    if (['low', 'medium', 'high'].includes(p) && p !== task.priority) { patch.priority = p; events.push({ task_id: id, actor_id: user.id, type: 'updated', meta: { field: 'priority', to: p } }); }
  }
  if (form.has('due_date')) {
    const d = String(form.get('due_date') ?? '') || null;
    if (d !== task.due_date) { patch.due_date = d; events.push({ task_id: id, actor_id: user.id, type: 'updated', meta: { field: 'due_date', to: d } }); }
  }
  if (form.has('project_id')) {
    const pj = String(form.get('project_id') ?? '') || null;
    if (pj !== task.project_id) { patch.project_id = pj; events.push({ task_id: id, actor_id: user.id, type: 'updated', meta: { field: 'project', to: pj } }); }
  }
  const newStatus = form.has('status') ? String(form.get('status')) : null;
  if (newStatus && newStatus !== task.status && ['todo', 'in_progress', 'done'].includes(newStatus)) {
    patch.status = newStatus;
    patch.completed_at = newStatus === 'done' ? new Date().toISOString() : null;
    events.push({ task_id: id, actor_id: user.id, type: 'status_changed', from_status: task.status, to_status: newStatus });
  }
  const newAssignee = form.has('assignee_id') ? (String(form.get('assignee_id')) || null) : undefined;
  if (newAssignee !== undefined && newAssignee !== task.assignee_id) {
    patch.assignee_id = newAssignee;
    events.push({ task_id: id, actor_id: user.id, type: 'assigned', meta: { assignee_id: newAssignee } });
  }

  if (Object.keys(patch).length === 0) return context.redirect(back);

  const { error } = await admin.from('ppm_tasks').update(patch).eq('id', id);
  if (error) return context.redirect(back + (back.includes('?') ? '&' : '?') + 'err=' + encodeURIComponent(error.message));
  if (events.length) await admin.from('ppm_task_events').insert(events);

  const emailFor = async (uid: string | null, subject: string, title: string, lines: string[]) => {
    if (!uid) return;
    try {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) await sendMail(u.user.email, subject, notifyHtml(title, lines, `${APP_URL}/`));
    } catch { /* best-effort */ }
  };
  if (patch.assignee_id) await emailFor(newAssignee!, `Task assigned: ${task.title}`, 'A task was assigned to you', [`<b>${task.title}</b>`]);
  if (patch.status) {
    const label = newStatus === 'done' ? 'completed' : `moved to ${String(newStatus).replace('_', ' ')}`;
    await emailFor(task.created_by, `Task ${label}: ${task.title}`, `Task ${label}`, [`<b>${task.title}</b>`]);
  }

  return context.redirect(back);
};
