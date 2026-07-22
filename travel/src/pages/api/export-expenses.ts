import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// CSV export of a trip's expense table (FR-BDG-10). RLS-scoped.
export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');
  const tripId = context.url.searchParams.get('trip') ?? '';
  const { data: trip } = await supabase.from('trips').select('name,pax').eq('id', tripId).single();
  if (!trip) return new Response('Not found', { status: 404 });
  const { data: rows } = await supabase.from('expenses')
    .select('category,description,amount_group,amount_individual,entry_mode,pax_override,currency,is_actual,paid,notes')
    .eq('trip_id', tripId).order('position');
  const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const header = 'category,description,group_cost,individual_cost,entry_mode,pax_override,currency,is_actual,paid,notes';
  const lines = ((rows as any[]) ?? []).map((r) =>
    [r.category, r.description, r.amount_group, r.amount_individual, r.entry_mode, r.pax_override ?? '', r.currency, r.is_actual, r.paid, r.notes ?? ''].map(esc).join(','));
  const csv = [header, ...lines].join('\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${String((trip as any).name).replace(/[^\w-]+/g, '_')}_expenses.csv"`,
    },
  });
};
