import type { APIRoute } from 'astro';
import { getSession, canUsePpm } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

/** Turn task notification emails on or off for yourself (see lib/notify.ts). */
export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || !canUsePpm(profile)) return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  // Unchecked checkboxes aren't submitted at all, so absence means "off".
  const wantsEmail = String(form.get('emails') ?? '') === '1';

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from('profiles')
    .update({ email_opt_out: !wantsEmail })
    .eq('id', user.id);

  const msg = error
    ? ['err', error.message]
    : ['ok', wantsEmail ? 'Task emails are on.' : "Task emails are off — you won't be emailed about tasks."];
  return context.redirect('/account?' + msg[0] + '=' + encodeURIComponent(msg[1]));
};
