import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

/* Geocode a typed place near the trip's destinations so it pins on the map
   (FR-MAP): Nominatim server-side, biased with the first leg's destination. */
async function geocode(place: string, hint: string | null): Promise<{ lat: number; lng: number } | null> {
  const q = hint ? `${place}, ${hint}` : place;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'WanderWise/0.1 (roblestech.net travel planner)' } }
    );
    const j: any = await res.json();
    if (Array.isArray(j) && j[0]) return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
    if (hint) return geocode(place, null); // retry without the bias
  } catch { /* map pin is best-effort */ }
  return null;
}

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
  const row: any = {
    trip_id: tripId,
    place_name: String(form.get('place_name') ?? '').trim(),
    day: String(form.get('day') ?? '') || null,
    time: String(form.get('time') ?? '') || null,
    category: String(form.get('category') ?? 'activity'),
    notes: String(form.get('notes') ?? '').trim() || null,
  };
  if (!row.place_name) return context.redirect(back);

  // Pin it: new items (or renamed ones) get coordinates so they show on the
  // map and in the day route immediately.
  const prevName = String(form.get('prev_name') ?? '');
  const needsGeo = !id || (prevName && prevName !== row.place_name);
  if (needsGeo) {
    const { data: leg } = await supabase.from('trip_legs')
      .select('destination_name').eq('trip_id', tripId).order('position').limit(1).maybeSingle();
    const geo = await geocode(row.place_name, (leg as any)?.destination_name ?? null);
    if (geo) { row.lat = geo.lat; row.lng = geo.lng; }
  }

  if (id) await supabase.from('itinerary_items').update(row).eq('id', id);
  else await supabase.from('itinerary_items').insert({ ...row, source: 'user' });
  return context.redirect(back);
};
