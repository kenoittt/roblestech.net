import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: delete a client company. Reports cascade-delete; client logins
// become unassigned (their profile.client_id is set null by the FK).
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  if (!id) return context.redirect('/admin/clients?err=' + encodeURIComponent('Missing client.'));

  const admin = createSupabaseAdmin();
  const { error } = await admin.from('clients').delete().eq('id', id);
  if (error) return context.redirect('/admin/clients?err=' + encodeURIComponent(error.message));
  return context.redirect('/admin/clients?ok=' + encodeURIComponent('Client deleted.'));
};
