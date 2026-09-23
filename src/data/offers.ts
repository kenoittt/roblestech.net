/*
 * Single source of truth for every price and offer fact that appears on more
 * than one page.
 *
 * Why this file exists: the FAQ page and the service pages drifted apart. The
 * FAQ was quoting Foundation at $2,000, Engine at $3,500 and Operator at
 * $6,000 while /services/geo had been selling them at $2,500, $4,500 and
 * $7,500, and it described the Gap Report as a paid 20-query diagnostic long
 * after that page had it as a free 10-query one. Both were published, both
 * looked authoritative, and the FAQ's numbers were also being emitted as
 * FAQPage JSON-LD, so the stale set was the one search engines were reading
 * back.
 *
 * The rule from here: a number that appears in two places is defined here and
 * imported. If you are about to type a price into a page, put it here instead.
 * Anything that genuinely lives on one page only (a tier's feature list, a
 * page's own copy) stays on that page.
 */

/** Formats 2500 as "$2,500". Prices are stored as numbers so they can be */
/** compared and summed, and rendered one way everywhere.                 */
export const usd = (n: number): string => '$' + n.toLocaleString('en-US');

/* ─────────────── GEO + SEO ─────────────── */

export type GeoTier = {
  key: 'foundation' | 'engine' | 'operator';
  name: string;
  /** Monthly retainer. */
  price: number;
  unit: string;
  /** Posts per month, as written. A range stays a string. */
  posts: string;
  /** Tracked buying-intent questions across the AI engines. */
  questions: number;
};

export const GEO_TIERS: GeoTier[] = [
  { key: 'foundation', name: 'Foundation', price: 2500, unit: '/mo', posts: '2', questions: 10 },
  { key: 'engine', name: 'Engine', price: 4500, unit: '/mo', posts: '4', questions: 15 },
  { key: 'operator', name: 'Operator', price: 7500, unit: '/mo', posts: '6–8', questions: 20 },
];

export const geoTier = (key: GeoTier['key']): GeoTier =>
  GEO_TIERS.find((t) => t.key === key)!;

/** The minimum term, stated identically on the service page and the FAQ. */
export const GEO_MIN_TERM = '3-month minimum, then month-to-month';

/* ─────────────── AI Visibility Gap Report ───────────────
 * The entry offer. It is free and ungated: the only thing asked in return is
 * a short call to walk through the findings.
 */
export const GAP_REPORT = {
  /** Free. Kept as a field rather than assumed, so a change lands in one place. */
  price: 0,
  priceLabel: 'Free',
  /** Buying-intent queries run across the engines. */
  queries: 10,
  engines: 'ChatGPT, Gemini and Perplexity',
  /** The walkthrough call. Capped, and the cap is part of the offer. */
  callMinutes: 20,
  /** The one-line promise, so the wording matches wherever it is repeated. */
  keepLine: 'The report is yours to keep either way.',
  callLine: 'We walk you through it on a 20-minute call.',
} as const;

/* ─────────────── Smartsheet ─────────────── */

export const SMARTSHEET_TIERS = [
  { key: 'launchpad', name: 'Launchpad', price: 3500, unit: '/project' },
  { key: 'momentum', name: 'Momentum', price: 9500, unit: '/project' },
  { key: 'enterprise', name: 'Enterprise', price: 22000, unit: '/project' },
] as const;

export const smartsheetTier = (key: (typeof SMARTSHEET_TIERS)[number]['key']) =>
  SMARTSHEET_TIERS.find((t) => t.key === key)!;

/** Add-ons quoted on both the service page and the FAQ. */
export const SMARTSHEET_ADDONS = {
  apiIntegration: 3500,
  licenceHealthCheckFrom: 1500,
  licenceHealthCheckTo: 3500,
  aiEnablement: 4500,
} as const;

/* ─────────────── Technical consulting ─────────────── */

export const CONSULTING_RETAINER = {
  price: 3500,
  unit: '/mo',
  hours: 20,
  minTerm: 'minimum 3-month commitment',
} as const;

/* ─────────────── Automations & AI ─────────────── */

export const AUTOMATION_AUDIT = {
  price: 2500,
  /** Credited against any build started inside this window. */
  creditDays: 60,
} as const;
