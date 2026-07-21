import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase';

// Routes reachable without a session.
// The cron endpoint has no session; it authenticates with CRON_SECRET itself.
const PUBLIC_PATHS = new Set<string>(['/login', '/api/login', '/logout', '/api/cron/refresh']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  const path = url.pathname;

  // Static assets and Astro internals: let them through untouched.
  if (path.startsWith('/_') || path.startsWith('/favicon')) {
    return next();
  }

  const supabase = createSupabaseServer(context);
  // getUser() re-validates the token against Supabase — do not trust getSession() alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.user = user ?? null;
  context.locals.profile = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, client_id, role, full_name')
      .eq('id', user.id)
      .single();
    context.locals.profile = (profile as App.Locals['profile']) ?? null;
  }

  const isPublic = PUBLIC_PATHS.has(path);

  // Not signed in → only public routes allowed.
  if (!user && !isPublic) {
    return context.redirect('/login');
  }

  // Signed in and hitting the login page → send to the right home.
  if (user && path === '/login') {
    return context.redirect('/dashboard');
  }

  // Admin area is admin-only.
  if (path.startsWith('/admin') && context.locals.profile?.role !== 'admin') {
    return context.redirect('/dashboard');
  }

  const response = await next();
  applySecurityHeaders(response.headers);
  return response;
});

/** Baseline hardening headers applied to every response. */
function applySecurityHeaders(h: Headers) {
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'SAMEORIGIN'); // block clickjacking / external framing
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains'); // force HTTPS
  // Restrict where resources can load from. Dashboards are first-party and use
  // inline scripts/styles (Chart.js, Google Fonts), so those are allowed; but
  // no external script/connect origins, which blocks injected data exfiltration.
  h.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
}
