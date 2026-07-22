import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');
  const form = await context.request.formData();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (password.length < 8) return context.redirect('/account?err=' + encodeURIComponent('Password must be 8+ characters.'));
  if (password !== confirm) return context.redirect('/account?err=' + encodeURIComponent("Passwords don't match."));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return context.redirect('/account?err=' + encodeURIComponent(error.message));
  await audit(user.id, 'auth.password_changed', 'auth');
  return context.redirect('/account?ok=1');
};
