/*
 * "Was this article helpful?"
 *
 * A plain form POST that redirects back to the article, so the vote works with
 * JavaScript off and leaves no half-state if a request fails. The row is keyed
 * on (article_id, user_id), so voting again replaces the earlier answer rather
 * than stacking another row.
 *
 * user_id comes from the session, never from the request body. The RLS policy
 * enforces the same thing at the database, but the route should not be the
 * only thing standing between a curl and someone else's vote.
 */
import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  const profile = context.locals.profile;
  const isStaff =
    profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'staff';
  if (!user || !isStaff) return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const slug = String(form.get('slug') ?? '');
  const helpfulRaw = String(form.get('helpful') ?? '');
  if (!slug || (helpfulRaw !== 'yes' && helpfulRaw !== 'no')) {
    return new Response('Bad request', { status: 400 });
  }

  const supabase = createSupabaseServer(context);

  const { data: article } = await supabase
    .from('kb_articles').select('id').eq('slug', slug).maybeSingle();
  if (!article) return context.redirect('/kb');

  await supabase.from('kb_feedback').upsert(
    {
      article_id: (article as { id: string }).id,
      user_id: user.id,
      helpful: helpfulRaw === 'yes',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'article_id,user_id' }
  );

  /* Back to where they were, with an anchor so the page lands on the thanks
     rather than scrolling them to the top of an article they just finished. */
  return context.redirect(`/kb/${slug}#helpful`);
};
