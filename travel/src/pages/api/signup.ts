import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const display_name = String(form.get('display_name') ?? '').trim();
  if (!email || password.length < 8) {
    return context.redirect('/signup?error=' + encodeURIComponent('Email and a password of 8+ characters are required.'));
  }
  const supabase = createSupabaseServer(context);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name },
      // Confirmation email links back to THIS deployment (must also be in
      // Supabase Auth -> URL Configuration -> Redirect URLs).
      emailRedirectTo: `${context.url.origin}/login?confirmed=1`,
    },
  });
  if (error) return context.redirect('/signup?error=' + encodeURIComponent(error.message));
  await audit(data.user?.id ?? null, 'auth.signup', 'auth');
  // With email confirmation enabled there is no session yet.
  if (!data.session) return context.redirect('/signup?confirm=1');
  return context.redirect('/trips');
};
