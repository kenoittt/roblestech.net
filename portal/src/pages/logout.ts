import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../lib/supabase';

export const prerender = false;

const signOut = async (context: Parameters<APIRoute>[0]) => {
  const supabase = createSupabaseServer(context);
  await supabase.auth.signOut();
  return context.redirect('/login');
};

export const POST: APIRoute = signOut;
export const GET: APIRoute = signOut;
