import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

/* Resolve a "<select> + Other…" pair to the airline name actually chosen. */
function resolveAirline(form: FormData, selName: string, otherName: string): string | null {
  const sel = String(form.get(selName) ?? '');
  const val = sel === '__other__' ? String(form.get(otherName) ?? '').trim() : sel.trim();
  return val || null;
}

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

  const hasConnection = String(form.get('has_connection') ?? '') === '1';
  const row: Record<string, unknown> = {
    trip_id: tripId,
    destination_name: String(form.get('destination_name') ?? '').trim(),
    airline: resolveAirline(form, 'airline_sel', 'airline_other'),
    flight_no: String(form.get('flight_no') ?? '').trim().toUpperCase().replace(/\s+/g, '') || null,
    has_connection: hasConnection,
    connection_airport: hasConnection ? (String(form.get('connection_airport') ?? '').trim().toUpperCase() || null) : null,
    connection_airline: hasConnection ? resolveAirline(form, 'connection_airline_sel', 'connection_airline_other') : null,
    connection_flight_no: hasConnection
      ? (String(form.get('connection_flight_no') ?? '').trim().toUpperCase().replace(/\s+/g, '') || null)
      : null,
    start_date: String(form.get('start_date') ?? '') || null,
    end_date: String(form.get('end_date') ?? '') || null,
  };
  if (!row.destination_name) return context.redirect(back + '?err=' + encodeURIComponent('Destination name required.'));
  const { error } = id
    ? await supabase.from('trip_legs').update(row).eq('id', id)
    : await supabase.from('trip_legs').insert(row);
  return context.redirect(back + (error ? '?err=' + encodeURIComponent(error.message) : ''));
};
