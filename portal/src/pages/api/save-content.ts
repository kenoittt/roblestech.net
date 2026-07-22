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

  const config = {
    ...existing,
    baseline: {
      window: String(form.get('bl_window') ?? ''),
      serviceStart: String(form.get('bl_serviceStart') ?? ''),
      captured: String(form.get('bl_captured') ?? ''),
      clicks: num(form.get('bl_clicks')),
      impr: num(form.get('bl_impr')),
      ctr: String(form.get('bl_ctr') ?? ''),
      avgPos: String(form.get('bl_avgPos') ?? ''),
      postsLive: num(form.get('bl_postsLive')),
      aiText: String(form.get('bl_aiText') ?? ''),
      aiSub: String(form.get('bl_aiSub') ?? ''),
      pages: parseArr(form.get('bl_pages')),
    },
    pipeline: parseArr(form.get('pipeline')),
    openItems: parseArr(form.get('openItems')),
  };

  return gateChange(
    context,
    'save_config',
    { client_id: clientId, gsc_property: (row as any)?.gsc_property ?? '', config, __reason: form.get('reason') ?? '' },
    `/admin/content?client=${clientId}`
  );
};
