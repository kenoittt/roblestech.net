import type { APIRoute } from 'astro';
import { sendMail, emailConfigured, notifyHtml } from '../../lib/email';
import { pick, APP_URL } from '../../lib/env';

export const prerender = false;

/*
 * Email diagnostic. Protected by CRON_SECRET.
 *   ?key=SECRET            -> reports whether email is configured
 *   ?key=SECRET&to=addr    -> also attempts a real test send to `addr`
 */
export const GET: APIRoute = async (context) => {
  const secret = pick('CRON_SECRET');
  const key = context.url.searchParams.get('key') ?? '';
  if (!secret || key !== secret) return new Response('Unauthorized', { status: 401 });

  const configured = emailConfigured();
  const to = context.url.searchParams.get('to');
  const result: Record<string, unknown> = { emailConfigured: configured, mailFrom: pick('MAIL_FROM') || '(not set)' };

  if (to) {
    if (!configured) {
      result.sent = false;
      result.note = 'Email is not configured — set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, MAIL_FROM in Vercel and redeploy.';
    } else {
      try {
        await sendMail(to, 'PPM email test', notifyHtml('It works', ['This is a test from Robles Tech PPM.'], `${APP_URL}/`));
        result.sent = true;
      } catch (e) {
        result.sent = false;
        result.error = String(e);
      }
    }
  }

  return new Response(JSON.stringify(result, null, 2), { headers: { 'content-type': 'application/json' } });
};
