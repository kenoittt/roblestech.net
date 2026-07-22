import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Send a password-recovery email. Always reports success so the endpoint
// can't be used to probe which emails have accounts.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim();
  if (email) {
    const supabase = createSupabaseServer(context);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${context.url.origin}/reset`,
    });
  }
  return context.redirect('/forgot?sent=1');
};
