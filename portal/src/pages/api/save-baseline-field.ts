import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

const STR_FIELDS = new Set(['window', 'serviceStart', 'captured', 'ctr', 'avgPos', 'aiText', 'aiSub']);
const NUM_FIELDS = new Set(['clicks', 'impr', 'postsLive']);

// Save ONE baseline field for a client. The stored config is fetched fresh
// and only this field is patched, so nothing else can be affected.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const field = String(form.get('field') ?? '');
  const raw = String(form.get('value') ?? '').trim();
  const back = `/admin/content?client=${clientId}`;

  if (!clientId) return context.redirect('/admin?err=' + encodeURIComponent('Missing client.'));
  if (!STR_FIELDS.has(field) && !NUM_FIELDS.has(field)) {
    return context.redirect(back + '&err=' + encodeURIComponent('Unknown baseline field.'));
  }

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('clients').select('config, gsc_property').eq('id', clientId).single();
  const existing = ((row as any)?.config && typeof (row as any).config === 'object') ? (row as any).config : {};

  const value = NUM_FIELDS.has(field) ? (Number(raw.replace(/[, ]/g, '')) || 0) : raw;
  const config = { ...existing, baseline: { ...(existing.baseline ?? {}), [field]: value } };

  return gateChange(
    context,
    'save_config',
    { client_id: clientId, gsc_property: (row as any)?.gsc_property ?? '', config, __reason: form.get('reason') ?? '' },
    back
  );
};
