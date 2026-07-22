import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// "Continue with Google" — Supabase OAuth (PKCE). Requires the Google
// provider to be enabled in Supabase Auth with a Google OAuth client.
export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${context.url.origin}/api/auth-callback` },
  });
  if (error || !data?.url) {
    return context.redirect('/login?error=' + encodeURIComponent('Google sign-in is not enabled yet.'));
  }
  return context.redirect(data.url);
};
