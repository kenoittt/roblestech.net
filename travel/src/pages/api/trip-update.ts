import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Save trip details. A pax change recalculates every expense row's derived
// side from its entry_mode (FR-BDG-02/05) under the caller's session (RLS).
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const back = `/trips/${id}`;
  const name = String(form.get('name') ?? '').trim();
  const pax = Math.max(1, Number(form.get('pax') ?? 1) || 1);
  const status = String(form.get('status') ?? 'planning');
  const base_currency = (String(form.get('base_currency') ?? 'USD').trim().toUpperCase() || 'USD').slice(0, 3);
  const start_date = String(form.get('start_date') ?? '') || null;
  const end_date = String(form.get('end_date') ?? '') || null;
  if (!id || !name) return context.redirect(back + '?err=' + encodeURIComponent('Name is required.'));

  const { data: before } = await supabase.from('trips').select('pax').eq('id', id).single();
  const { error } = await supabase.from('trips')
    .update({ name, pax, status, base_currency, start_date, end_date }).eq('id', id);
  if (error) return context.redirect(back + '?err=' + encodeURIComponent(error.message));

  if (before && (before as any).pax !== pax) {
    // Recalculate both derived sides in one statement; pax_override wins (FR-BDG-08).
    const { error: rpcErr } = await supabase.rpc('recalc_expenses', { t: id });
    if (rpcErr) {
      const { data: rows } = await supabase.from('expenses')
        .select('id,amount_group,amount_individual,entry_mode,pax_override').eq('trip_id', id);
      for (const r of (rows as any[]) ?? []) {
        const eff = Math.max(1, r.pax_override ?? pax);
        const patch = r.entry_mode === 'group'
          ? { amount_individual: Math.round((r.amount_group / eff) * 100) / 100 }
          : { amount_group: Math.round((r.amount_individual * eff) * 100) / 100 };
        await supabase.from('expenses').update(patch).eq('id', r.id);
      }
    }
  }
  return context.redirect(back + '?ok=' + encodeURIComponent('Trip saved.'));
};
