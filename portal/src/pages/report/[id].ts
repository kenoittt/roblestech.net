import type { APIRoute } from 'astro';
import { createSupabaseServer, createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { id } = context.params;
  if (!id) return new Response('Not found', { status: 404 });

  // AUTHORIZATION: this select runs under the caller's session, so RLS only
  // returns the row if this user is allowed to see it. Requesting another
  // client's report id simply returns nothing → 404. This is the gate.
  const supabase = createSupabaseServer(context);
  const { data: report, error } = await supabase
    .from('reports')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (error || !report) return new Response('Report not found', { status: 404 });

  // Only after ownership is confirmed do we read the private file. The bucket
  // is not public; the service-role key never reaches the browser, and the
  // HTML is streamed inline rather than via any shareable storage URL.
  const admin = createSupabaseAdmin();
  const { data: file, error: dlErr } = await admin.storage
    .from('reports')
    .download(report.storage_path);

  if (dlErr || !file) return new Response('Report file unavailable', { status: 404 });

  const html = await file.text();
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};
