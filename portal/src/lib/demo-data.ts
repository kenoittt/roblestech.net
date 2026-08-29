/*
 * Sample dashboard data for the prospect-facing demo at /demo.
 *
 * EVERY NUMBER HERE IS INVENTED. It belongs to "Northwind Supply Co.", a company
 * that does not exist, and it is generated so a prospect can see the shape of
 * the dashboard before they have any data of their own. It must never be shown
 * as a real client's results, which is why the demo route stamps a persistent
 * "sample data" banner across the page and the client name is obviously
 * fictional.
 *
 * The figures are deliberately modest and internally consistent — a believable
 * first quarter, not a highlight reel. Overstating what the dashboard shows
 * would set an expectation the real thing has to meet.
 */

const DAY = 86400000;

/** Sample GSC series: ~120 days with a gentle upward trend and weekly seasonality. */
function buildDailyLog(endISO: string, days: number) {
  const end = new Date(endISO + 'T00:00:00Z').getTime();
  const rows: { d: string; c: number; i: number }[] = [];
  for (let k = 0; k < days; k++) {
    const t = end - k * DAY;
    const d = new Date(t);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    const age = days - k;                                   // 1 = oldest
    // Slow growth from ~330 to ~700 impressions/day across the window.
    const base = 330 + (age / days) * 370;
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    // A fixed wobble rather than Math.random, so the demo looks identical on
    // every visit — a chart that changes shape mid-pitch is a distraction.
    const wobble = 1 + Math.sin(age / 3.1) * 0.08 + Math.cos(age / 7.7) * 0.05;
    const impr = Math.round(base * weekend * wobble);
    const ctr = 0.031 + Math.sin(age / 11) * 0.004;          // ~2.7%–3.5%
    rows.push({ d: iso, c: Math.max(2, Math.round(impr * ctr)), i: impr });
  }
  return rows;                                               // newest first
}

const END = '2026-08-25';
const dailyLog = buildDailyLog(END, 120);
const last28 = dailyLog.slice(0, 28);
const sum = (rs: typeof dailyLog, k: 'c' | 'i') => rs.reduce((a, r) => a + r[k], 0);

const POSTS = [
  { url: '/blog/choosing-industrial-fasteners', title: 'How to Choose Industrial Fasteners for Outdoor Use', published: '2026-06-04', num: 'M1-1' },
  { url: '/blog/stainless-vs-galvanised', title: 'Stainless vs Galvanised: Which Lasts Longer Outdoors?', published: '2026-06-18', num: 'M1-2' },
  { url: '/blog/bulk-ordering-guide', title: 'A Buyer’s Guide to Bulk Ordering Without Overstocking', published: '2026-07-02', num: 'M2-1' },
  { url: '/blog/lead-times-explained', title: 'Why Supplier Lead Times Slip, and How to Plan Around It', published: '2026-07-21', num: 'M2-2' },
  { url: '/blog/iso-certification-checklist', title: 'The ISO Certification Checklist for Component Suppliers', published: '2026-08-06', num: 'M3-1' },
];

/** Per-post series, newer posts naturally holding less history. */
function postSeries(url: string, publishedISO: string, peak: number) {
  const start = new Date(publishedISO + 'T00:00:00Z').getTime();
  const end = new Date(END + 'T00:00:00Z').getTime();
  const daily: { d: string; c: number; i: number; p: number }[] = [];
  const span = Math.max(1, Math.round((end - start) / DAY));
  for (let k = 0; k <= span; k++) {
    const t = end - k * DAY;
    const age = span - k;
    // Ramps over the first ~30 days, as a new post actually does.
    const ramp = Math.min(1, age / 30);
    const i = Math.round(peak * ramp * (1 + Math.sin(age / 4.3) * 0.12));
    if (i <= 0) continue;
    daily.push({
      d: new Date(t).toISOString().slice(0, 10),
      c: Math.max(0, Math.round(i * 0.035)),
      i,
      p: Math.round((26 - ramp * 12) * 10) / 10,             // position improves as it ages
    });
  }
  const cur = daily.filter((r) => r.d >= dailyLog[27].d);
  const prev = daily.filter((r) => r.d < dailyLog[27].d && r.d >= dailyLog[55]?.d);
  const s = (rs: typeof daily, k: 'c' | 'i') => rs.reduce((a, r) => a + r[k], 0);
  const wI = s(cur, 'i');
  return {
    url,
    daily,
    totals: {
      clicks: s(cur, 'c'),
      impr: wI,
      ctr: wI > 0 ? Math.round((s(cur, 'c') / wI) * 1000) / 10 : 0,
      pos: wI > 0 ? Math.round((cur.reduce((a, r) => a + r.p * r.i, 0) / wI) * 10) / 10 : 0,
    },
    prev: { clicks: s(prev, 'c'), impr: s(prev, 'i') },
    first: daily.length ? daily[daily.length - 1].d : null,
  };
}

const peaks = [58, 46, 39, 27, 14];

export const DEMO_GSC = {
  dailyLog,
  byPage: [
    { page: 'https://northwind-supply.example/blog/choosing-industrial-fasteners', clicks: 61, impr: 1620 },
    { page: 'https://northwind-supply.example/blog/stainless-vs-galvanised', clicks: 48, impr: 1290 },
    { page: 'https://northwind-supply.example/products/fasteners', clicks: 44, impr: 2110 },
    { page: 'https://northwind-supply.example/blog/bulk-ordering-guide', clicks: 33, impr: 980 },
    { page: 'https://northwind-supply.example/', clicks: 29, impr: 1740 },
    { page: 'https://northwind-supply.example/blog/lead-times-explained', clicks: 18, impr: 610 },
  ],
  siteTotal: { clicks: sum(last28, 'c'), impr: sum(last28, 'i'), pos: 14.2 },
  preLogBaseline: { month: '', c: 0, i: 0 },
  pullDate: '2026-08-27',
  pullRange: `${last28[27].d} to ${END} (last 28 days)`,
  posts: POSTS.map((p, i) => postSeries(p.url, p.published, peaks[i])),
  postsRange: `2026-02-26 to ${END} (5 tracked posts)`,
};

export const DEMO_CONFIG = {
  clientName: 'Northwind Supply Co. (sample)',
  propertyLabel: 'northwind-supply.example',
  hero: {
    eyebrow: 'Sample dashboard · not a real client',
    title: 'Post Performance & GEO Dashboard',
    docTitle: 'Sample dashboard · Robles Tech',
    subtitle:
      'This is a demonstration using invented data for a company that does not exist. It shows the shape of the dashboard RTC builds for each client: Search Console performance, per-post tracking, the post-publish checklist, and monthly AI visibility.',
  },
  baseline: {
    window: 'March 1 - 31, 2026',
    serviceStart: 'June 1, 2026',
    captured: '2026-05-28',
    clicks: 412,
    impr: 9840,
    ctr: '4.2%',
    avgPos: '18.6',
    postsLive: 0,
    aiText: '1 / 40',
    aiSub: 'Baseline audit, 10 Qs x 4 engines (2.5%)',
    pages: [
      { page: '/products/fasteners', clicks: 96, impr: 2410 },
      { page: '/', clicks: 74, impr: 3120 },
      { page: '/products/brackets', clicks: 41, impr: 1180 },
    ],
  },
  pipeline: POSTS.map((p, i) => ({
    num: p.num,
    post: p.title,
    status: 'Live',
    published: p.published,
    url: p.url,
    sop: Array(7).fill(i === POSTS.length - 1 ? 'pending' : 'pass'),
    schema: 'Valid',
    ai: i < 2 ? 'Cited' : 'Tracking',
  })),
  openItems: [
    { pri: 'HIGH', text: 'Publish the comparison cluster (stainless vs galvanised follow-ups) — the questions where competitors are provably citable.' },
    { pri: 'MED', text: 'Add FAQ schema to the three product category pages.' },
    { pri: 'LOW', text: 'Refresh the 2025 lead-times post with current supplier data.' },
  ],
  aiAudit: {
    round: 'Round 3',
    tested: 'August 21, 2026',
    period: '2026-08-01',
    totalChecks: 40,
    visibleChecks: 6,
    rate: '15%',
    note:
      'Sample figures. In this demonstration, Northwind is cited in 6 of 40 checks (15%) across Google and the three major AI answer engines, up from 1 of 40 at baseline. Two of the six are first-position citations on comparison questions the content plan targeted directly.',
    intentNote: 'By intent group: problem-aware 1 of 10, comparison 3 of 10, how-to and safety 1 of 10, buying-intent 1 of 10.',
    method:
      '10 buyer questions x 4 platforms = 40 checks, run on 21 August 2026. Questions are tested word for word as a buyer would type them, never naming the brand. Engines: Google, ChatGPT, Gemini, Perplexity. These are sample figures for demonstration.',
    scorecard: [
      { channel: 'Google', checks: 10, visible: 2, rate: '20%' },
      { channel: 'ChatGPT', checks: 10, visible: 1, rate: '10%' },
      { channel: 'Gemini', checks: 10, visible: 3, rate: '30%' },
      { channel: 'Perplexity', checks: 10, visible: 0, rate: '0%' },
    ],
    intent: [
      { group: 'Problem-aware', visible: 1, of: 10 },
      { group: 'Comparison', visible: 3, of: 10 },
      { group: 'How-to & safety', visible: 1, of: 10 },
      { group: 'Buying-intent', visible: 1, of: 10 },
    ],
    wins: [
      'Sample: "stainless vs galvanised fasteners" now returns Northwind 1st on both Google and Gemini — the comparison post published in Month 1.',
      'Sample: "how long do galvanised fasteners last outdoors" earns a first Gemini citation at 2nd.',
    ],
    groups: [
      {
        name: 'Comparison questions (sample)',
        insight: 'Sample data. 3 of 10 — the cluster the content plan targeted first, and where a specialist supplier can displace directories fastest.',
        rows: [
          { n: 'C1', q: 'Stainless vs galvanised fasteners: which lasts longer outdoors?', g: 'Yes, 1st', c: 'No', ge: 'Yes, 1st', p: 'No', won: 'Sample competitors: Fastenal, Grainger, ThomasNet' },
          { n: 'C2', q: 'Are hot-dip galvanised bolts worth the extra cost?', g: 'No', c: 'Yes, 3rd', ge: 'No', p: 'No', won: 'Sample competitors: Bolt Depot, Engineering Toolbox' },
          { n: 'C3', q: 'Which fastener grade for coastal installations?', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Sample competitors: ASTM, Corrosionpedia' },
        ],
      },
      {
        name: 'Buying-intent questions (sample)',
        insight: 'Sample data. 1 of 10. Directories still hold the transactional queries; the product-page rewrite is the lever here.',
        rows: [
          { n: 'B1', q: 'Buy marine-grade stainless fasteners in bulk', g: 'Yes, 4th', c: 'No', ge: 'No', p: 'No', won: 'Sample competitors: Grainger, McMaster-Carr, Amazon Business' },
          { n: 'B2', q: 'Best supplier for industrial fasteners', g: 'No', c: 'No', ge: 'No', p: 'No', won: 'Sample competitors: ThomasNet, IndustryNet' },
        ],
      },
    ],
  },
  aiAuditHistory: [
    {
      round: 'Round 2',
      tested: 'July 20, 2026',
      period: '2026-07-01',
      totalChecks: 40,
      visibleChecks: 3,
      rate: '7.5%',
      scorecard: [
        { channel: 'Google', checks: 10, visible: 1, rate: '10%' },
        { channel: 'ChatGPT', checks: 10, visible: 0, rate: '0%' },
        { channel: 'Gemini', checks: 10, visible: 2, rate: '20%' },
        { channel: 'Perplexity', checks: 10, visible: 0, rate: '0%' },
      ],
    },
  ],
};

/** Sample monthly reports. No storage_path — the demo links nowhere. */
export const DEMO_AUDITS = [
  { id: 'demo-3', title: 'AI Visibility Audit — August 2026 (sample)', period: '2026-08-01' },
  { id: 'demo-2', title: 'AI Visibility Audit — July 2026 (sample)', period: '2026-07-01' },
  { id: 'demo-1', title: 'AI Visibility Audit — June 2026 (sample)', period: '2026-06-01' },
];
