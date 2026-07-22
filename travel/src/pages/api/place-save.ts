import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Places to Visit CRUD + promote-to-itinerary (FR-TRP-03a). JSON or form.
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401 });

  let body: any;
  const ctype = context.request.headers.get('content-type') ?? '';
  if (ctype.includes('json')) {
    try { body = await context.request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 }); }
  } else {
    const form = await context.request.formData();
    body = Object.fromEntries(form.entries());
  }
  const op = String(body.op ?? 'add');
  const tripId = String(body.trip_id ?? '');
  const redirect = String(body.redirect ?? '');
  const done = (payload: object, status = 200) =>
    redirect.startsWith('/') && !redirect.startsWith('//')
      ? context.redirect(redirect)
      : new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
  if (!tripId) return done({ error: 'missing trip' }, 400);

  if (op === 'delete') {
    await supabase.from('trip_places').delete().eq('id', String(body.id ?? ''));
    return done({ ok: true });
  }
  if (op === 'promote') {
    const { data: p } = await supabase.from('trip_places').select('*').eq('id', String(body.id ?? '')).single();
    if (!p) return done({ error: 'not found' }, 404);
    await supabase.from('itinerary_items').insert({
      trip_id: tripId, place_name: (p as any).place_name, lat: (p as any).lat, lng: (p as any).lng,
      day: String(body.day ?? '') || null, time: String(body.time ?? '') || null,
      category: 'activity', notes: (p as any).notes, source: 'user',
    });
    await supabase.from('trip_places').update({ status: 'scheduled' }).eq('id', (p as any).id);
    return done({ ok: true });
  }
  const place_name = String(body.place_name ?? '').trim();
  if (!place_name) return done({ error: 'name required' }, 400);
  const { data, error } = await supabase.from('trip_places').insert({
    trip_id: tripId, place_name,
    lat: body.lat != null && body.lat !== '' ? Number(body.lat) : null,
    lng: body.lng != null && body.lng !== '' ? Number(body.lng) : null,
    notes: String(body.notes ?? '') || null,
  }).select('id').single();
  if (error) return done({ error: error.message }, 400);
  return done({ ok: true, id: (data as any).id });
};
