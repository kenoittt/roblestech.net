import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

/** Delete a handbook article. Admin only. */
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }
  const form = await context.request.formData();
  const id = String(form.get('id') ?? '').trim();
  if (!id) return context.redirect('/admin/kb');

  const admin = createSupabaseAdmin();
  const { data: row } = await admin
    .from('kb_articles').select('title').eq('id', id).maybeSingle();
  const { error } = await admin.from('kb_articles').delete().eq('id', id);
  if (error) return context.redirect('/admin/kb?err=' + encodeURIComponent(error.message));
  const name = (row as { title: string } | null)?.title ?? 'Article';
  return context.redirect('/admin/kb?ok=' + encodeURIComponent(`Deleted "${name}".`));
};
