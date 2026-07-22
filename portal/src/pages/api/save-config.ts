import type { APIRoute } from 'astro';
import { gateChange } from '../../lib/approvals';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Update a client's GSC property and dashboard config JSON (super admins
// apply immediately; regular admins submit for approval).
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const configRaw = String(form.get('config') ?? '').trim();
  if (!clientId) return context.redirect('/admin?err=' + encodeURIComponent('Missing client.'));

  // An empty textarea keeps the existing config — it must never wipe content.
  let config: unknown;
  if (configRaw) {
    try { config = JSON.parse(configRaw); }
    catch (e) { return context.redirect('/admin?err=' + encodeURIComponent('Config is not valid JSON: ' + String(e))); }
  } else {
    const admin = createSupabaseAdmin();
    const { data: row } = await admin.from('clients').select('config').eq('id', clientId).single();
    config = (row as any)?.config ?? {};
  }

  return gateChange(
    context,
    'save_config',
    { client_id: clientId, gsc_property: String(form.get('gsc_property') ?? '').trim(), config, __reason: form.get('reason') ?? '' },
    '/admin'
  );
};
