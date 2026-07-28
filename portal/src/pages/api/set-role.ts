import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { gateChange, ASSIGNABLE_ROLES } from '../../lib/approvals';

export const prerender = false;

/*
 * Set a user's role (admin | staff | client). Super admins apply it straight
 * away; regular admins get it queued for super-admin approval like every other
 * admin change. Granting or removing super_admin is not possible here on
 * purpose — that stays a deliberate database change.
 */
export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || (profile?.role !== 'admin' && profile?.role !== 'super_admin')) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await context.request.formData();
  // Path only — gateChange appends its own ?ok=/?err=.
  const backRaw = String(form.get('back') ?? '').split('?')[0];
  const back = backRaw.startsWith('/') && !backRaw.startsWith('//') ? backRaw : '/admin/users';
  const userId = String(form.get('user_id') ?? '');
  const role = String(form.get('role') ?? '');
  const bad = (msg: string) => context.redirect(back + '?err=' + encodeURIComponent(msg));

  if (!userId) return bad('Missing user.');
  if (!ASSIGNABLE_ROLES.includes(role)) return bad('Pick a valid role.');
  if (userId === user.id) return bad("You can't change your own role.");

  // Don't let the UI demote a super admin, whoever is asking.
  const admin = createSupabaseAdmin();
  const { data: target } = await admin
    .from('profiles').select('role').eq('id', userId).maybeSingle();
  if ((target as { role: string } | null)?.role === 'super_admin') {
    return bad('Super-admin roles are changed directly in the database.');
  }

  return gateChange(
    context,
    'set_role',
    { user_id: userId, role, __reason: form.get('reason') ?? '' },
    back
  );
};
