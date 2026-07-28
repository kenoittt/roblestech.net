import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';
import { AVATAR_TYPES, AVATAR_MAX_BYTES } from '../../lib/avatar';

export const prerender = false;

/*
 * Your own name and profile picture. This is a self-service change, not an
 * admin one, so it applies straight away — it never goes through the
 * super-admin approval queue. Pictures live in the private 'avatars' bucket at
 * <user-id>/<timestamp>.<ext> and the previous file is deleted.
 */
export const POST: APIRoute = async (context) => {
  const { user } = await getSession(context);
  if (!user) return context.redirect('/login');

  const to = (key: 'ok' | 'err', msg: string) =>
    context.redirect('/account?' + key + '=' + encodeURIComponent(msg));

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return to('err', 'That upload looked wrong — please try again.');
  }

  const remove = String(form.get('remove') ?? '') === '1';
  const file = form.get('avatar');

  const admin = createSupabaseAdmin();
  const { data: cur } = await admin.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
  const prev = (cur as { avatar_url: string | null } | null)?.avatar_url ?? null;

  // Only fields that were submitted are changed — the "remove photo" form posts
  // nothing but the flag, and must not blank the display name.
  const patch: Record<string, unknown> = {};
  if (form.has('full_name')) patch.full_name = String(form.get('full_name') ?? '').trim() || null;
  let note = 'Profile saved.';

  if (remove) {
    patch.avatar_url = null;
    if (prev) await admin.storage.from('avatars').remove([prev]);
    note = 'Profile picture removed.';
  } else if (file instanceof File && file.size > 0) {
    const ext = AVATAR_TYPES[file.type];
    if (!ext) return to('err', 'A profile picture must be a JPEG, PNG, WebP or GIF.');
    if (file.size > AVATAR_MAX_BYTES) return to('err', 'A profile picture must be 2 MB or smaller.');

    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) return to('err', upErr.message);

    patch.avatar_url = path;
    if (prev && prev !== path) await admin.storage.from('avatars').remove([prev]);
    note = 'Profile picture updated.';
  }

  if (Object.keys(patch).length === 0) return to('ok', 'Nothing to change.');
  const { error } = await admin.from('profiles').update(patch).eq('id', user.id);
  if (error) return to('err', error.message);

  return to('ok', note);
};
