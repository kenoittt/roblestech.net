import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const tripId = String(form.get('trip_id') ?? '');
  const id = String(form.get('id') ?? '');
  const op = String(form.get('op') ?? 'save');
  const redirectRaw = String(form.get('redirect') ?? '');
  const back = redirectRaw.startsWith('/') && !redirectRaw.startsWith('//') ? redirectRaw : `/trips/${tripId}/itinerary`;
  if (!tripId) return context.redirect('/trips');

  if (op === 'delete' && id) {
    await supabase.from('itinerary_items').delete().eq('id', id);
    return context.redirect(back);
  }
  const row = {
    trip_id: tripId,
    place_name: String(form.get('place_name') ?? '').trim(),
    day: String(form.get('day') ?? '') || null,
    time: String(form.get('time') ?? '') || null,
    category: String(form.get('category') ?? 'activity'),
    notes: String(form.get('notes') ?? '').trim() || null,
    source: 'user',
  };
  if (!row.place_name) return context.redirect(back);
  if (id) await supabase.from('itinerary_items').update(row).eq('id', id);
  else await supabase.from('itinerary_items').insert(row);
  return context.redirect(back);
};
