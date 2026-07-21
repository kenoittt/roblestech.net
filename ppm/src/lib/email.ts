/*
 * Sends email via Microsoft Graph using client-credentials (app-only) auth.
 * Requires an Entra app registration with the Mail.Send application permission
 * (admin-consented) and a sending mailbox (MAIL_FROM).
 * If credentials are absent it no-ops, so the app runs before email is set up.
 */
import { pick } from './env';

const TENANT = pick('MS_TENANT_ID');
const CLIENT_ID = pick('MS_CLIENT_ID');
const CLIENT_SECRET = pick('MS_CLIENT_SECRET');
const MAIL_FROM = pick('MAIL_FROM');

export const emailConfigured = () => !!(TENANT && CLIENT_ID && CLIENT_SECRET && MAIL_FROM);

async function graphToken(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Graph token failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error('No Graph access_token');
  return j.access_token;
}

/** Send an HTML email. Returns true if sent, false if email isn't configured. */
export async function sendMail(to: string | string[], subject: string, html: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const recipients = (Array.isArray(to) ? to : [to])
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
  if (recipients.length === 0) return false;

  const token = await graphToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_FROM)}/sendMail`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: recipients,
        },
        saveToSentItems: false,
      }),
    }
  );
  if (!res.ok) throw new Error(`Graph sendMail failed: ${res.status} ${await res.text()}`);
  return true;
}

/** Small helper for consistent notification wrapping. */
export function notifyHtml(title: string, bodyLines: string[], linkUrl: string): string {
  const lines = bodyLines.map((l) => `<p style="margin:0 0 10px;color:#33405c;font-size:15px;">${l}</p>`).join('');
  return `<div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:520px;margin:0 auto;">
    <div style="background:#032C7C;padding:18px 24px;border-radius:12px 12px 0 0;">
      <span style="color:#fff;font-weight:800;font-size:16px;">Robles Tech · PPM</span>
    </div>
    <div style="border:1px solid #e6e9f0;border-top:0;border-radius:0 0 12px 12px;padding:24px;">
      <h2 style="margin:0 0 14px;color:#032C7C;font-size:19px;">${title}</h2>
      ${lines}
      <a href="${linkUrl}" style="display:inline-block;margin-top:12px;background:#0464DD;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:8px;">Open PPM →</a>
    </div>
  </div>`;
}
