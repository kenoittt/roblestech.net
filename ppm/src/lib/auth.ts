import type { APIContext } from 'astro';
import { createSupabaseServer } from './supabase';

/** Session user + profile inside an API endpoint. PPM access = admin or staff. */
export async function getSession(context: APIContext) {
  const supabase = createSupabaseServer(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single();
  return { user, profile: (profile as App.Locals['profile']) ?? null, supabase };
}

export const canUsePpm = (p: App.Locals['profile']) => p?.role === 'admin' || p?.role === 'staff';
