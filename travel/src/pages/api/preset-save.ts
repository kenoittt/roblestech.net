import type { APIRoute } from 'astro';
import { createSupabaseServer } from '../../lib/supabase';
import { STARTERS } from '../../lib/checklist-starters';

export const prerender = false;

// Manage reusable checklist presets. RLS gates every write to the owner.
export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServer(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return context.redirect('/login');

  const form = await context.request.formData();
  const op = String(form.get('op') ?? '');
  const back = '/checklists';
  const fail = (m: string) => context.redirect(back + '?err=' + encodeURIComponent(m));

  if (op === 'create') {
    const name = String(form.get('name') ?? '').trim().slice(0, 80);
    if (!name) return fail('Give the checklist a name.');
    const { error } = await supabase.from('checklist_presets').insert({ user_id: user.id, name });
    return error ? fail(error.message) : context.redirect(back);
  }

  if (op === 'clone-starter') {
    const key = String(form.get('key') ?? '');
    const starter = STARTERS.find((s) => s.key === key);
    if (!starter) return fail('Unknown template.');
    const { data: preset, error } = await supabase.from('checklist_presets')
      .insert({ user_id: user.id, name: starter.name }).select('id').single();
    if (error || !preset) return fail(error?.message ?? 'Could not create checklist.');
    await supabase.from('checklist_preset_items').insert(
      starter.items.map((item, i) => ({ preset_id: (preset as any).id, item, position: i }))
    );
    return context.redirect(back);
  }

  if (op === 'rename') {
    const id = String(form.get('id') ?? '');
    const name = String(form.get('name') ?? '').trim().slice(0, 80);
    if (!id || !name) return fail('Name required.');
    await supabase.from('checklist_presets').update({ name }).eq('id', id);
    return context.redirect(back);
  }

  if (op === 'delete') {
    const id = String(form.get('id') ?? '');
    if (id) await supabase.from('checklist_presets').delete().eq('id', id);
    return context.redirect(back);
  }

  if (op === 'add-item') {
    const preset_id = String(form.get('preset_id') ?? '');
    const item = String(form.get('item') ?? '').trim().slice(0, 200);
    if (!preset_id || !item) return context.redirect(back);
    await supabase.from('checklist_preset_items').insert({ preset_id, item });
    return context.redirect(back);
  }

  if (op === 'del-item') {
    const id = String(form.get('id') ?? '');
    if (id) await supabase.from('checklist_preset_items').delete().eq('id', id);
    return context.redirect(back);
  }

  return context.redirect(back);
};
