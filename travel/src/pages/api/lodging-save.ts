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
    const { error } = await supabase.from('lodgings').delete().eq('id', id);
    return context.redirect(back + (error ? '?err=' + encodeURIComponent(error.message) : ''));
  }
  const dt = (v: FormDataEntryValue | null) => { const s = String(v ?? '').trim(); return s ? new Date(s).toISOString() : null; };
  const row = {
    trip_id: tripId,
    name: String(form.get('name') ?? '').trim(),
    address: String(form.get('address') ?? '').trim() || null,
    check_in_at: dt(form.get('check_in_at')),
    check_out_at: dt(form.get('check_out_at')),
    confirmation_ref: String(form.get('confirmation_ref') ?? '').trim() || null,
  };
  if (!row.name) return context.redirect(back + '?err=' + encodeURIComponent('Lodging name required.'));
  const { error } = id
    ? await supabase.from('lodgings').update(row).eq('id', id)
    : await supabase.from('lodgings').insert(row);
  return context.redirect(back + (error ? '?err=' + encodeURIComponent(error.message) : ''));
};
