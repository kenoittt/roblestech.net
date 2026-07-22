import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { runGscRefresh } from '../../lib/refresh';

export const prerender = false;

// Manual GSC refresh from the admin panel (session-authenticated POST —
// replaces the old ?key= URL, which put the secret in logs/history).
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const results = await runGscRefresh();
    const okCount = results.filter((r) => r.ok).length;
    const fails = results.filter((r) => !r.ok).map((r) => `${r.client}: ${r.detail ?? 'failed'}`);
    const msg = `GSC refreshed for ${okCount}/${results.length} client(s).` + (fails.length ? ` Failed — ${fails.join('; ').slice(0, 300)}` : '');
    return context.redirect((fails.length ? '/admin?err=' : '/admin?ok=') + encodeURIComponent(msg));
  } catch (e) {
    return context.redirect('/admin?err=' + encodeURIComponent('Refresh failed: ' + String(e)));
  }
};
