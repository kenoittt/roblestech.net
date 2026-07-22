import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../lib/supabase';

export const prerender = false;

const signOut: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  await supabase.auth.signOut();
  return context.redirect('/');
};
export const POST = signOut;
export const GET = signOut;
