/*
 * Knowledge base data access.
 *
 * Articles and categories live in the database rather than in files, because
 * the people who keep this current are not the people who deploy. Adding an
 * article, renaming a category or reordering the shelves all happen in the
 * admin centre, and none of them need a build.
 *
 * Reads run under the caller's session, so row level security applies and only
 * an internal PPM account gets rows back. Writes go through the API routes
 * with the service role, and those check for admin first.
 */
import type { APIContext } from 'astro';
import { createSupabaseServer } from './supabase';

export type KbStatus = 'ready' | 'draft' | 'needed';

export const STATUS_LABEL: Record<KbStatus, string> = {
  ready: 'Ready',
  draft: 'Draft — has gaps',
  needed: 'Not written yet',
};

/* Why the status exists, shown in the admin form so it keeps being used the
   way it was meant to. */
export const STATUS_HELP: Record<KbStatus, string> = {
  ready: 'Written from something verifiable. Safe to follow.',
  draft: 'Has gaps, marked inline. Usable, but read the gaps first.',
  needed: 'A known gap, kept visible so it is not forgotten.',
};

export type KbCategory = {
  id: string; slug: string; title: string; blurb: string | null;
  color: string; sort: number;
};

export type KbTopic = {
  id: string; category_id: string; slug: string; title: string; sort: number;
};

export type KbArticle = {
  id: string; category_id: string | null; topic_id: string | null;
  slug: string; title: string; summary: string | null; body: string;
  status: KbStatus; owner: string | null; keywords: string | null;
  updated_at: string;
};

export type KbFilters = {
  /** Free text. Matches title, summary, keywords and body. */
  q?: string;
  /** Category slug, or '' for all. */
  category?: string;
  /** Status, or '' for all. */
  status?: string;
  /** Owner, or '' for all. */
  owner?: string;
};

const ARTICLE_COLS =
  'id, category_id, topic_id, slug, title, summary, body, status, owner, keywords, updated_at';

export async function getCategories(context: APIContext): Promise<KbCategory[]> {
  const supabase = createSupabaseServer(context);
  const { data } = await supabase
    .from('kb_categories')
    .select('id, slug, title, blurb, color, sort')
    .order('sort')
    .order('title');
  return (data as KbCategory[]) ?? [];
}

export async function getTopics(context: APIContext): Promise<KbTopic[]> {
  const supabase = createSupabaseServer(context);
  const { data } = await supabase
    .from('kb_topics')
    .select('id, category_id, slug, title, sort')
    .order('sort');
  return (data as KbTopic[]) ?? [];
}

/**
 * Search and filter in one query.
 *
 * The free-text part uses the generated tsvector column when the term looks
 * like whole words, which is what lets one box find an article by a phrase in
 * its body as well as by its title. Full-text will not match a prefix, though,
 * and someone typing "calend" should still reach the calendar article, so a
 * term that finds nothing gets a second pass with ILIKE over the same fields.
 * Without that, typing letter by letter blanks the page mid-word and reads as
 * "no results" rather than "still typing".
 */
export async function searchArticles(
  context: APIContext,
  f: KbFilters = {}
): Promise<KbArticle[]> {
  const supabase = createSupabaseServer(context);

  let categoryId: string | null = null;
  if (f.category) {
    const { data: cat } = await supabase
      .from('kb_categories').select('id').eq('slug', f.category).single();
    // An unknown category slug must return nothing, not everything.
    if (!cat) return [];
    categoryId = (cat as { id: string }).id;
  }

  const term = (f.q ?? '').trim();
  const like = `%${term.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
  const orClause =
    `title.ilike.${like},summary.ilike.${like},keywords.ilike.${like},body.ilike.${like}`;

  const base = () => {
    let q = supabase.from('kb_articles').select(ARTICLE_COLS);
    if (categoryId) q = q.eq('category_id', categoryId);
    if (f.status) q = q.eq('status', f.status);
    if (f.owner) q = q.eq('owner', f.owner);
    return q;
  };

  let query = base();
  if (term) {
    const wordy = /^[\w\s'-]+$/.test(term);
    if (wordy && term.length >= 3) {
      query = query.textSearch('search', term, { type: 'websearch', config: 'english' });
    } else {
      query = query.or(orClause);
    }
  }

  const { data } = await query.order('title');
  let rows = (data as KbArticle[]) ?? [];

  if (term && rows.length === 0) {
    const { data: fb } = await base().or(orClause).order('title');
    rows = (fb as KbArticle[]) ?? [];
  }
  return rows;
}

export async function getArticle(context: APIContext, slug: string): Promise<KbArticle | null> {
  const supabase = createSupabaseServer(context);
  const { data } = await supabase
    .from('kb_articles').select(ARTICLE_COLS).eq('slug', slug).single();
  return (data as KbArticle) ?? null;
}

/** Distinct owners, for the owner filter. Small table, done in memory. */
export async function getOwners(context: APIContext): Promise<string[]> {
  const supabase = createSupabaseServer(context);
  const { data } = await supabase.from('kb_articles').select('owner');
  const set = new Set<string>();
  for (const r of (data as { owner: string | null }[]) ?? []) {
    if (r.owner && r.owner.trim()) set.add(r.owner.trim());
  }
  return [...set].sort();
}

/** URL-safe slug from a title, for the admin form's default. */
export const slugify = (s: string): string =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

/** Excerpt around the first hit, so a search result shows why it matched. */
export function snippet(body: string, term: string, len = 150): string {
  const plain = String(body ?? '').replace(/[#*`>|_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!term) return plain.slice(0, len);
  const i = plain.toLowerCase().indexOf(term.toLowerCase());
  if (i === -1) return plain.slice(0, len);
  const from = Math.max(0, i - 40);
  return (from > 0 ? '…' : '') + plain.slice(from, from + len) + (from + len < plain.length ? '…' : '');
}
