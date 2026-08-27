import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';
import { getSession } from '../../lib/auth';
import { mergeAuditIntoConfig, type AiAuditFigures } from '../../lib/ai-audit';

export const prerender = false;

/*
 * Set the AI visibility figures directly, without a file.
 *
 * Upload-time extraction handles HTML audits, but audits are delivered as PDFs
 * and reading text out of a PDF needs a ~20MB dependency in the upload path —
 * not something to put in front of a client-facing dashboard for the sake of
 * four numbers. This is the direct route: it takes the figures as typed, and
 * goes through the same merge and the same approval gate as the automatic path,
 * so the dashboard cannot end up in a different shape depending on how the
 * numbers arrived.
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

  const total = Number(String(form.get('total_checks') ?? '').trim());
  const visible = Number(String(form.get('visible_checks') ?? '').trim());
  if (!Number.isFinite(total) || total <= 0) return fail('Total checks must be a number above zero.');
  if (!Number.isFinite(visible) || visible < 0) return fail('Checks visible must be zero or more.');
  if (visible > total) return fail(`Checks visible (${visible}) cannot exceed total checks (${total}).`);

  // Scorecard, one engine per line: "Google 20 3" — engine, checks, visible.
  const scorecard: AiAuditFigures['scorecard'] = [];
  const raw = String(form.get('scorecard') ?? '').trim();
  if (raw) {
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      const m = t.match(/^(.+?)[\s,]+(\d+)[\s,]+(\d+)$/);
      if (!m) return fail(`Could not read the scorecard line "${t}". Use: engine, checks, visible — e.g. "Google 20 3".`);
      const checks = Number(m[2]);
      const vis = Number(m[3]);
      if (vis > checks) return fail(`"${m[1].trim()}" has more visible (${vis}) than checks (${checks}).`);
      const rateNum = checks > 0 ? Number(((vis / checks) * 100).toFixed(2)) : 0;
      scorecard.push({ channel: m[1].trim(), checks, visible: vis, rate: `${rateNum}%` });
    }
    // Refuse a scorecard that contradicts the headline rather than publishing both.
    const sumChecks = scorecard.reduce((a, r) => a + r.checks, 0);
    const sumVisible = scorecard.reduce((a, r) => a + r.visible, 0);
    if (sumChecks !== total || sumVisible !== visible) {
      return fail(
        `The scorecard adds up to ${sumVisible} of ${sumChecks}, but the headline says ${visible} of ${total}. `
        + 'Fix one of them so the dashboard does not show two different answers.'
      );
    }
  }

  const figures: AiAuditFigures = {
    round: String(form.get('round') ?? '').trim(),
    tested: String(form.get('tested') ?? '').trim(),
    totalChecks: total,
    visibleChecks: visible,
    rate: `${Number(((visible / total) * 100).toFixed(2))}%`,
    scorecard,
    source: 'parsed',
  };

  const period = String(form.get('period') ?? '').trim();          // YYYY-MM, optional
  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('clients').select('config, gsc_property').eq('id', clientId).single();
  const current = ((row as { config?: unknown } | null)?.config ?? {}) as Record<string, any>;
  const merged = mergeAuditIntoConfig(current, figures, /^\d{4}-\d{2}$/.test(period) ? `${period}-01` : '');

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
    `AI visibility set to ${visible} of ${total} checks (${figures.rate})`
      + (figures.round ? `, ${figures.round}` : '')
      + (scorecard.length ? `, with ${scorecard.length} engines` : '') + '.'
  );
};
