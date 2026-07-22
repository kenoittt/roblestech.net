import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';

export const prerender = false;

// OAuth return leg: exchange the ?code for a session cookie, then land on trips.
export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get('code');
  if (!code) return context.redirect('/login?error=' + encodeURIComponent('Sign-in was cancelled.'));
  const supabase = createSupabaseServer(context);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return context.redirect('/login?error=' + encodeURIComponent(error.message));
  await audit(data.user?.id ?? null, 'auth.oauth_login', 'auth', { provider: 'google' });
  return context.redirect('/trips');
};
