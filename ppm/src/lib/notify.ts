import { createSupabaseAdmin } from './supabase';
import { sendMail, notifyHtml } from './email';
import { APP_URL } from './env';

type Admin = ReturnType<typeof createSupabaseAdmin>;

/**
 * Email a PPM user about their work — unless they've switched notifications off
 * on their account page (profiles.email_opt_out). Every notification in the app
 * goes through here so the opt-out is honoured in one place.
 * Best-effort: never throws, so a mail failure can't fail the request.
 */
export async function notifyUser(
  admin: Admin,
  uid: string | null | undefined,
  subject: string,
  title: string,
  lines: string[]
): Promise<boolean> {
  if (!uid) return false;
  try {
    const { data } = await admin.from('profiles').select('email_opt_out').eq('id', uid).maybeSingle();
    if ((data as { email_opt_out: boolean | null } | null)?.email_opt_out) return false;
    const { data: u } = await admin.auth.admin.getUserById(uid);
    const email = u?.user?.email;
    if (!email) return false;
    return await sendMail(email, subject, notifyHtml(title, lines, `${APP_URL}/`));
  } catch {
    return false;
  }
}
