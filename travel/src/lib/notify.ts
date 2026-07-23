import { createSupabaseAdmin } from './supabase';

/* Create an in-app notification for a user. Best-effort — never blocks the
   action that triggered it (mirrors the audit() helper). */
export async function notify(
  userId: string | null,
  n: { type: string; title: string; body?: string; trip_id?: string | null }
) {
  if (!userId) return;
  try {
    await createSupabaseAdmin().from('notifications').insert({
      user_id: userId, type: n.type, title: n.title, body: n.body ?? null, trip_id: n.trip_id ?? null,
    });
  } catch { /* notifications must never break the request */ }
}
