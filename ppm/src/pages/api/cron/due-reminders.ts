import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';
import { sendMail, notifyHtml } from '../../../lib/email';
import { pick, APP_URL } from '../../../lib/env';

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
    .neq('status', 'done')
    .not('assignee_id', 'is', null)
    .in('due_date', [iso(today), iso(tomorrow)]);
  if (error) return new Response(`DB error: ${error.message}`, { status: 500 });

  let sent = 0;
  for (const t of tasks ?? []) {
    const task = t as { title: string; due_date: string; assignee_id: string };
    try {
      const { data: u } = await admin.auth.admin.getUserById(task.assignee_id);
      if (u?.user?.email) {
        const when = task.due_date === iso(today) ? 'today' : 'tomorrow';
        await sendMail(
          u.user.email,
          `Reminder: "${task.title}" is due ${when}`,
          notifyHtml('Task due soon', [`<b>${task.title}</b>`, `Due ${when} (${task.due_date}).`], `${APP_URL}/`)
        );
        sent++;
      }
    } catch { /* best-effort */ }
  }

  return new Response(JSON.stringify({ ran: new Date().toISOString(), reminders: sent }), {
    headers: { 'content-type': 'application/json' },
  });
};
