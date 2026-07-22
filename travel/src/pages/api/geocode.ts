import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';

export const prerender = false;

// Server-side proxy for OpenStreetMap Nominatim (usage policy: identify the
// app, low volume). Keeps third-party calls off the client (SRS §5.1).
export const GET: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: 'auth' }), { status: 401 });

  const q = (context.url.searchParams.get('q') ?? '').trim().slice(0, 120);
  if (!q) return new Response(JSON.stringify({ results: [] }), { headers: { 'content-type': 'application/json' } });
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'WanderWise/0.1 (roblestech.net travel planner)' } }
    );
    const j: any = await res.json();
    const results = (Array.isArray(j) ? j : []).map((r: any) => ({
      display_name: r.display_name, lat: Number(r.lat), lng: Number(r.lon),
    }));
    return new Response(JSON.stringify({ results }), {
      headers: {
        'content-type': 'application/json',
        // Same query → same places; cache at the CDN for a day to keep
        // Nominatim volume low (their usage policy) and responses instant.
        'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response(JSON.stringify({ results: [] }), { headers: { 'content-type': 'application/json' } });
  }
};
