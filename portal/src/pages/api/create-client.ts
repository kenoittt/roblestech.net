import type { APIRoute } from 'astro';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const name = String(form.get('name') ?? '').trim();
  if (!name) return context.redirect('/admin?err=' + encodeURIComponent('Client name is required.'));
  return gateChange(
    context,
    'client_create',
    { name, gsc_property: String(form.get('gsc_property') ?? '').trim(), __reason: form.get('reason') ?? '' },
    '/admin/clients'
  );
};
