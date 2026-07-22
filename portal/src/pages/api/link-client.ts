import type { APIRoute } from 'astro';
import { gateChange } from '../../lib/approvals';

export const prerender = false;

// Link (enable) or unlink (disable) a client login to a company.
export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const userId = String(form.get('user_id') ?? '');
  if (!userId) return context.redirect('/admin?err=' + encodeURIComponent('Missing user.'));
  return gateChange(
    context,
    'link_client',
    { user_id: userId, client_id: String(form.get('client_id') ?? '') || null, __reason: form.get('reason') ?? '' },
    '/admin'
  );
};
