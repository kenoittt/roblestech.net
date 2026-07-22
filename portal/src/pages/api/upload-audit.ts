import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';
import { getSession } from '../../lib/auth';

export const prerender = false;

// Upload a monthly AI Visibility Audit report (PDF or HTML) for a client.
// The file is stored immediately (private bucket); the visible row is created
// directly for super admins or queued for approval for regular admins.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  const role = profile?.role;
  if (role !== 'admin' && role !== 'super_admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const month = String(form.get('period') ?? ''); // YYYY-MM
  const file = form.get('file');
  const back = `/admin/content?client=${clientId}`;

  if (!clientId || !/^\d{4}-\d{2}$/.test(month) || !(file instanceof File) || file.size === 0) {
    return context.redirect(back + '&err=' + encodeURIComponent('Client, month, and a PDF/HTML file are required.'));
  }
  const lower = file.name.toLowerCase();
  const ext = lower.endsWith('.pdf') ? 'pdf' : (lower.endsWith('.html') || lower.endsWith('.htm')) ? 'html' : null;
  if (!ext) return context.redirect(back + '&err=' + encodeURIComponent('Only PDF or HTML files are accepted.'));

  const period = `${month}-01`;
  const storagePath = `audits/${clientId}/${crypto.randomUUID()}.${ext}`;
  const monthName = new Date(period + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const title = `AI Visibility Audit — ${monthName}`;

  const admin = createSupabaseAdmin();
  const { error: upErr } = await admin.storage.from('reports').upload(storagePath, file, {
    contentType: ext === 'pdf' ? 'application/pdf' : 'text/html; charset=utf-8',
    upsert: false,
  });
  if (upErr) return context.redirect(back + '&err=' + encodeURIComponent(upErr.message));

  return gateChange(
    context,
    'audit_add',
    { client_id: clientId, title, period, storage_path: storagePath, __reason: form.get('reason') ?? '' },
    back
  );
};
