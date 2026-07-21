import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../lib/supabase';
import templateHtml from '../templates/dashboard.html?raw';

export const prerender = false;

/*
 * Serves a client's living dashboard: the shared template with that client's
 * config + latest GSC data injected as window.__DASH__.
 *
 * Authorization: the client row is read under the caller's session, so RLS
 * only returns it if they own it. Admins may preview any client via ?client=.
 */
export const GET: APIRoute = async (context) => {
  const { user, profile } = context.locals;
  if (!user) return context.redirect('/login');

  const isAdmin = profile?.role === 'admin';
  const targetId = isAdmin
    ? context.url.searchParams.get('client') ?? profile?.client_id ?? null
    : profile?.client_id ?? null;

  if (!targetId) return new Response('No client dashboard is linked to this account yet.', { status: 404 });

  const supabase = createSupabaseServer(context);
  const { data: client, error } = await supabase
    .from('clients')
    .select('name, config, gsc_data')
    .eq('id', targetId)
    .single();

  if (error || !client) return new Response('Dashboard not found', { status: 404 });

  const payload = {
    gsc: (client as { gsc_data: unknown }).gsc_data ?? {},
    config: (client as { config: unknown }).config ?? {},
  };
  // Escape "<" so the JSON string can't break out of the <script> tag.
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const inject =
    `<link rel="icon" type="image/png" href="/favicon.png">` +
    `<script>window.__DASH__ = JSON.parse(${JSON.stringify(json)});</script>`;

  const signout =
    '<a href="/logout" style="position:fixed;top:10px;right:14px;z-index:99999;' +
    'font:600 12px system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.45);' +
    'padding:6px 12px;border-radius:999px;text-decoration:none;backdrop-filter:blur(6px);">Sign out</a>';

  const html = templateHtml
    .replace('</head>', `${inject}\n</head>`)
    .replace('</body>', `${signout}\n</body>`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
