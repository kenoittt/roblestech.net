import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { slugify } from '../../lib/kb';

export const prerender = false;

const VALID_STATUS = new Set(['ready', 'draft', 'needed']);

/*
 * Create or update a handbook article. Admin only.
 *
 * The role is re-checked here rather than trusted from the page that posted.
 * The admin page is guarded by middleware, but an endpoint that assumes its
 * caller came from a guarded page is an endpoint anyone can call directly.
 */
export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  const back = (msg: string, ok = false) =>
    context.redirect(`/admin/kb?${ok ? 'ok' : 'err'}=${encodeURIComponent(msg)}`);

  if (!title) return back('An article needs a title.');

  const slug = slugify(String(form.get('slug') ?? '').trim() || title);
  if (!slug) return back('That title produces an empty URL slug. Add a slug by hand.');

  const status = String(form.get('status') ?? 'draft');
  const row = {
    title,
    slug,
    summary: String(form.get('summary') ?? '').trim() || null,
    body: String(form.get('body') ?? ''),
    status: VALID_STATUS.has(status) ? status : 'draft',
    owner: String(form.get('owner') ?? '').trim() || null,
    keywords: String(form.get('keywords') ?? '').trim() || null,
    category_id: String(form.get('category_id') ?? '').trim() || null,
    topic_id: String(form.get('topic_id') ?? '').trim() || null,
    updated_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const admin = createSupabaseAdmin();

  // The slug is unique, and a clash here is a person's mistake rather than a
  // system error, so it gets a sentence instead of a constraint violation.
  const { data: clash } = await admin
    .from('kb_articles').select('id').eq('slug', slug).maybeSingle();
  if (clash && (clash as { id: string }).id !== id) {
    return back(`An article already uses the URL /kb/${slug}. Pick a different slug.`);
  }

  if (id) {
    const { error } = await admin.from('kb_articles').update(row).eq('id', id);
    if (error) return back(error.message);
    return back(`Saved. /kb/${slug}`, true);
  }

  const { error } = await admin
    .from('kb_articles').insert({ ...row, created_by: user?.id ?? null });
  if (error) return back(error.message);
  return back(`Created. /kb/${slug}`, true);
};
