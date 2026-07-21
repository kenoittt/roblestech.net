import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: create a new client company.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const name = String(form.get('name') ?? '').trim();
  if (!name) return context.redirect('/admin?err=' + encodeURIComponent('Client name is required.'));

  const admin = createSupabaseAdmin();
  const { error } = await admin.from('clients').insert({ name });
  if (error) return context.redirect('/admin?err=' + encodeURIComponent(error.message));

  return context.redirect('/admin?ok=' + encodeURIComponent(`Client "${name}" created.`));
};
