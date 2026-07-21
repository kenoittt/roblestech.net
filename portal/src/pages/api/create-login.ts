import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: create a client login and link it to a client company.
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const fullName = String(form.get('full_name') ?? '').trim();

  if (!clientId || !email || password.length < 8) {
    return context.redirect(
      '/admin?err=' + encodeURIComponent('Client, email, and a password of at least 8 characters are required.')
    );
  }

  const admin = createSupabaseAdmin();

  // Create the auth user (email pre-confirmed — no verification email needed).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return context.redirect('/admin?err=' + encodeURIComponent(createErr?.message ?? 'Could not create user.'));
  }

  // Link the user to the client with the 'client' role.
  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id,
    client_id: clientId,
    role: 'client',
    full_name: fullName || null,
  });
  if (profErr) {
    // Roll back the orphaned auth user so the admin can retry cleanly.
    await admin.auth.admin.deleteUser(created.user.id);
    return context.redirect('/admin?err=' + encodeURIComponent(profErr.message));
  }

  return context.redirect('/admin?ok=' + encodeURIComponent(`Login created for ${email}.`));
};
