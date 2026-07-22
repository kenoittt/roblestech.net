import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { audit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const name = String(form.get('name') ?? '').trim();
  const pax = Math.max(1, Number(form.get('pax') ?? 1) || 1);
  const base_currency = (String(form.get('base_currency') ?? 'USD').trim().toUpperCase() || 'USD').slice(0, 3);
  if (!name) return context.redirect('/trips?err=' + encodeURIComponent('Trip name is required.'));

  const { data, error } = await supabase.from('trips')
    .insert({ owner_id: user.id, name, pax, base_currency }).select('id').single();
  if (error || !data) return context.redirect('/trips?err=' + encodeURIComponent(error?.message ?? 'Could not create trip.'));
  await audit(user.id, 'trip.create', 'trips', { trip_id: (data as any).id });
  return context.redirect(`/trips/${(data as any).id}`);
};
