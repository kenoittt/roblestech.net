import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: link (enable) or unlink (disable) a client login to a company.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const userId = String(form.get('user_id') ?? '');
  const clientId = String(form.get('client_id') ?? '') || null;
  if (!userId) return context.redirect('/admin?err=' + encodeURIComponent('Missing user.'));

  const admin = createSupabaseAdmin();
  const { error } = await admin.from('profiles').update({ client_id: clientId }).eq('id', userId);
  if (error) return context.redirect('/admin?err=' + encodeURIComponent(error.message));

  return context.redirect('/admin?ok=' + encodeURIComponent(clientId ? 'Dashboard enabled for that login.' : 'Dashboard access disabled for that login.'));
};
