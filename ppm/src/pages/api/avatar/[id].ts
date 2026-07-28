import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

/*
 * Streams a user's profile picture out of the private 'avatars' bucket.
 * Middleware already requires a PPM session to reach /api/*, so this is only
 * ever served to signed-in staff. The ?v= filename makes the URL change when
 * the photo does, which is why it can be cached hard.
 */
export const GET: APIRoute = async (context) => {
  const id = context.params.id ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });

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
