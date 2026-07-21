import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase';

const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/api/login',
  '/logout',
  '/api/cron/due-reminders',
  '/api/email-test',
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (path.startsWith('/_') || path.startsWith('/favicon')) return next();

  const supabase = createSupabaseServer(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.user = user ?? null;
  context.locals.profile = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single();
    context.locals.profile = (profile as App.Locals['profile']) ?? null;
  }

  const isPublic = PUBLIC_PATHS.has(path);
  const isPpmUser = context.locals.profile?.role === 'admin' || context.locals.profile?.role === 'staff';

  if (!user && !isPublic) return context.redirect('/login');
  if (user && path === '/login') return context.redirect('/');
  // Logged in but not a PPM user (e.g. a client account) — deny app access.
  if (user && !isPublic && !isPpmUser) return context.redirect('/login?denied=1');
  // Admin-only areas.
  if (path.startsWith('/admin') && context.locals.profile?.role !== 'admin') {
    return context.redirect('/');
  }

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
  return response;
});
