import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServer } from './lib/supabase';

// Routes reachable without a session.
const PUBLIC_PATHS = new Set<string>(['/login', '/api/login', '/logout']);

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

  return next();
});
