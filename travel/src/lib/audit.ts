import { createSupabaseAdmin } from './supabase';

/** ISO 27001 evidence trail (NFR-10). Best-effort — never blocks the action. */
export async function audit(actorId: string | null, action: string, entity?: string, metadata: Record<string, unknown> = {}) {
  try {
    await createSupabaseAdmin().from('audit_logs').insert({ actor_id: actorId, action, entity: entity ?? null, metadata });
  } catch { /* logging must never break the request */ }
}
