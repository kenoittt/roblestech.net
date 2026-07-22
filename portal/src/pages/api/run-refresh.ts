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
  const form = await context.request.formData().catch(() => new FormData());
  const clientId = String(form.get('client_id') ?? '') || undefined; // omit = all clients
  const back = clientId ? '/admin/clients' : '/admin';
  try {
    const results = await runGscRefresh(clientId);
    if (!results.length) {
      return context.redirect(back + '?err=' + encodeURIComponent('No GSC property set for that client.'));
    }
    const okCount = results.filter((r) => r.ok).length;
    const fails = results.filter((r) => !r.ok).map((r) => `${r.client}: ${r.detail ?? 'failed'}`);
    const msg = `GSC refreshed for ${okCount}/${results.length} client(s).` + (fails.length ? ` Failed — ${fails.join('; ').slice(0, 300)}` : '');
    return context.redirect(back + (fails.length ? '?err=' : '?ok=') + encodeURIComponent(msg));
  } catch (e) {
    return context.redirect(back + '?err=' + encodeURIComponent('Refresh failed: ' + String(e)));
  }
};
