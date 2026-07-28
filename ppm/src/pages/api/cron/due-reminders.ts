import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';
import { notifyUser } from '../../../lib/notify';
import { pick } from '../../../lib/env';
import { OPEN_STATUSES } from '../../../lib/queries';

export const prerender = false;

/*
 * Daily due-date reminders. Vercel Cron calls this once a day.
 * Emails assignees of tasks due today or tomorrow that aren't done yet.
 */
export const GET: APIRoute = async (context) => {
  const secret = pick('CRON_SECRET');
  const auth = context.request.headers.get('authorization') ?? '';
  const key = context.url.searchParams.get('key') ?? '';
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const { data: tasks, error } = await admin
    .from('ppm_tasks')
    .select('id, title, due_date, assignee_id')
    .in('status', OPEN_STATUSES)
    .not('assignee_id', 'is', null)
    .in('due_date', [iso(today), iso(tomorrow)]);
  if (error) return new Response(`DB error: ${error.message}`, { status: 500 });

  // notifyUser skips anyone who turned task emails off on their account page.
  let sent = 0;
  for (const t of tasks ?? []) {
    const task = t as { title: string; due_date: string; assignee_id: string };
    const when = task.due_date === iso(today) ? 'today' : 'tomorrow';
    const did = await notifyUser(
      admin,
      task.assignee_id,
      `Reminder: "${task.title}" is due ${when}`,
      'Task due soon',
      [`<b>${task.title}</b>`, `Due ${when} (${task.due_date}).`]
    );
    if (did) sent++;
  }

  return new Response(JSON.stringify({ ran: new Date().toISOString(), reminders: sent }), {
    headers: { 'content-type': 'application/json' },
  });
};
