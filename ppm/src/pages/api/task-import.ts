import type { APIRoute } from 'astro';
import { getSession, canUsePpm } from '../../lib/auth';
import { createSupabaseAdmin } from '../../lib/supabase';

export const prerender = false;

/** Minimal CSV parser: handles quoted fields, commas/newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export const POST: APIRoute = async (context) => {
  const { user, profile } = await getSession(context);
  if (!user || !canUsePpm(profile)) return new Response('Forbidden', { status: 403 });

  const form = await context.request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return context.redirect('/?err=' + encodeURIComponent('Please choose a CSV file.'));
  }

  const rows = parseCsv(await file.text())
    .filter((r) => r.length && !(r[0] ?? '').trim().startsWith('#') && r.some((c) => c.trim() !== ''));
  if (rows.length < 2) return context.redirect('/?err=' + encodeURIComponent('CSV has no data rows.'));

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iTitle = col('title'), iDesc = col('description'), iEmail = col('assignee_email'),
    iPrio = col('priority'), iDue = col('due_date'), iProj = col('project');
  if (iTitle < 0) return context.redirect('/?err=' + encodeURIComponent('CSV must have a "title" column.'));

  const admin = createSupabaseAdmin();

  // email -> user id
  const emailToId = new Map<string, string>();
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of list?.users ?? []) if (u.email) emailToId.set(u.email.toLowerCase(), u.id);

  // project name -> id (create missing)
  const nameToProj = new Map<string, string>();
  const { data: projs } = await admin.from('ppm_projects').select('id, name');
  for (const p of (projs as { id: string; name: string }[]) ?? []) nameToProj.set(p.name.trim().toLowerCase(), p.id);

  const valid = new Set(['low', 'medium', 'high']);
  let created = 0; const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const title = (cells[iTitle] ?? '').trim();
    if (!title) continue;

    let assignee_id: string | null = null;
    if (iEmail >= 0) {
      const em = (cells[iEmail] ?? '').trim().toLowerCase();
      if (em) {
        assignee_id = emailToId.get(em) ?? null;
        if (!assignee_id) errors.push(`Row ${r + 1}: "${em}" is not a PPM member (task created unassigned)`);
      }
    }

    let project_id: string | null = null;
    if (iProj >= 0) {
      const pn = (cells[iProj] ?? '').trim();
      if (pn) {
        const keyp = pn.toLowerCase();
        if (nameToProj.has(keyp)) project_id = nameToProj.get(keyp)!;
        else {
          const { data: np } = await admin.from('ppm_projects').insert({ name: pn, created_by: user.id }).select('id').single();
          if (np) { project_id = (np as { id: string }).id; nameToProj.set(keyp, project_id); }
        }
      }
    }

    const prio = valid.has((cells[iPrio] ?? '').trim().toLowerCase()) ? (cells[iPrio] ?? '').trim().toLowerCase() : 'medium';
    const dueRaw = iDue >= 0 ? (cells[iDue] ?? '').trim() : '';
    const due_date = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
    const description = iDesc >= 0 ? ((cells[iDesc] ?? '').trim() || null) : null;

    const { data: task, error } = await admin.from('ppm_tasks')
      .insert({ title, description, assignee_id, priority: prio, due_date, project_id, created_by: user.id })
      .select('id').single();
    if (error || !task) { errors.push(`Row ${r + 1}: ${error?.message ?? 'insert failed'}`); continue; }
    await admin.from('ppm_task_events').insert({ task_id: (task as { id: string }).id, actor_id: user.id, type: 'created', to_status: 'todo', meta: { via: 'csv_import' } });
    created++;
  }

  const msg = `Imported ${created} task${created === 1 ? '' : 's'}.` + (errors.length ? ` ${errors.length} note(s): ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '…' : ''}` : '');
  return context.redirect('/?ok=' + encodeURIComponent(msg));
};
