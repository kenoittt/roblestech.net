import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');
  const form = await context.request.formData();
  const destination_id = String(form.get('destination_id') ?? '');
  const backRaw = String(form.get('back') ?? '');
  const back = backRaw.startsWith('/') && !backRaw.startsWith('//') ? backRaw : '/explore';
  if (!destination_id) return context.redirect(back);
  const { data: existing } = await supabase.from('wishlists').select('destination_id')
    .eq('destination_id', destination_id).eq('user_id', user.id).maybeSingle();
  if (existing) await supabase.from('wishlists').delete().eq('destination_id', destination_id).eq('user_id', user.id);
  else await supabase.from('wishlists').insert({ user_id: user.id, destination_id });
  return context.redirect(back);
};
