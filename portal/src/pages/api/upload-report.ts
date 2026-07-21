import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: publish a monthly HTML report for a client. The HTML may be
// pasted into the textarea or uploaded as a .html file.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const month = String(form.get('period') ?? ''); // "YYYY-MM" from <input type="month">

  const file = form.get('file');
  let html = String(form.get('html') ?? '');
  if (file instanceof File && file.size > 0) {
    html = await file.text();
  }

  if (!clientId || !title || !month || !html.trim()) {
    return context.redirect(
      '/admin?err=' + encodeURIComponent('Client, title, month, and report HTML are all required.')
    );
  }

  const period = `${month}-01`; // store the month as the first of the month
  const reportId = crypto.randomUUID();
  const storagePath = `${clientId}/${reportId}.html`;

  const admin = createSupabaseAdmin();

  const { error: upErr } = await admin.storage
    .from('reports')
    .upload(storagePath, new Blob([html], { type: 'text/html' }), {
      contentType: 'text/html; charset=utf-8',
      upsert: false,
    });
  if (upErr) return context.redirect('/admin?err=' + encodeURIComponent(upErr.message));

  const { error: insErr } = await admin.from('reports').insert({
    id: reportId,
    client_id: clientId,
    title,
    period,
    storage_path: storagePath,
  });
  if (insErr) {
    await admin.storage.from('reports').remove([storagePath]); // don't orphan the file
    return context.redirect('/admin?err=' + encodeURIComponent(insErr.message));
  }

  return context.redirect('/admin?ok=' + encodeURIComponent(`Report "${title}" published.`));
};
