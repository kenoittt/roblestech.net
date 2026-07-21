import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return context.redirect('/login?error=1');
  const supabase = createSupabaseServer(context);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return context.redirect('/login?error=1');
  return context.redirect('/');
};
