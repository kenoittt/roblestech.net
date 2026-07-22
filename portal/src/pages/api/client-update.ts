import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: update a client company's name and GSC property.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const name = String(form.get('name') ?? '').trim();
  const gsc_property = String(form.get('gsc_property') ?? '').trim();
  if (!id || !name) return context.redirect('/admin/clients?err=' + encodeURIComponent('Name is required.'));

  const admin = createSupabaseAdmin();
  const { error } = await admin.from('clients').update({ name, gsc_property: gsc_property || null }).eq('id', id);
  if (error) return context.redirect('/admin/clients?err=' + encodeURIComponent(error.message));
  return context.redirect('/admin/clients?ok=' + encodeURIComponent('Client updated.'));
};
