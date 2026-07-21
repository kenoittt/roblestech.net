// Env access that works both in local dev (import.meta.env from .env) and at
// runtime on Vercel (process.env). PUBLIC_* are safe for the browser; the
// service-role key must never leave the server.
const pick = (key: string): string =>
  (import.meta.env as Record<string, string | undefined>)[key] ??
  (typeof process !== 'undefined' ? process.env[key] : undefined) ??
  '';

export const SUPABASE_URL = pick('PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = pick('PUBLIC_SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = pick('SUPABASE_SERVICE_ROLE_KEY');
