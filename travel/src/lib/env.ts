// Env access working in dev (import.meta.env) and on Vercel (process.env).
export const pick = (key: string): string =>
  (import.meta.env as Record<string, string | undefined>)[key] ??
  (typeof process !== 'undefined' ? process.env[key] : undefined) ??
  '';

export const SUPABASE_URL = pick('PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = pick('PUBLIC_SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = pick('SUPABASE_SERVICE_ROLE_KEY');
