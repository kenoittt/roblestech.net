import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { APIContext, AstroCookies } from 'astro';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './env';

type CookieContext = { request: Request; cookies: AstroCookies };

/*
 * What this request has already written, keyed by the request itself.
 *
 * A single request builds more than one Supabase client: middleware makes one
 * to check the session, and the page makes another to run its queries. They
 * are separate clients, and the only thing they share is the request.
 *
 * That matters when the access token has expired. Middleware refreshes it and
 * writes the new session to the response cookies — but the incoming Cookie
 * header is fixed, so a second client reading only that header still sees the
 * old session and tries to refresh the same refresh token again. Supabase
 * rotates refresh tokens, so the second attempt is spending a token that has
 * already been spent: inside GoTrue's reuse window it is wasted work, outside
 * it the call fails with "Invalid Refresh Token: Already Used" and the request
 * reads as signed out. That is how a staff member who left a tab open for an
 * hour gets bounced to the login screen on their next click.
 *
 * So writes are recorded here and read back by any later client on the same
 * request. Keyed by a WeakMap on the Request, which means no shared state
 * between requests and nothing to clean up.
 */
const writtenCookies = new WeakMap<Request, Map<string, string>>();

export function createSupabaseServer(context: APIContext | CookieContext) {
  const req = context.request;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const merged = new Map<string, string>();
        for (const { name, value } of parseCookieHeader(req.headers.get('Cookie') ?? '')) {
          merged.set(name, value ?? '');
        }
        // Anything written earlier in this request wins over the header, and
        // an empty value means it was cleared, so it must not be handed back.
        for (const [name, value] of writtenCookies.get(req) ?? []) {
          if (value === '') merged.delete(name);
          else merged.set(name, value);
        }
        return [...merged].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        let seen = writtenCookies.get(req);
        if (!seen) writtenCookies.set(req, (seen = new Map()));

        cookiesToSet.forEach(({ name, value, options }) => {
          seen!.set(name, value);
          context.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: undefined,
            expires: undefined,
          });
        });
      },
    },
  });
}

/** Service-role client — SERVER ONLY, bypasses RLS. */
export function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
