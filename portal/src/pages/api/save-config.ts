import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: update a client's GSC property and dashboard config JSON.
// The config holds the per-client manual content (brand, hero, baseline,
// aiAudit, pipeline, sopSteps, openItems) — this is where custom audit text
// is added. GSC numbers are refreshed separately by the daily cron.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const gscProperty = String(form.get('gsc_property') ?? '').trim();
  const configRaw = String(form.get('config') ?? '').trim();

  if (!clientId) return context.redirect('/admin?err=' + encodeURIComponent('Missing client.'));

  let config: unknown = {};
  if (configRaw) {
    try {
      config = JSON.parse(configRaw);
    } catch (e) {
      return context.redirect('/admin?err=' + encodeURIComponent('Config is not valid JSON: ' + String(e)));
    }
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from('clients')
    .update({ gsc_property: gscProperty || null, config })
    .eq('id', clientId);
  if (error) return context.redirect('/admin?err=' + encodeURIComponent(error.message));

  return context.redirect('/admin?ok=' + encodeURIComponent('Dashboard content saved.'));
};
