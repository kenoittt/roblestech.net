import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { APIContext, AstroCookies } from 'astro';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './env';

type CookieContext = {
  request: Request;
  cookies: AstroCookies;
};

/**
 * Per-request Supabase client bound to the session cookies. All reads through
 * this client run under the logged-in user, so Row-Level Security applies —
 * a client can only ever read their own rows.
 */
export function createSupabaseServer(context: APIContext | CookieContext) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('Cookie') ?? '').map(
          ({ name, value }) => ({ name, value: value ?? '' })
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Service-role client. Bypasses RLS — SERVER ONLY. Use exclusively for:
 *   - admin actions (creating client accounts), and
 *   - streaming a private report file AFTER the request's session has been
 *     verified to own that report.
 * Never import this into anything that reaches the browser.
 */
export function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
