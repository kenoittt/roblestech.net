import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { applyChange } from '../../lib/approvals';

export const prerender = false;

// Super-admin only: approve (apply) or reject a pending change request.
export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (profile?.role !== 'super_admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const decision = String(form.get('decision') ?? '');
  if (!id) return context.redirect('/admin?err=' + encodeURIComponent('Missing request.'));

  const admin = createSupabaseAdmin();
  const { data: req } = await admin.from('change_requests').select('kind, payload, status').eq('id', id).single();
  if (!req || (req as any).status !== 'pending') {
    return context.redirect('/admin?err=' + encodeURIComponent('Request not found or already decided.'));
  }

  if (decision === 'approve') {
    const err = await applyChange((req as any).kind, (req as any).payload);
    if (err) return context.redirect('/admin?err=' + encodeURIComponent('Could not apply: ' + err));
    await admin.from('change_requests').update({ status: 'approved', decided_by: user!.id, decided_at: new Date().toISOString() }).eq('id', id);
    return context.redirect('/admin?ok=' + encodeURIComponent('Request approved and applied.'));
  }

  await admin.from('change_requests').update({ status: 'rejected', decided_by: user!.id, decided_at: new Date().toISOString() }).eq('id', id);
  return context.redirect('/admin?ok=' + encodeURIComponent('Request rejected.'));
};
