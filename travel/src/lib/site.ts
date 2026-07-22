import type { APIContext } from 'astro';

/*
 * Canonical site URL for auth redirects (email confirmation, OAuth return).
 * Prefers PUBLIC_SITE_URL (set in Vercel env) so redirects NEVER depend on
 * how the request reached us; falls back to the request origin for local dev.
 * NOTE: Supabase only follows redirects on its Auth allow-list — the Site URL
 * and Redirect URLs in Supabase Auth → URL Configuration must include this
 * domain or Supabase silently falls back to its own Site URL (the localhost
 * default is what causes "confirmation link goes to localhost").
 */
export const siteUrl = (context: APIContext | { url: URL }): string =>
  (import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || context.url.origin).replace(/\/+$/, '');
