import type { APIRoute } from 'astro';
import { getSession, canUsePpm } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || !canUsePpm(profile)) return new Response('Forbidden', { status: 403 });
  const form = await context.request.formData();
  const name = String(form.get('name') ?? '').trim();
  const color = String(form.get('color') ?? '#0464DD');
  if (!name) return context.redirect('/admin?err=' + encodeURIComponent('Project name is required.'));
  const admin = createSupabaseAdmin();
  const { error } = await admin.from('ppm_projects').insert({ name, color, created_by: user.id });
  if (error) return context.redirect('/admin?err=' + encodeURIComponent(error.message));
  return context.redirect('/admin?ok=' + encodeURIComponent(`Project "${name}" created.`));
};
