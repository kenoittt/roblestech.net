import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Travel checklist: add / toggle / delete. RLS gates to trip editors.
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const form = await context.request.formData();
  const tripId = String(form.get('trip_id') ?? '');
  const op = String(form.get('op') ?? 'add');
  const id = String(form.get('id') ?? '');
  const back = `/trips/${tripId}#checklist`;
  if (!tripId) return context.redirect('/trips');

  if (op === 'toggle' && id) {
    const done = String(form.get('done') ?? '') === '1';
    await supabase.from('trip_checklist').update({ done }).eq('id', id);
    return context.redirect(back);
  }
  if (op === 'delete' && id) {
    await supabase.from('trip_checklist').delete().eq('id', id);
    return context.redirect(back);
  }
  const item = String(form.get('item') ?? '').trim().slice(0, 200);
  if (!item) return context.redirect(back);
  const { error } = await supabase.from('trip_checklist').insert({ trip_id: tripId, item });
  return context.redirect(back + (error ? '&err=' + encodeURIComponent(error.message) : ''));
};
