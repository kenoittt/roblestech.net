import type { APIRoute } from 'astro';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const id = String(form.get('id') ?? '');
  if (!id) return context.redirect('/admin/clients?err=' + encodeURIComponent('Missing client.'));
  return gateChange(context, 'client_delete', { id, __reason: form.get('reason') ?? '' }, '/admin/clients');
};
