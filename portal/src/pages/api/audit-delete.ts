import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

// Remove a monthly audit report (row + stored file). Gated by approval.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const clientId = String(form.get('client_id') ?? '');
  const back = `/admin/content?client=${clientId}`;
  if (!id) return context.redirect(back + '&err=' + encodeURIComponent('Missing report.'));

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('reports').select('storage_path').eq('id', id).single();

  return gateChange(
    context,
    'audit_delete',
    { id, storage_path: (row as any)?.storage_path ?? null, __reason: form.get('reason') ?? '' },
    back
  );
};
