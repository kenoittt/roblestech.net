import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

/*
 * Streams a profile picture out of the private 'avatars' bucket. You can always
 * fetch your own; only admins can fetch anyone else's (they're the only ones who
 * see other people in the UI, on /admin/users).
 */
export const GET: APIRoute = async (context) => {
  const id = context.params.id ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });

  const { user, profile } = await getSession(context);
  if (!user) return new Response('Forbidden', { status: 403 });
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  if (id !== user.id && !isAdmin) return new Response('Forbidden', { status: 403 });

  const admin = createSupabaseAdmin();
  const { data: prof } = await admin.from('profiles').select('avatar_url').eq('id', id).maybeSingle();
  const path = (prof as { avatar_url: string | null } | null)?.avatar_url;
  if (!path) return new Response('Not found', { status: 404 });

  const { data, error } = await admin.storage.from('avatars').download(path);
  if (error || !data) return new Response('Not found', { status: 404 });

  return new Response(await data.arrayBuffer(), {
    headers: {
      'content-type': data.type || 'image/jpeg',
      'cache-control': 'private, max-age=86400',
    },
  });
};
