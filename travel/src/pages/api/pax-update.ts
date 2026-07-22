import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

const round2 = (n: number) => Math.round(n * 100) / 100;

// JSON pax update from the budget sheet: persist trip pax and recompute every
// expense row's derived side server-side so DB always matches the UI (FR-BDG-02).
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401 });

  let body: any;
  try { body = await context.request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 }); }
  const tripId = String(body.trip_id ?? '');
  const pax = Math.max(1, Number(body.pax) || 1);
  if (!tripId) return new Response(JSON.stringify({ error: 'missing trip' }), { status: 400 });

  const { error } = await supabase.from('trips').update({ pax }).eq('id', tripId);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  const { data: rowsData } = await supabase.from('expenses')
    .select('id,amount_group,amount_individual,entry_mode,pax_override').eq('trip_id', tripId);
  for (const r of (rowsData as any[]) ?? []) {
    const eff = Math.max(1, r.pax_override ?? pax);
    const patch = r.entry_mode === 'group'
      ? { amount_individual: round2(Number(r.amount_group) / eff) }
      : { amount_group: round2(Number(r.amount_individual) * eff) };
    await supabase.from('expenses').update(patch).eq('id', r.id);
  }
  return new Response(JSON.stringify({ ok: true }));
};
