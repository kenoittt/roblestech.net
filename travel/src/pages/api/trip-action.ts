import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';

export const prerender = false;

// duplicate | delete (archive is a status change on trip-update)
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const op = String(form.get('op') ?? '');
  if (!id) return context.redirect('/trips');

  if (op === 'delete') {
    const { error } = await supabase.from('trips').delete().eq('id', id); // RLS: owner only
    if (error) return context.redirect(`/trips/${id}?err=` + encodeURIComponent(error.message));
    await audit(user.id, 'trip.delete', 'trips', { trip_id: id });
    return context.redirect('/trips?ok=' + encodeURIComponent('Trip deleted.'));
  }

  if (op === 'duplicate') {
    const { data: t } = await supabase.from('trips')
      .select('name,start_date,end_date,pax,base_currency').eq('id', id).single();
    if (!t) return context.redirect('/trips?err=' + encodeURIComponent('Trip not found.'));
    const { data: nt, error } = await supabase.from('trips')
      .insert({ owner_id: user.id, name: `${(t as any).name} (copy)`, start_date: (t as any).start_date, end_date: (t as any).end_date, pax: (t as any).pax, base_currency: (t as any).base_currency, status: 'planning' })
      .select('id').single();
    if (error || !nt) return context.redirect(`/trips/${id}?err=` + encodeURIComponent(error?.message ?? 'Duplicate failed.'));
    const newId = (nt as any).id;
    const copy = async (table: string, cols: string[]) => {
      const { data: rows } = await supabase.from(table).select(cols.join(',')).eq('trip_id', id);
      if (rows?.length) await supabase.from(table).insert((rows as any[]).map((r) => ({ ...r, trip_id: newId })));
    };
    await copy('trip_legs', ['destination_name', 'arrival_airport', 'departure_airport', 'start_date', 'end_date', 'position']);
    await copy('lodgings', ['name', 'address', 'lat', 'lng', 'check_in_at', 'check_out_at', 'cost', 'confirmation_ref', 'notes']);
    await copy('expenses', ['category', 'description', 'amount_group', 'amount_individual', 'entry_mode', 'pax_override', 'currency', 'is_actual', 'paid', 'notes', 'position']);
    await audit(user.id, 'trip.duplicate', 'trips', { from: id, to: newId });
    return context.redirect(`/trips/${newId}?ok=` + encodeURIComponent('Trip duplicated.'));
  }

  return context.redirect(`/trips/${id}`);
};
