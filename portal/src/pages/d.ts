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

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const targetId = isAdmin
    ? context.url.searchParams.get('client') ?? profile?.client_id ?? null
    : profile?.client_id ?? null;

  if (!targetId) {
    // Admins/super admins: send them to the client list to pick one.
    // A client with no linked company: the friendly "not set up" screen.
    return context.redirect(isAdmin ? '/admin/clients' : '/dashboard');
  }

  const supabase = createSupabaseServer(context);
  const { data: client, error } = await supabase
    .from('clients')
    .select('name, config, gsc_data, gsc_property')
    .eq('id', targetId)
    .single();

  if (error || !client) return new Response('Dashboard not found', { status: 404 });

  // Monthly AI-audit reports for this client (RLS-scoped read).
  const { data: audits } = await supabase
    .from('reports')
    .select('id, title, period')
    .eq('client_id', targetId)
    .order('period', { ascending: false });

  const name = (client as { name: string }).name;
  const rawCfg = ((client as any).config && typeof (client as any).config === 'object') ? { ...(client as any).config } : {};
  const rawGsc = ((client as any).gsc_data && typeof (client as any).gsc_data === 'object') ? (client as any).gsc_data : {};

  // Sanitize: drop empty objects/arrays (accidental saves of the old sample
  // config) and placeholder hero text, so real fallbacks/defaults apply.
  for (const k of Object.keys(rawCfg)) {
    const v = rawCfg[k];
    if (v && typeof v === 'object' && Object.keys(v).length === 0) delete rawCfg[k];
    if (Array.isArray(v) && v.length === 0) delete rawCfg[k];
  }
  if (rawCfg.hero) {
    for (const k of Object.keys(rawCfg.hero)) {
      if (String(rawCfg.hero[k]).includes('Client Name')) delete rawCfg.hero[k];
    }
    if (Object.keys(rawCfg.hero).length === 0) delete rawCfg.hero;
  }

  // The template's baked-in rich content belongs to Promix. Every other client
  // gets neutral defaults so no Promix data or narrative ever leaks through.
  const isPromix = /promix/i.test(name);
  const domain = String((client as any).gsc_property ?? '')
    .replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '') || name;

  const neutral = {
    clientName: name,
    propertyLabel: domain,
    hero: {
      eyebrow: `${name} · SEO + GEO`,
      title: 'Post Performance & GEO Dashboard',
      docTitle: `${name} · Post Performance & GEO Dashboard`,
      subtitle: `Live visibility for ${domain}. GSC data refreshes daily and lags ~2-3 days; new posts read zero for a while, that's normal.`,
    },
    baseline: { window: '', serviceStart: '—', captured: '—', clicks: 0, impr: 0, ctr: '—', avgPos: '—', postsLive: 0, aiText: '—', aiSub: '', pages: [] },
    aiAudit: { round: '', tested: '', totalChecks: 0, visibleChecks: 0, rate: '0%', note: '', intentNote: '', method: '', scorecard: [], intent: [], change: [], wins: [], groups: [] },
    pipeline: [],
    openItems: [],
  };

  const config = isPromix
    ? { clientName: name, propertyLabel: 'promixnutrition.com', ...rawCfg }
    : {
        ...neutral,
        ...rawCfg,
        hero: { ...neutral.hero, ...(rawCfg.hero ?? {}) },
        baseline: { ...neutral.baseline, ...(rawCfg.baseline ?? {}) },
        aiAudit: { ...neutral.aiAudit, ...(rawCfg.aiAudit ?? {}) },
      };

  // Seed GSC with empty (truthy) structures so the template's Promix sample
  // numbers never render for a client that has no pull yet.
  const gsc = {
    dailyLog: [], byPage: [], siteTotal: { clicks: 0, impr: 0 },
    preLogBaseline: { month: '', c: 0, i: 0 }, pullDate: '', pullRange: '',
    ...rawGsc,
  };

  const payload = { gsc, config, audits: audits ?? [] };
  // Escape "<" so the JSON string can't break out of the <script> tag.
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  // Floating glass "island" nav injected into the standalone dashboard,
  // matching the portal's dark-glass nav. Self-contained styles so it doesn't
  // depend on the dashboard's own CSS; pushes the hero down so it isn't covered.
  const navStyle =
    `<style>
    .rtc-pnav{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;
      display:flex;align-items:center;justify-content:space-between;gap:20px;
      width:calc(100% - 32px);max-width:1180px;height:60px;padding:0 20px;border-radius:16px;
      background:rgba(18,20,32,0.42);backdrop-filter:blur(22px) saturate(180%);
      -webkit-backdrop-filter:blur(22px) saturate(180%);
      border:1px solid rgba(255,255,255,0.20);box-shadow:0 10px 34px rgba(0,0,0,0.30);
      font-family:'Montserrat',system-ui,-apple-system,sans-serif;}
    .rtc-pnav .b{display:flex;align-items:center;gap:9px;font-weight:800;font-size:1rem;
      color:#fff;text-decoration:none;letter-spacing:-.01em;}
    .rtc-pnav .b img{height:28px;width:auto;display:block;}
    .rtc-pnav .b i{font-style:normal;color:#3992ff;}
    .rtc-pnav form{margin:0;}
    .rtc-pnav .out{font-family:inherit;font-weight:700;font-size:.85rem;cursor:pointer;
      color:#0a0f1f;background:#aee37b;border:0;padding:8px 16px;border-radius:9px;}
    .rtc-pnav .out:hover{filter:brightness(1.05);}
    /* Float over the hero gradient; push the hero's own content clear of the nav. */
    .hero{padding-top:104px !important;}
    @media(max-width:560px){.rtc-pnav{top:10px;width:calc(100% - 20px);height:54px;padding:0 14px;}
      .rtc-pnav .b i{display:none;} .rtc-pnav .b img{height:24px;} .hero{padding-top:92px !important;}}
    </style>`;
  const inject =
    `<link rel="icon" type="image/png" href="/favicon.png">` +
    navStyle +
    `<script>window.__DASH__ = JSON.parse(${JSON.stringify(json)});</script>`;

  const navBar =
    `<nav class="rtc-pnav">` +
    `<a class="b" href="/dashboard"><img src="/logo-white.png" alt="">Robles <i>Tech</i></a>` +
    `<span style="display:flex;align-items:center;gap:16px;">` +
    `<a href="/account" style="color:rgba(255,255,255,.85);font-weight:600;font-size:.85rem;text-decoration:none;">Account</a>` +
    `<form method="post" action="/logout"><button class="out" type="submit">Sign out</button></form>` +
    `</span></nav>`;

  const html = templateHtml
    .replace('</head>', `${inject}\n</head>`)
    .replace(/<body([^>]*)>/, `<body$1>\n${navBar}`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
