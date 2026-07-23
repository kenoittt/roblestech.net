import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';
import { siteUrl } from '../../lib/site';
import { checkPassword } from '../../lib/password';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const display_name = String(form.get('display_name') ?? '').trim();
  const passport_country = String(form.get('passport_country') ?? '').trim();
  if (!email) return context.redirect('/signup?error=' + encodeURIComponent('Email is required.'));
  const strong = checkPassword(password, email);
  if (!strong.ok) return context.redirect('/signup?error=' + encodeURIComponent(strong.message!));
  const supabase = createSupabaseServer(context);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name, passport_country },
      // Confirmation email links back to the canonical site (must also be in
      // Supabase Auth -> URL Configuration -> Redirect URLs).
      emailRedirectTo: `${siteUrl(context)}/login?confirmed=1`,
    },
  });
  if (error) return context.redirect('/signup?error=' + encodeURIComponent(error.message));
  await audit(data.user?.id ?? null, 'auth.signup', 'auth');
  // With email confirmation enabled there is no session yet.
  if (!data.session) return context.redirect('/signup?confirm=1');
  return context.redirect('/trips');
};
