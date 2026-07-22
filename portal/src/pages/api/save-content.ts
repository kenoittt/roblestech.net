import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? '').replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const parseArr = (v: FormDataEntryValue | null) => {
  try { const a = JSON.parse(String(v ?? '[]')); return Array.isArray(a) ? a : []; } catch { return []; }
};

// Save Baseline + Content pipeline + Open items into a client's config,
// preserving the rest (brand, hero, aiAudit, sopSteps). Routes through the
// approval gate (super admins apply; regular admins queue for approval).
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  if (!clientId) return context.redirect('/admin?err=' + encodeURIComponent('Missing client.'));

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('clients').select('config, gsc_property').eq('id', clientId).single();
  const existing = ((row as any)?.config && typeof (row as any).config === 'object') ? (row as any).config : {};

  // Merge baseline per field: locked (disabled) inputs are not submitted by
  // the browser, so only fields the admin unlocked with the pencil are
  // updated — everything else keeps its stored value.
  const baseline: Record<string, unknown> = { ...(existing.baseline ?? {}) };
  const strFields = ['window', 'serviceStart', 'captured', 'ctr', 'avgPos', 'aiText', 'aiSub'];
  const numFields = ['clicks', 'impr', 'postsLive'];
  for (const f of strFields) if (form.has('bl_' + f)) baseline[f] = String(form.get('bl_' + f) ?? '');
  for (const f of numFields) if (form.has('bl_' + f)) baseline[f] = num(form.get('bl_' + f));
  if (form.has('bl_pages')) baseline.pages = parseArr(form.get('bl_pages'));

  const config = {
    ...existing,
    baseline,
    ...(form.has('pipeline') ? { pipeline: parseArr(form.get('pipeline')) } : {}),
    ...(form.has('openItems') ? { openItems: parseArr(form.get('openItems')) } : {}),
  };

  return gateChange(
    context,
    'save_config',
    { client_id: clientId, gsc_property: (row as any)?.gsc_property ?? '', config, __reason: form.get('reason') ?? '' },
    `/admin/content?client=${clientId}`
  );
};
