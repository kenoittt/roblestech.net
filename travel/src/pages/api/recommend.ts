import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { PACKS } from '../../lib/dest-content';

export const prerender = false;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/*
 * Trip-aware suggestions (FR-AI-02) from curated packs — no paid API.
 * Matches the trip's destinations to knowledge packs, layers in this month's
 * festivals + best-time note, and skips places already saved to the trip.
 */
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401 });

  let body: any; try { body = await context.request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 }); }
  const tripId = String(body.trip_id ?? '');
  const { data: trip } = await supabase.from('trips').select('name,start_date,end_date,pax').eq('id', tripId).single();
  if (!trip) return new Response(JSON.stringify({ error: 'trip not found' }), { status: 404 });
  const { data: legs } = await supabase.from('trip_legs').select('destination_name,start_date,end_date').eq('trip_id', tripId);
  const { data: existing } = await supabase.from('trip_places').select('place_name').eq('trip_id', tripId);

  const saved = new Set(((existing as any[]) ?? []).map((p) => String(p.place_name).trim().toLowerCase()));
  const month = ((trip as any).start_date ? new Date((trip as any).start_date + 'T00:00:00Z').getUTCMonth() : new Date().getUTCMonth()) + 1;

  // Fuzzy-match each leg to a curated pack ("Hong Kong, HK" still hits 'Hong Kong').
  const norm = (s: string) => s.trim().toLowerCase();
  const packNames = Object.keys(PACKS);
  const matched = new Map<string, (typeof PACKS)[string]>();
  for (const leg of (legs as any[]) ?? []) {
    const ln = norm(leg.destination_name ?? '');
    if (!ln) continue;
    const hit = packNames.find((n) => { const pn = norm(n); return pn === ln || ln.includes(pn) || pn.includes(ln); });
    if (hit) matched.set(hit, PACKS[hit]);
  }
  if (matched.size === 0) {
    return new Response(JSON.stringify({
      suggestions: [],
      error: 'No matches for your destinations yet — suggestions cover our Explore destinations (Vietnam, Taiwan, Hong Kong, Central Asia).',
    }), { headers: { 'content-type': 'application/json' } });
  }

  type Sug = { name: string; category: string; why: string; best_time: string };
  const suggestions: Sug[] = [];
  const push = (name: string, category: string, why: string, best_time: string) => {
    if (saved.has(norm(name)) || suggestions.some((s) => norm(s.name) === norm(name))) return;
    suggestions.push({ name, category, why, best_time });
  };

  const many = matched.size > 1;
  for (const [destName, pack] of matched) {
    const tag = many ? ` (${destName})` : '';
    for (const f of pack.festivals[month] ?? []) push(f.name, 'activity', `${f.note}${tag}`, f.timing);
    for (const t of pack.top.slice(0, many ? 3 : 4)) push(t.name, 'sight', `${t.why}${tag}`, '');
    for (const g of pack.gems.slice(0, many ? 2 : 3)) push(g.name, 'day-trip', `Hidden gem — ${g.why}${tag}`, 'quieter on weekdays');
    if (!pack.best_months.includes(MONTHS[month - 1]) && suggestions.length) {
      const first = suggestions[0];
      if (!first.why.includes('Heads-up')) first.why += ` · Heads-up: ${pack.best_months.slice(0, 2).join('/')} is ${destName}'s sweet spot.`;
    }
  }

  return new Response(JSON.stringify({ suggestions: suggestions.slice(0, 10) }), { headers: { 'content-type': 'application/json' } });
};
