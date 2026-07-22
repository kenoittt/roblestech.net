import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

const CATS = new Set(['flights', 'lodging', 'food', 'activities', 'transport', 'misc']);
const round2 = (n: number) => Math.round(n * 100) / 100;

/*
 * JSON endpoint for the budget sheet island (create/update/delete one row).
 * The server is the source of truth for the pax math: it recomputes the
 * derived side from entry_mode so client and DB can never drift (FR-BDG-03/04/05).
 * Runs under the caller's session — RLS enforces trip membership.
 */
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401 });

  let body: any;
  try { body = await context.request.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 }); }
  const op = String(body.op ?? 'save');
  const tripId = String(body.trip_id ?? '');
  if (!tripId) return new Response(JSON.stringify({ error: 'missing trip' }), { status: 400 });

  if (op === 'delete') {
    const { error } = await supabase.from('expenses').delete().eq('id', String(body.id ?? ''));
    return new Response(JSON.stringify(error ? { error: error.message } : { ok: true }), { status: error ? 400 : 200 });
  }

  // Effective pax = row override or trip pax (FR-BDG-08).
  const { data: trip } = await supabase.from('trips').select('pax').eq('id', tripId).single();
  if (!trip) return new Response(JSON.stringify({ error: 'trip not found' }), { status: 404 });
  const paxOverride = body.pax_override != null && body.pax_override !== '' ? Math.max(1, Number(body.pax_override) || 1) : null;
  const eff = Math.max(1, paxOverride ?? (trip as any).pax);

  const entry_mode = body.entry_mode === 'individual' ? 'individual' : 'group';
  const amt = Math.max(0, Number(body.amount) || 0); // the value on the entered side
  const amount_group = entry_mode === 'group' ? round2(amt) : round2(amt * eff);
  const amount_individual = entry_mode === 'individual' ? round2(amt) : round2(amt / eff);

  const row = {
    trip_id: tripId,
    category: CATS.has(String(body.category)) ? String(body.category) : 'misc',
    description: String(body.description ?? '').slice(0, 300),
    amount_group,
    amount_individual,
    entry_mode,
    pax_override: paxOverride,
    currency: (String(body.currency ?? 'USD').trim().toUpperCase() || 'USD').slice(0, 3),
    is_actual: !!body.is_actual,
    paid: !!body.paid,
    notes: String(body.notes ?? '').slice(0, 500) || null,
  };

  if (body.id) {
    const { error } = await supabase.from('expenses').update(row).eq('id', String(body.id));
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    return new Response(JSON.stringify({ ok: true, id: body.id, amount_group, amount_individual }));
  }
  const { data, error } = await supabase.from('expenses').insert(row).select('id').single();
  if (error || !data) return new Response(JSON.stringify({ error: error?.message ?? 'insert failed' }), { status: 400 });
  return new Response(JSON.stringify({ ok: true, id: (data as any).id, amount_group, amount_individual }));
};
