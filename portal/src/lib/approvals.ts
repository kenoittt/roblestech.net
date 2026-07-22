import type { APIContext } from 'astro';
import { createSupabaseAdmin } from './supabase';
import { getSession } from './auth';

export type ChangeKind =
  | 'client_create' | 'client_update' | 'client_delete'
  | 'link_client' | 'save_config'
  | 'audit_add' | 'audit_delete';

/** Perform the actual DB mutation for a change. Returns an error message or null. */
export async function applyChange(kind: string, payload: Record<string, any>): Promise<string | null> {
  const admin = createSupabaseAdmin();
  let error: { message: string } | null = null;
  if (kind === 'client_create') {
    ({ error } = await admin.from('clients').insert({ name: payload.name, gsc_property: payload.gsc_property || null }));
  } else if (kind === 'client_update') {
    ({ error } = await admin.from('clients').update({ name: payload.name, gsc_property: payload.gsc_property || null }).eq('id', payload.id));
  } else if (kind === 'client_delete') {
    ({ error } = await admin.from('clients').delete().eq('id', payload.id));
  } else if (kind === 'link_client') {
    ({ error } = await admin.from('profiles').update({ client_id: payload.client_id || null }).eq('id', payload.user_id));
  } else if (kind === 'save_config') {
    ({ error } = await admin.from('clients').update({ gsc_property: payload.gsc_property || null, config: payload.config }).eq('id', payload.client_id));
  } else if (kind === 'audit_add') {
    // File is already in storage; approval creates the visible row.
    ({ error } = await admin.from('reports').insert({
      client_id: payload.client_id, title: payload.title, period: payload.period, storage_path: payload.storage_path,
    }));
  } else if (kind === 'audit_delete') {
    const { error: delErr } = await admin.from('reports').delete().eq('id', payload.id);
    if (!delErr && payload.storage_path) await admin.storage.from('reports').remove([payload.storage_path]);
    error = delErr;
  } else {
    return 'Unknown change kind: ' + kind;
  }
  return error ? error.message : null;
}

/**
 * Gate a mutation: super admins execute immediately; regular admins get the
 * change queued as a pending request. Returns a redirect Response.
 */
export async function gateChange(
  context: APIContext,
  kind: ChangeKind,
  payload: Record<string, any>,
  redirectTo: string
): Promise<Response> {
  const { user, profile } = await getSession(context);
  const role = profile?.role;
  if (!user || (role !== 'admin' && role !== 'super_admin')) return new Response('Forbidden', { status: 403 });

  if (role === 'super_admin') {
    const err = await applyChange(kind, payload);
    return context.redirect(`${redirectTo}?${err ? 'err=' + encodeURIComponent(err) : 'ok=' + encodeURIComponent('Done.')}`);
  }

  // Regular admin → queue for approval.
  const reason = String((payload as any).__reason ?? '').trim();
  delete (payload as any).__reason;
  const admin = createSupabaseAdmin();
  const { error } = await admin.from('change_requests').insert({ kind, payload, reason: reason || null, requested_by: user.id });
  if (error) return context.redirect(`${redirectTo}?err=` + encodeURIComponent(error.message));
  return context.redirect(`${redirectTo}?ok=` + encodeURIComponent('Request submitted for super-admin approval.'));
}
