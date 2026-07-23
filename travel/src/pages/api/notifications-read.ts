import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Mark notifications read / clear them. RLS restricts to the caller's own.
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');
  const form = await context.request.formData();
  const op = String(form.get('op') ?? 'read-all');

  if (op === 'clear') {
    await supabase.from('notifications').delete().eq('user_id', user.id);
  } else if (op === 'read') {
    const id = String(form.get('id') ?? '');
    if (id) await supabase.from('notifications').update({ read: true }).eq('id', id);
  } else {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  }
  return context.redirect('/notifications');
};
