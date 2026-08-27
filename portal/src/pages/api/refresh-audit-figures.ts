import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';
import { getSession } from '../../lib/auth';
import { extractAudit, mergeAuditIntoConfig } from '../../lib/ai-audit';

export const prerender = false;

/*
 * Re-read the AI visibility figures from a client's most recent stored audit.
 *
 * Uploading an audit now updates those figures on the way in, but any audit
 * added before that existed left the dashboard on an older round — and the file
 * is already in storage, so there is no reason to make anyone upload it again.
 * This reads the newest audit back out and applies its numbers.
 *
 * Goes through the same approval gate as any other config change.
 */
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  const role = profile?.role;
  if (role !== 'admin' && role !== 'super_admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const back = `/admin/content?client=${clientId}`;
  const fail = (m: string) => context.redirect(back + '&err=' + encodeURIComponent(m));
  if (!clientId) return fail('Missing client.');

  const admin = createSupabaseAdmin();

  const { data: latest } = await admin
    .from('reports')
    .select('id, title, period, storage_path')
    .eq('client_id', clientId)
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle();
  const audit = latest as { title: string; period: string; storage_path: string } | null;
  if (!audit) return fail('No audit reports uploaded for this client yet.');

  if (!/\.html?$/i.test(audit.storage_path)) {
    return fail(
      `The most recent audit (${audit.title}) is a PDF, which cannot be read for figures. `
      + 'Re-upload it as HTML, or use the Checks visible / Checks total fields on the upload form.'
    );
  }

  const { data: blob, error: dlErr } = await admin.storage.from('reports').download(audit.storage_path);
  if (dlErr || !blob) return fail(`Could not read the stored audit file: ${dlErr?.message ?? 'not found'}`);

  const figures = extractAudit(await blob.text());
  if (!figures) {
    return fail(
      `No check counts could be read from ${audit.title}. Use the Checks visible / Checks total fields `
      + 'on the upload form to set them, or add an rtc-ai-audit JSON block to the audit template.'
    );
  }

  const { data: row } = await admin.from('clients').select('config, gsc_property').eq('id', clientId).single();
  const current = ((row as { config?: unknown } | null)?.config ?? {}) as Record<string, any>;
  const merged = mergeAuditIntoConfig(current, figures, audit.period);

  return gateChange(
    context,
    'save_config',
    {
      client_id: clientId,
      gsc_property: (row as { gsc_property?: string } | null)?.gsc_property ?? '',
      config: merged,
      __reason: form.get('reason') ?? '',
    },
    back,
    `AI visibility updated from ${audit.title}: ${figures.visibleChecks} of ${figures.totalChecks} checks (${figures.rate})`
      + (figures.round ? `, ${figures.round}` : '') + '.'
  );
};
