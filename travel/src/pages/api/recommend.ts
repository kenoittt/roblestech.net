import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { claudeJSON, aiConfigured } from '../../lib/claude';

export const prerender = false;

// Trip-aware AI recommendations (FR-AI-02): month/season/pax-fit places &
// activities for the trip's actual destinations and dates. Server-only key.
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401 });
  if (!aiConfigured()) return new Response(JSON.stringify({ error: 'AI is not configured yet.' }), { status: 200 });

  let body: any; try { body = await context.request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 }); }
  const tripId = String(body.trip_id ?? '');
  const { data: trip } = await supabase.from('trips').select('name,start_date,end_date,pax').eq('id', tripId).single();
  if (!trip) return new Response(JSON.stringify({ error: 'trip not found' }), { status: 404 });
  const { data: legs } = await supabase.from('trip_legs').select('destination_name,start_date,end_date').eq('trip_id', tripId);
  const { data: existing } = await supabase.from('trip_places').select('place_name').eq('trip_id', tripId);

  const ai = await claudeJSON<any>(
    'You are a sharp local travel curator. Recommend real, currently-operating places/activities. Prefer season- and date-appropriate picks; include a couple of lesser-known options. Never repeat places the traveler already saved.',
    `Trip: ${(trip as any).name}. Destinations: ${((legs as any[]) ?? []).map((l) => l.destination_name).join(', ') || 'unknown'}.
Dates: ${(trip as any).start_date ?? '?'} to ${(trip as any).end_date ?? '?'}. Group size: ${(trip as any).pax}.
Already saved (do not repeat): ${((existing as any[]) ?? []).map((p) => p.place_name).join(', ') || 'none'}.
Return JSON: {"suggestions":[{"name":"","category":"activity|food|sight|day-trip","why":"one sentence tied to their month/season/group","best_time":"e.g. weekday mornings / sunset"} x 6-8]}`
  );
  const suggestions = Array.isArray(ai?.suggestions) ? ai.suggestions.slice(0, 8) : [];
  return new Response(JSON.stringify({ suggestions }), { headers: { 'content-type': 'application/json' } });
};
