import type { APIRoute } from 'astro';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

// Update a client's GSC property and dashboard config JSON (super admins
// apply immediately; regular admins submit for approval).
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const configRaw = String(form.get('config') ?? '').trim();
  if (!clientId) return context.redirect('/admin?err=' + encodeURIComponent('Missing client.'));

  let config: unknown = {};
  if (configRaw) {
    try { config = JSON.parse(configRaw); }
    catch (e) { return context.redirect('/admin?err=' + encodeURIComponent('Config is not valid JSON: ' + String(e))); }
  }

  return gateChange(
    context,
    'save_config',
    { client_id: clientId, gsc_property: String(form.get('gsc_property') ?? '').trim(), config, __reason: form.get('reason') ?? '' },
    '/admin'
  );
};
