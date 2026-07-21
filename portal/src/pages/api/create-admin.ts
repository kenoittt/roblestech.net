import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

// Admin-only: create another RTC admin login (role 'admin', no client link).
export const POST: APIRoute = async (context) => {
  const { profile } = await getSession(context);
  if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const fullName = String(form.get('full_name') ?? '').trim();

  if (!email || password.length < 8) {
    return context.redirect(
      '/admin?err=' + encodeURIComponent('Email and a password of at least 8 characters are required.')
    );
  }

  const admin = createSupabaseAdmin();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return context.redirect('/admin?err=' + encodeURIComponent(createErr?.message ?? 'Could not create user.'));
  }

  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'admin',
    full_name: fullName || null,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return context.redirect('/admin?err=' + encodeURIComponent(profErr.message));
  }

  return context.redirect('/admin?ok=' + encodeURIComponent(`Admin login created for ${email}.`));
};
