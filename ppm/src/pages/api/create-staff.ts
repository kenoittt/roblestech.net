import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: create an internal PPM staff login.
// Only a super admin may create an admin. Roles are shared with the client
// portal, where an admin sees every client's data, so this matches the
// portal's own rule (portal/src/pages/api/create-admin.ts).
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const fullName = String(form.get('full_name') ?? '').trim();
  const role = String(form.get('role') ?? 'staff') === 'admin' ? 'admin' : 'staff';
  if (role === 'admin' && profile?.role !== 'super_admin') {
    return context.redirect('/admin?err=' + encodeURIComponent('Only a super admin can create an admin.'));
  }
  if (!email || password.length < 8) {
    return context.redirect('/admin?err=' + encodeURIComponent('Email and 8+ char password required.'));
  }

  const admin = createSupabaseAdmin();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (cErr || !created.user) return context.redirect('/admin?err=' + encodeURIComponent(cErr?.message ?? 'Create failed.'));

  const { error: pErr } = await admin.from('profiles').insert({ id: created.user.id, role, full_name: fullName || null });
  if (pErr) { await admin.auth.admin.deleteUser(created.user.id); return context.redirect('/admin?err=' + encodeURIComponent(pErr.message)); }

  return context.redirect('/admin?ok=' + encodeURIComponent(`${role} login created for ${email}.`));
};
