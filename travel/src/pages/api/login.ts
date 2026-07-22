import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return context.redirect('/login?error=1');
  const supabase = createSupabaseServer(context);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { await audit(null, 'auth.login_failed', 'auth', { email }); return context.redirect('/login?error=1'); }
  await audit(data.user?.id ?? null, 'auth.login', 'auth');
  return context.redirect('/trips');
};
