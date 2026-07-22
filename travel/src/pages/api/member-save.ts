import type { APIRoute } from 'astro';
import { createSupabaseServer, createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

/*
 * Trip sharing (FR-USR-02): owner invites by email as editor/viewer, changes
 * roles, removes people; a member may leave. Membership writes run under the
 * session so RLS (members_write / members_leave) is the enforcement point —
 * the admin client is used only to resolve an email to a user id and never
 * to write.
 */
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const tripId = String(form.get('trip_id') ?? '');
  const op = String(form.get('op') ?? 'add');
  const back = `/trips/${tripId}`;
  if (!tripId) return context.redirect('/trips');
  const fail = (msg: string) => context.redirect(back + '?err=' + encodeURIComponent(msg));
  const done = (msg: string) => context.redirect(back + '?ok=' + encodeURIComponent(msg));

  if (op === 'leave') {
    const { error } = await supabase.from('trip_members').delete()
      .eq('trip_id', tripId).eq('user_id', user.id);
    if (error) return fail(error.message);
    return context.redirect('/trips?ok=' + encodeURIComponent('You left the trip.'));
  }

  if (op === 'remove') {
    const uid = String(form.get('user_id') ?? '');
    if (!uid) return fail('Missing member.');
    const { error } = await supabase.from('trip_members').delete()
      .eq('trip_id', tripId).eq('user_id', uid);
    return error ? fail(error.message) : done('Member removed.');
  }

  if (op === 'role') {
    const uid = String(form.get('user_id') ?? '');
    const role = String(form.get('role') ?? '');
    if (!uid || !['editor', 'viewer'].includes(role)) return fail('Invalid role.');
    const { error } = await supabase.from('trip_members').update({ role })
      .eq('trip_id', tripId).eq('user_id', uid);
    return error ? fail(error.message) : done('Role updated.');
  }

  // op === 'add' — invite by email
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const role = ['editor', 'viewer'].includes(String(form.get('role'))) ? String(form.get('role')) : 'editor';
  if (!email || !email.includes('@')) return fail('Enter a valid email.');

  const admin = createSupabaseAdmin();
  const { data: person } = await admin.from('profiles').select('id,display_name')
    .ilike('email', email).maybeSingle();
  if (!person) return fail(`No WanderWise account for ${email} yet — ask them to sign up first (free), then invite again.`);
  if (person.id === user.id) return fail('That is you — you are already on this trip.');

  const { error } = await supabase.from('trip_members')
    .upsert({ trip_id: tripId, user_id: person.id, role }, { onConflict: 'trip_id,user_id' });
  if (error) return fail(error.code === '42501' || /security/i.test(error.message)
    ? 'Only the trip owner can invite people.' : error.message);
  return done(`${person.display_name || email} added as ${role}.`);
};
