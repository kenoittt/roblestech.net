import { createSupabaseAdmin } from './supabase';
import { fetchGscData } from './gsc';

export type RefreshResult = { client: string; ok: boolean; detail?: string };

/** Pull fresh GSC data — for one client (pass their id) or all clients with a property set. */
export async function runGscRefresh(clientId?: string): Promise<RefreshResult[]> {
  const admin = createSupabaseAdmin();
  let query = admin
    .from('clients')
    .select('id, name, gsc_property')
    .not('gsc_property', 'is', null);
  if (clientId) query = query.eq('id', clientId);
  const { data: clients, error } = await query;
  if (error) throw new Error(error.message);

  const results: RefreshResult[] = [];
  for (const c of clients ?? []) {
    const row = c as { id: string; name: string; gsc_property: string };
    try {
      const gsc = await fetchGscData(row.gsc_property);
      const { error: upErr } = await admin
        .from('clients')
        .update({ gsc_data: gsc, gsc_updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (upErr) throw new Error(upErr.message);
      results.push({ client: row.name, ok: true });
    } catch (e) {
      results.push({ client: row.name, ok: false, detail: String(e) });
    }
  }
  return results;
}
