import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

/*
 * Delete a handbook category. Admin only.
 *
 * Its articles are NOT deleted with it. The foreign key is ON DELETE SET NULL,
 * so they survive without a category and stay reachable by search and by URL.
 * Losing a shelf should not lose what was on it.
 */
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }
  const form = await context.request.formData();
  const id = String(form.get('id') ?? '').trim();
  if (!id) return context.redirect('/admin/kb');

  const admin = createSupabaseAdmin();
  const { count } = await admin
    .from('kb_articles').select('id', { count: 'exact', head: true }).eq('category_id', id);
  const { error } = await admin.from('kb_categories').delete().eq('id', id);
  if (error) return context.redirect('/admin/kb?err=' + encodeURIComponent(error.message));
  const note = count ? ` ${count} article${count === 1 ? '' : 's'} kept, now uncategorised.` : '';
  return context.redirect('/admin/kb?ok=' + encodeURIComponent('Category deleted.' + note));
};
