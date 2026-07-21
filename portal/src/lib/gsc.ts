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

export type GscData = {
  dailyLog: { d: string; c: number; i: number }[];
  byPage: { page: string; clicks: number; impr: number }[];
  siteTotal: { clicks: number; impr: number };
  preLogBaseline: { month: string; c: number; i: number };
  pullDate: string;
  pullRange: string;
};

/** Pull ~90 days of daily metrics + top pages (28d) for one property. */
export async function fetchGscData(property: string): Promise<GscData> {
  const token = await accessToken();

  // GSC finalizes data over ~2-3 days; end the window 2 days back.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89); // 90-day daily window
  const page28Start = new Date(end);
  page28Start.setUTCDate(page28Start.getUTCDate() - 27);

  const [dateRows, pageRows] = await Promise.all([
    query(token, property, { startDate: iso(start), endDate: iso(end), dimensions: ['date'], rowLimit: 500 }),
    query(token, property, { startDate: iso(page28Start), endDate: iso(end), dimensions: ['page'], rowLimit: 25 }),
  ]);

  const dailyLog = dateRows
    .map((r) => ({ d: r.keys?.[0] ?? '', c: Math.round(r.clicks), i: Math.round(r.impressions) }))
    .filter((r) => r.d)
    .sort((a, b) => b.d.localeCompare(a.d));

  const byPage = pageRows
    .map((r) => ({ page: r.keys?.[0] ?? '', clicks: Math.round(r.clicks), impr: Math.round(r.impressions) }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const total = dailyLog
    .filter((r) => r.d >= iso(page28Start))
    .reduce((acc, r) => ({ clicks: acc.clicks + r.c, impr: acc.impr + r.i }), { clicks: 0, impr: 0 });

  return {
    dailyLog,
    byPage,
    siteTotal: total,
    preLogBaseline: { month: iso(end).slice(0, 7), c: 0, i: 0 },
    pullDate: iso(new Date()),
    pullRange: `${iso(page28Start)} to ${iso(end)} (last 28 days)`,
  };
}
