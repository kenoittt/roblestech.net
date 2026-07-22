import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const form = await context.request.formData();
  const tripId = String(form.get('trip_id') ?? '');
  const id = String(form.get('id') ?? '');
  const op = String(form.get('op') ?? 'save');
  const back = `/trips/${tripId}`;
  if (!tripId) return context.redirect('/trips');

  if (op === 'delete' && id) {
    const { error } = await supabase.from('trip_legs').delete().eq('id', id);
    return context.redirect(back + (error ? '?err=' + encodeURIComponent(error.message) : ''));
  }
  const row = {
    trip_id: tripId,
    destination_name: String(form.get('destination_name') ?? '').trim(),
    arrival_airport: String(form.get('arrival_airport') ?? '').trim().toUpperCase() || null,
    departure_airport: String(form.get('departure_airport') ?? '').trim().toUpperCase() || null,
    airline: String(form.get('airline') ?? '').trim() || null,
    flight_no: String(form.get('flight_no') ?? '').trim().toUpperCase().replace(/\s+/g, '') || null,
    start_date: String(form.get('start_date') ?? '') || null,
    end_date: String(form.get('end_date') ?? '') || null,
  };
  if (!row.destination_name) return context.redirect(back + '?err=' + encodeURIComponent('Destination name required.'));
  const { error } = id
    ? await supabase.from('trip_legs').update(row).eq('id', id)
    : await supabase.from('trip_legs').insert(row);
  return context.redirect(back + (error ? '?err=' + encodeURIComponent(error.message) : ''));
};
