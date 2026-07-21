import type { APIContext } from 'astro';
import { createSupabaseServer } from './supabase';

/**
 * Re-derive the session user + profile inside an API endpoint. Endpoints under
 * /api are guarded by middleware only for "logged in"; admin endpoints must
 * additionally call this and check role === 'admin'.
 */
export async function getSession(context: APIContext) {
  const supabase = createSupabaseServer(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, client_id, role, full_name')
    .eq('id', user.id)
    .single();

  return { user, profile: (profile as App.Locals['profile']) ?? null, supabase };
}
