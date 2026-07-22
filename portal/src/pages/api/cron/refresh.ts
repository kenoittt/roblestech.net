import type { APIRoute } from 'astro';
import { runGscRefresh } from '../../../lib/refresh';
import { pick } from '../../../lib/env';

export const prerender = false;

/*
 * Daily GSC refresh. Vercel Cron calls this with "Authorization: Bearer
 * CRON_SECRET". Secrets are never accepted via query string (they would land
 * in logs and browser history) — for a manual run use the "Refresh GSC now"
 * button in the admin panel instead.
 */
export const GET: APIRoute = async (context) => {
  const secret = pick('CRON_SECRET');
  const auth = context.request.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const results = await runGscRefresh();
    return new Response(JSON.stringify({ ran: new Date().toISOString(), results }, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(`Refresh failed: ${String(e)}`, { status: 500 });
  }
};
