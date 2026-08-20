import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

/*
 * Admin-only: set another member's password, for when someone is locked out.
 *
 * The new password travels in the POST body only and is never echoed back —
 * the redirect carries a status message naming the member, not the secret.
 *
 * An admin may reset staff and other admins, but only a super_admin may reset
 * a super_admin: otherwise any admin could set a password on the super_admin
 * account and take it over.
 */
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  const actorRole = profile?.role;
  if (actorRole !== 'admin' && actorRole !== 'super_admin') {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  const userId = String(form.get('user_id') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const fail = (m: string) => context.redirect('/admin?err=' + encodeURIComponent(m));

  if (!userId) return fail('No member selected.');
  if (password.length < 8) return fail('Password must be at least 8 characters.');

  const admin = createSupabaseAdmin();

  const { data: target, error: tErr } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();
  if (tErr || !target) return fail('That member no longer exists.');

  const t = target as { id: string; full_name: string | null; role: string };
  if (t.role === 'super_admin' && actorRole !== 'super_admin') {
    return fail('Only a super admin can reset a super admin password.');
  }

  const { error } = await admin.auth.admin.updateUserById(t.id, { password });
  if (error) return fail(error.message);

  return context.redirect(
    '/admin?ok=' + encodeURIComponent(`Password updated for ${t.full_name || 'that member'}. Share it with them directly and have them change it after signing in.`)
  );
};
