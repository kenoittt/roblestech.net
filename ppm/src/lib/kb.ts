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

/*
 * Every read below fails soft.
 *
 * The nav asks for categories on EVERY page, so anything that can throw in
 * here can take down the whole app rather than one section. Two ways that can
 * happen and both are real: the migration has not been run yet, so the tables
 * do not exist; or the Supabase client throws while refreshing a session token
 * mid-render. Neither is a reason for the board and the task list to stop
 * working, so a failed handbook read gives back nothing and the handbook shows
 * as empty.
 */
async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    console.error(`[kb] ${label} failed:`, e);
    return fallback;
  }
}

export async function getCategories(context: APIContext): Promise<KbCategory[]> {
  return safe('getCategories', async () => {
    const supabase = createSupabaseServer(context);
    const { data, error } = await supabase
      .from('kb_categories')
      .select('id, slug, title, blurb, color, sort')
      .order('sort')
      .order('title');
    if (error) throw new Error(error.message);
    return (data as KbCategory[]) ?? [];
  }, []);
}

export async function getTopics(context: APIContext): Promise<KbTopic[]> {
  return safe('getTopics', async () => {
    const supabase = createSupabaseServer(context);
    const { data, error } = await supabase
      .from('kb_topics')
      .select('id, category_id, slug, title, sort')
      .order('sort');
    if (error) throw new Error(error.message);
    return (data as KbTopic[]) ?? [];
  }, []);
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
  return safe('searchArticles', () => searchArticlesInner(context, f), []);
}

async function searchArticlesInner(context: APIContext, f: KbFilters): Promise<KbArticle[]> {
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
  return safe('getArticle', async () => {
    const supabase = createSupabaseServer(context);
    const { data } = await supabase
      .from('kb_articles').select(ARTICLE_COLS).eq('slug', slug).maybeSingle();
    return (data as KbArticle) ?? null;
  }, null);
}

/** Distinct owners, for the owner filter. Small table, done in memory. */
export async function getOwners(context: APIContext): Promise<string[]> {
  return safe('getOwners', async () => {
    const supabase = createSupabaseServer(context);
    const { data } = await supabase.from('kb_articles').select('owner');
    const set = new Set<string>();
    for (const r of (data as { owner: string | null }[]) ?? []) {
      if (r.owner && r.owner.trim()) set.add(r.owner.trim());
    }
    return [...set].sort();
  }, []);
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

/* ── Was this article helpful? ─────────────────────────────────────────────
 *
 * One row per person per article. Reads run under the caller's session, so
 * row level security decides what comes back; the write goes through the API
 * route, which sets user_id from the session rather than from the request.
 */

export type KbVotes = { yes: number; no: number; mine: boolean | null };

export async function getVotes(
  context: APIContext,
  articleId: string,
  userId: string | null
): Promise<KbVotes> {
  return safe('getVotes', async () => {
    const supabase = createSupabaseServer(context);
    const { data } = await supabase
      .from('kb_feedback')
      .select('user_id, helpful')
      .eq('article_id', articleId);
    const rows = (data as { user_id: string; helpful: boolean }[]) ?? [];
    return {
      yes: rows.filter((r) => r.helpful).length,
      no: rows.filter((r) => !r.helpful).length,
      mine: userId ? (rows.find((r) => r.user_id === userId)?.helpful ?? null) : null,
    };
  }, { yes: 0, no: 0, mine: null });
}

/**
 * Articles worth reading next.
 *
 * Keyword overlap first, because two articles sharing "invoice" are related in
 * a way that two articles sharing a category are not. Same-category articles
 * fill the rest, so the section is never empty on a small handbook.
 */
export function relatedTo(article: KbArticle, pool: KbArticle[], limit = 4): KbArticle[] {
  const keys = new Set(
    (article.keywords ?? '').toLowerCase().split(/[,\s]+/).filter((k) => k.length > 2)
  );
  const others = pool.filter((a) => a.id !== article.id);
  const scored = others
    .map((a) => {
      const theirs = (a.keywords ?? '').toLowerCase().split(/[,\s]+/).filter(Boolean);
      return { a, score: theirs.filter((k) => keys.has(k)).length };
    })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score);

  const out = scored.map((s) => s.a);
  for (const a of others) {
    if (out.length >= limit) break;
    if (a.category_id === article.category_id && !out.includes(a)) out.push(a);
  }
  return out.slice(0, limit);
}
