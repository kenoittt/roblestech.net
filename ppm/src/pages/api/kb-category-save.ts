import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { slugify } from '../../lib/kb';

export const prerender = false;

/** Create or rename a handbook category. Admin only. */
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  const back = (msg: string, ok = false) =>
    context.redirect(`/admin/kb?${ok ? 'ok' : 'err'}=${encodeURIComponent(msg)}`);

  // The "add" row sits in the same table as the editable ones and posts on
  // every save, so an empty title means nothing was typed, not an error.
  if (!title) return context.redirect('/admin/kb');

  const slug = slugify(String(form.get('slug') ?? '').trim() || title);
  if (!slug) return back('That title produces an empty slug. Add one by hand.');

  const colorRaw = String(form.get('color') ?? '').trim();
  // A category colour is painted straight into a style attribute, so it has to
  // be a hex colour and nothing else.
  const color = /^#[0-9a-fA-F]{3,8}$/.test(colorRaw) ? colorRaw : '#032C7C';
  const sortRaw = Number(String(form.get('sort') ?? '100'));
  const row = {
    title,
    slug,
    blurb: String(form.get('blurb') ?? '').trim() || null,
    color,
    sort: Number.isFinite(sortRaw) ? Math.trunc(sortRaw) : 100,
  };

  const admin = createSupabaseAdmin();
  const { data: clash } = await admin
    .from('kb_categories').select('id').eq('slug', slug).maybeSingle();
  if (clash && (clash as { id: string }).id !== id) {
    return back(`A category already uses the slug "${slug}".`);
  }

  if (id) {
    const { error } = await admin.from('kb_categories').update(row).eq('id', id);
    if (error) return back(error.message);
    return back(`Saved "${title}".`, true);
  }
  const { error } = await admin.from('kb_categories').insert(row);
  if (error) return back(error.message);
  return back(`Added "${title}".`, true);
};
