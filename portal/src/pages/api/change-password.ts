import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Change the logged-in user's password. Values travel in the POST body only —
// never in the URL — and the response redirects without echoing them.
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const next = String(form.get('next') ?? '/account');
  // Only allow same-site relative redirect targets.
  const back = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  if (password.length < 8) return context.redirect(`${back}?err=short`);
  if (password !== confirm) return context.redirect(`${back}?err=mismatch`);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return context.redirect(`${back}?err=failed`);

  return context.redirect(`${back}?ok=1`);
};
