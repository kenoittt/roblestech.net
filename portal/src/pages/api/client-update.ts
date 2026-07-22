import type { APIRoute } from 'astro';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  const name = String(form.get('name') ?? '').trim();
  if (!id || !name) return context.redirect('/admin/clients?err=' + encodeURIComponent('Name is required.'));
  return gateChange(
    context,
    'client_update',
    { id, name, gsc_property: String(form.get('gsc_property') ?? '').trim(), __reason: form.get('reason') ?? '' },
    '/admin/clients'
  );
};
