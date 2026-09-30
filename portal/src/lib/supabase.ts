import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { APIContext, AstroCookies } from 'astro';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from './env';

type CookieContext = {
  request: Request;
  cookies: AstroCookies;
};

/*
 * What this request has already written, keyed by the request itself.
 *
 * A single request builds more than one Supabase client: middleware makes one
 * to check the session, and pages, API routes and the auth helper make more.
 * They are separate clients, and the only thing they share is the request.
 *
 * That matters when the access token has expired. The first client refreshes
 * it and writes the new session to the response cookies, but the incoming
 * Cookie header is fixed, so a later client reading only that header still
 * sees the old session and tries to refresh the same refresh token again.
 * Supabase rotates refresh tokens, so outside GoTrue's brief reuse window the
 * second attempt fails with "Invalid Refresh Token: Already Used" and the
 * request reads as signed out: a client who left the portal open for an hour
 * is sent back to the login page on their next click.
 *
 * So writes are recorded here and read back by any later client on the same
 * request. Keyed by a WeakMap on the Request, so there is no shared state
 * between requests and nothing to clean up. Same approach as the PPM
 * (ppm/src/lib/supabase.ts, commit c5b1881).
 */
const writtenCookies = new WeakMap<Request, Map<string, string>>();

/**
 * Per-request Supabase client bound to the session cookies. All reads through
 * this client run under the logged-in user, so Row-Level Security applies —
 * a client can only ever read their own rows.
 */
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
            httpOnly: true, // not readable by JS — blocks token theft via XSS
            secure: import.meta.env.PROD, // HTTPS-only in production
            sameSite: 'lax', // blocks cross-site request forgery
            path: '/',
            // Session cookie: no maxAge/expires, so it is cleared when the
            // browser/session ends — the user must sign in again next time.
            maxAge: undefined,
            expires: undefined,
          });
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
