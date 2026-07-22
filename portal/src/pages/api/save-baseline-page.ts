import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

// Save / delete / add ONE row of the baseline "top pages" list.
// The stored config is fetched fresh and only that row is touched.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const op = String(form.get('op') ?? 'save'); // save | delete | add
  const index = Number(form.get('index') ?? -1);
  const back = `/admin/content?client=${clientId}`;
  if (!clientId) return context.redirect('/admin?err=' + encodeURIComponent('Missing client.'));

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('clients').select('config, gsc_property').eq('id', clientId).single();
  const existing = ((row as any)?.config && typeof (row as any).config === 'object') ? (row as any).config : {};
  const pages: any[] = Array.isArray(existing.baseline?.pages) ? [...existing.baseline.pages] : [];

  const num = (v: FormDataEntryValue | null) => Number(String(v ?? '').replace(/[, ]/g, '')) || 0;
  const entry = {
    page: String(form.get('page') ?? '').trim(),
    clicks: num(form.get('clicks')),
    impr: num(form.get('impr')),
  };

  if (op === 'add') {
    if (!entry.page) return context.redirect(back + '&err=' + encodeURIComponent('Page URL is required.'));
    pages.push(entry);
  } else if (op === 'delete') {
    if (index < 0 || index >= pages.length) return context.redirect(back + '&err=' + encodeURIComponent('Row not found.'));
    pages.splice(index, 1);
  } else {
    if (index < 0 || index >= pages.length) return context.redirect(back + '&err=' + encodeURIComponent('Row not found.'));
    if (!entry.page) return context.redirect(back + '&err=' + encodeURIComponent('Page URL is required.'));
    pages[index] = entry;
  }

  const config = { ...existing, baseline: { ...(existing.baseline ?? {}), pages } };
  return gateChange(
    context,
    'save_config',
    { client_id: clientId, gsc_property: (row as any)?.gsc_property ?? '', config, __reason: form.get('reason') ?? '' },
    back
  );
};
