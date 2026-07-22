import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase';

// Public: landing, auth pages, and auth endpoints. Everything else needs a session.
const PUBLIC_PATHS = new Set<string>(['/', '/login', '/signup', '/api/login', '/api/signup', '/logout', '/api/oauth-google', '/api/auth-callback']);

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (path.startsWith('/_') || path.startsWith('/favicon') || path.startsWith('/manifest')) return next();

  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  context.locals.user = user ?? null;

  const isPublic = PUBLIC_PATHS.has(path) || path.startsWith('/explore');
  if (!user && !isPublic) return context.redirect('/login');
  if (user && (path === '/login' || path === '/signup')) return context.redirect('/trips');

  const response = await next();
  const h = response.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'SAMEORIGIN');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  h.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Leaflet/OSM tiles + auto-fetched place imagery come later; images stay https-only.
      "img-src 'self' https: data:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return response;
});
