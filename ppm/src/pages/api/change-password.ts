import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

/*
 * Change your own password. The new password travels in the POST body only —
 * never in the URL — and the redirect carries just a status message.
 */
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const to = (key: 'ok' | 'err', msg: string) =>
    context.redirect('/account?' + key + '=' + encodeURIComponent(msg));

  if (password.length < 8) return to('err', 'Password must be at least 8 characters.');
  if (password !== confirm) return to('err', "The passwords don't match.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return to('err', error.message);

  return to('ok', 'Password updated. Use it the next time you sign in.');
};
