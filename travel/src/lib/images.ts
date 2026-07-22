/*
 * Free place photos via the Wikipedia/Wikimedia API (no key, no cost).
 * One request per place: search for the best-matching article and take its
 * lead image thumbnail. Results are cached in the DB by the callers, so each
 * place is looked up once, not per page view.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const UA = { headers: { 'user-agent': 'WanderWise/1.0 (https://wanderwise.roblestech.net)' } };

export async function wikiImage(query: string, size = 640): Promise<string | null> {
  const url = `${API}?action=query&format=json&origin=*&generator=search&gsrlimit=1` +
    `&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&piprop=thumbnail&pithumbsize=${size}`;
  try {
    const res = await fetch(url, UA);
    if (!res.ok) return null;
    const j: any = await res.json();
    const pages = j?.query?.pages;
    if (!pages) return null;
    const first: any = Object.values(pages)[0];
    return first?.thumbnail?.source ?? null;
  } catch { return null; }
}

/* Wikipedia titles where our destination name isn't the article name. */
const WIKI_DEST: Record<string, string> = {
  'Ha Long': 'Ha Long Bay',
  'Sapa': 'Sa Pa',
  'Hualien': 'Hualien City',
  'Issyk-Kul (Cholpon-Ata)': 'Issyk-Kul lake',
};

export const destImage = (name: string, country: string, size = 640) =>
  wikiImage(`${WIKI_DEST[name] ?? name} ${country}`, size);
