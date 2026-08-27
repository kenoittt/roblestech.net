import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';
import { getSession } from '../../lib/auth';
import { extractAudit } from '../../lib/ai-audit';

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

  // Read the headline figures out of the audit so the dashboard's AI visibility
  // KPI, headline and scorecard follow the new round automatically. Manual
  // fields on the form win when filled, which is the escape hatch for a PDF or
  // an HTML file the parser cannot read.
  let figures = ext === 'html' ? extractAudit(await file.text()) : null;
  const mTotal = Number(String(form.get('total_checks') ?? '').trim());
  const mVisible = Number(String(form.get('visible_checks') ?? '').trim());
  if (Number.isFinite(mTotal) && mTotal > 0 && Number.isFinite(mVisible) && mVisible >= 0 && mVisible <= mTotal) {
    figures = {
      round: String(form.get('round') ?? '').trim(),
      tested: String(form.get('tested') ?? '').trim(),
      totalChecks: mTotal,
      visibleChecks: mVisible,
      rate: `${Math.round((mVisible / mTotal) * 1000) / 10}%`,
      scorecard: figures?.scorecard ?? [],
      source: 'parsed',
    };
  }

  // Say plainly whether the dashboard figures moved, so a file the parser could
  // not read does not leave last round's numbers looking current.
  const okMessage = figures
    ? `Report uploaded. AI visibility now reads ${figures.visibleChecks} of ${figures.totalChecks} checks (${figures.rate})`
      + (figures.round ? `, ${figures.round}` : '') + '.'
    : `Report uploaded, but no check counts could be read from ${ext === 'pdf' ? 'a PDF' : 'this file'} — `
      + 'the dashboard still shows the previous round. Re-upload with the Checks visible / Checks total fields filled to update it.';

  return gateChange(
    context,
    'audit_add',
    {
      client_id: clientId, title, period, storage_path: storagePath,
      ai_audit: figures ?? null,
      __reason: form.get('reason') ?? '',
    },
    back,
    okMessage
  );
};
