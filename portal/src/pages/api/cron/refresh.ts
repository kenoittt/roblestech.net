import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../../lib/supabase';
import { fetchGscData } from '../../../lib/gsc';
import { pick } from '../../../lib/env';

export const prerender = false;

/*
 * Daily GSC refresh. Vercel Cron calls this once a day (see vercel.json).
 * For every client with a gsc_property set, it pulls fresh Search Console data
 * and stores it on the client row; the dashboard picks it up on next load.
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token; a manual test
 * call can pass ?key=).
 */
export const GET: APIRoute = async (context) => {
  const secret = pick('CRON_SECRET');
  const auth = context.request.headers.get('authorization') ?? '';
  const keyParam = context.url.searchParams.get('key') ?? '';
  if (!secret || (auth !== `Bearer ${secret}` && keyParam !== secret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const { data: clients, error } = await admin
    .from('clients')
    .select('id, name, gsc_property')
    .not('gsc_property', 'is', null);

  if (error) return new Response(`DB error: ${error.message}`, { status: 500 });

  const results: { client: string; ok: boolean; detail?: string }[] = [];
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

  return new Response(JSON.stringify({ ran: new Date().toISOString(), results }, null, 2), {
    headers: { 'content-type': 'application/json' },
  });
};
