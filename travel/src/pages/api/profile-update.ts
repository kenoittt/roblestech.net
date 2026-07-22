import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { codeOf } from '../../lib/countries';
import { audit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const display_name = String(form.get('display_name') ?? '').trim();
  const passport_country = String(form.get('passport_country') ?? '').trim();
  if (passport_country && !codeOf(passport_country)) {
    return context.redirect('/account?err=' + encodeURIComponent('Pick a country from the list so visa checks can match it.'));
  }
  const { error } = await supabase.from('profiles')
    .update({ display_name: display_name || null, passport_country: passport_country || null })
    .eq('id', user.id);
  if (error) return context.redirect('/account?err=' + encodeURIComponent(error.message));
  await audit(user.id, 'profile.update', 'profiles');
  return context.redirect('/account?ok=' + encodeURIComponent('Profile saved.'));
};
