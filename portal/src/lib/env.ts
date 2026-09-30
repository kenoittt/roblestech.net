// Settings, read on the server at request time. getSecret() keeps values out
// of the build output; Astro 6 and later bake import.meta.env into the build.
// PUBLIC_* are safe for the browser; the service-role key must never leave
// the server.
import { getSecret } from 'astro:env/server';

export const pick = (key: string): string => getSecret(key) ?? '';

export const SUPABASE_URL = pick('PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = pick('PUBLIC_SUPABASE_ANON_KEY');
export const SUPABASE_SERVICE_ROLE_KEY = pick('SUPABASE_SERVICE_ROLE_KEY');
