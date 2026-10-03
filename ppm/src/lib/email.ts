import "server-only"
import { APP_URL } from "@/lib/env"

// One way to send email, three ways it travels:
// - production: Microsoft Graph, as the live PPM does (MS_TENANT_ID, MS_CLIENT_ID,
//   MS_CLIENT_SECRET, MAIL_FROM: an Entra app with the Mail.Send permission);
// - local: the Supabase stack's mail catcher (MAIL_DEV_URL), so nothing leaves the machine;
// - neither set: nothing is sent, and the app works without email.

const graph = {
  tenant: process.env.MS_TENANT_ID,
  client: process.env.MS_CLIENT_ID,
  secret: process.env.MS_CLIENT_SECRET,
  from: process.env.MAIL_FROM,
}
const devUrl = process.env.MAIL_DEV_URL

export function emailConfigured() {
  return Boolean((graph.tenant && graph.client && graph.secret && graph.from) || devUrl)
}

async function graphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${graph.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: graph.client!,
      client_secret: graph.secret!,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  })
  if (!res.ok) throw new Error(`Graph token failed: ${res.status}`)
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error("Graph returned no token")
  return json.access_token
}

export async function sendMail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  if (graph.tenant && graph.client && graph.secret && graph.from) {
    const token = await graphToken()
    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graph.from)}/sendMail`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: { subject, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }] },
        saveToSentItems: false,
      }),
    })
    if (!res.ok) throw new Error(`Graph sendMail failed: ${res.status}`)
    return true
  }
  if (devUrl) {
    const res = await fetch(`${devUrl}/api/v1/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        From: { Email: "ppm@roblestech.net", Name: "RTC PPM" },
        To: [{ Email: to }],
        Subject: subject,
        HTML: html,
        Text: text,
      }),
    })
    return res.ok
  }
  return false
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * The one email layout: a short heading, a few lines, one button. Every value
 * is escaped (the live PPM's emails weren't: issue S-05).
 */
export function emailLayout({
  heading,
  lines,
  button,
  path,
  footer,
}: {
  heading: string
  lines: string[]
  button: string
  path: string
  footer?: string
}) {
  const url = `${APP_URL}${path}`
  const body = lines
    .map((l) => `<p style="font-size:14px;line-height:22px;margin:0 0 10px;color:#4a515e;">${escape(l)}</p>`)
    .join("")
  const html = `<div style="font-family:-apple-system,'Segoe UI',Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#11141a;">
  <p style="font-size:13px;color:#737a88;margin:0 0 24px;">Robles Technologies Corp. · PPM</p>
  <h1 style="font-size:18px;font-weight:600;line-height:26px;margin:0 0 12px;">${escape(heading)}</h1>
  ${body}
  <a href="${url}" style="display:inline-block;margin-top:12px;background:#0464dd;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 16px;border-radius:6px;">${escape(button)}</a>
  <p style="font-size:12px;line-height:18px;color:#a4aab4;margin:32px 0 0;">${escape(footer ?? "You get these because you're on the RTC team. Turn them off in Settings, under Notifications.")}</p>
</div>`
  const text = [heading, "", ...lines, "", `${button}: ${url}`].join("\n")
  return { html, text }
}
