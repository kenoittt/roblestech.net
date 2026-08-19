/*
 * Google Search Console pull. Uses the stored OAuth refresh token to mint a
 * short-lived access token, then queries the Search Analytics API for a
 * property and shapes the result into the dashboard's GSC data block.
 */
import { pick } from './env';

const CLIENT_ID = pick('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = pick('GOOGLE_CLIENT_SECRET');
const REFRESH_TOKEN = pick('GOOGLE_REFRESH_TOKEN');

async function accessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('No access_token in Google response');
  return json.access_token;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

type SaRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

async function query(token: string, property: string, body: Record<string, unknown>): Promise<SaRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GSC query failed for ${property}: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { rows?: SaRow[] };
  return json.rows ?? [];
}

export type PostSeries = {
  url: string;
  /** Daily rows, newest first. Only days GSC actually recorded impressions. */
  daily: { d: string; c: number; i: number; p: number }[];
  /** Trailing 28 days. */
  totals: { clicks: number; impr: number; ctr: number; pos: number };
  /** The 28 days before that, for period-over-period deltas. */
  prev: { clicks: number; impr: number };
  /** First day this URL was seen in GSC at all, or null if never. */
  first: string | null;
};

export type GscData = {
  dailyLog: { d: string; c: number; i: number }[];
  byPage: { page: string; clicks: number; impr: number }[];
  siteTotal: { clicks: number; impr: number; pos?: number };
  preLogBaseline: { month: string; c: number; i: number };
  pullDate: string;
  pullRange: string;
  /** Per-tracked-post series powering the Blog performance tab. */
  posts: PostSeries[];
  postsRange: string;
};

/**
 * Resolve a tracked post URL to a comparable path. Admins may enter either a
 * full URL or a bare path, and GSC reports full URLs whose scheme/host may not
 * match what was typed — so we compare on path only.
 */
function toPath(u: string): string {
  let s = String(u ?? '').trim();
  if (!s) return '';
  s = s.replace(/^sc-domain:/, '');
  s = s.replace(/^https?:\/\/[^/]+/, '');
  if (!s.startsWith('/')) s = '/' + s;
  return s.replace(/\/+$/, '').toLowerCase() || '/';
}

/** Run `jobs` with limited concurrency so a long post list can't burst GSC's quota. */
async function pooled<T>(jobs: (() => Promise<T>)[], limit = 4): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, jobs.length) }, async () => {
      while (next < jobs.length) {
        const i = next++;
        out[i] = await jobs[i]();
      }
    })
  );
  return out;
}

/**
 * Per-post daily metrics. One query per tracked URL, filtered server-side to
 * pages containing that path, then matched exactly on path locally — that way a
 * post whose slug is a prefix of another post's slug can't absorb its numbers.
 */
async function fetchPostSeries(
  token: string,
  property: string,
  urls: string[],
  startDate: string,
  endDate: string,
  curFrom: string,
  prevFrom: string
): Promise<PostSeries[]> {
  const jobs = urls.map((url) => async (): Promise<PostSeries> => {
    const path = toPath(url);
    const empty: PostSeries = {
      url,
      daily: [],
      totals: { clicks: 0, impr: 0, ctr: 0, pos: 0 },
      prev: { clicks: 0, impr: 0 },
      first: null,
    };
    if (!path) return empty;

    let rows: SaRow[] = [];
    try {
      rows = await query(token, property, {
        startDate,
        endDate,
        dimensions: ['date', 'page'],
        dimensionFilterGroups: [
          { filters: [{ dimension: 'page', operator: 'contains', expression: path }] },
        ],
        rowLimit: 5000,
      });
    } catch {
      // A single post failing (deleted URL, transient 5xx) must not sink the
      // whole refresh — report it as no-data and carry on.
      return empty;
    }

    const mine = rows.filter((r) => toPath(r.keys?.[1] ?? '') === path);
    const daily = mine
      .map((r) => ({
        d: r.keys?.[0] ?? '',
        c: Math.round(r.clicks),
        i: Math.round(r.impressions),
        p: Math.round(r.position * 10) / 10,
      }))
      .filter((r) => r.d)
      .sort((a, b) => b.d.localeCompare(a.d));

    const cur = daily.filter((r) => r.d >= curFrom);
    const prevWin = daily.filter((r) => r.d >= prevFrom && r.d < curFrom);
    const sum = (rs: typeof daily) =>
      rs.reduce((a, r) => ({ clicks: a.clicks + r.c, impr: a.impr + r.i }), { clicks: 0, impr: 0 });
    const curSum = sum(cur);
    const wImpr = cur.reduce((s, r) => s + r.i, 0);

    return {
      url,
      daily,
      totals: {
        clicks: curSum.clicks,
        impr: curSum.impr,
        ctr: curSum.impr > 0 ? Math.round((curSum.clicks / curSum.impr) * 1000) / 10 : 0,
        // Impression-weighted, matching how the site-wide figure is computed.
        pos: wImpr > 0 ? Math.round((cur.reduce((s, r) => s + r.p * r.i, 0) / wImpr) * 10) / 10 : 0,
      },
      prev: sum(prevWin),
      first: daily.length ? daily[daily.length - 1].d : null,
    };
  });

  return pooled(jobs);
}

/** Pull ~90 days of daily metrics + top pages (28d) for one property. */
export async function fetchGscData(property: string, postUrls: string[] = []): Promise<GscData> {
  const token = await accessToken();

  // GSC finalizes data over ~2-3 days; end the window 2 days back.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89); // 90-day daily window
  const page28Start = new Date(end);
  page28Start.setUTCDate(page28Start.getUTCDate() - 27);
  // Per-post history runs deeper than the site window so the Blog performance
  // chart still has a shape to show for posts published months ago.
  const postStart = new Date(end);
  postStart.setUTCDate(postStart.getUTCDate() - 179);
  const prevFrom = new Date(page28Start);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - 28);

  const [dateRows, pageRows, posts] = await Promise.all([
    query(token, property, { startDate: iso(start), endDate: iso(end), dimensions: ['date'], rowLimit: 500 }),
    query(token, property, { startDate: iso(page28Start), endDate: iso(end), dimensions: ['page'], rowLimit: 25 }),
    postUrls.length
      ? fetchPostSeries(token, property, postUrls, iso(postStart), iso(end), iso(page28Start), iso(prevFrom))
      : Promise.resolve([] as PostSeries[]),
  ]);

  const dailyLog = dateRows
    .map((r) => ({ d: r.keys?.[0] ?? '', c: Math.round(r.clicks), i: Math.round(r.impressions) }))
    .filter((r) => r.d)
    .sort((a, b) => b.d.localeCompare(a.d));

  const byPage = pageRows
    .map((r) => ({ page: r.keys?.[0] ?? '', clicks: Math.round(r.clicks), impr: Math.round(r.impressions) }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const total: { clicks: number; impr: number; pos?: number } = dailyLog
    .filter((r) => r.d >= iso(page28Start))
    .reduce((acc, r) => ({ clicks: acc.clicks + r.c, impr: acc.impr + r.i }), { clicks: 0, impr: 0 });

  // Impression-weighted average position over the 28-day window.
  const win = dateRows.filter((r) => (r.keys?.[0] ?? '') >= iso(page28Start));
  const wImpr = win.reduce((s, r) => s + r.impressions, 0);
  if (wImpr > 0) total.pos = Math.round((win.reduce((s, r) => s + r.position * r.impressions, 0) / wImpr) * 10) / 10;

  return {
    dailyLog,
    byPage,
    siteTotal: total,
    preLogBaseline: { month: iso(end).slice(0, 7), c: 0, i: 0 },
    pullDate: iso(new Date()),
    pullRange: `${iso(page28Start)} to ${iso(end)} (last 28 days)`,
    posts,
    postsRange: `${iso(postStart)} to ${iso(end)} (${posts.length} tracked post${posts.length === 1 ? '' : 's'})`,
  };
}
