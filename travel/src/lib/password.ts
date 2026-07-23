/*
 * Password strength policy — enforced server-side on signup and change, and
 * mirrored client-side for live feedback. Requires length + variety and
 * rejects the obvious weak choices.
 */
const COMMON = ['password', 'passw0rd', '12345678', '123456789', '1234567890', 'qwerty', 'qwertyui', 'letmein', 'iloveyou', 'admin123', 'welcome1', 'wanderwise'];

export const PASSWORD_RULE = 'At least 10 characters with a mix of upper- and lower-case letters, a number, and a symbol.';

export function checkPassword(pw: string, email = ''): { ok: boolean; message?: string } {
  if (!pw || pw.length < 10) return { ok: false, message: 'Password must be at least 10 characters.' };
  if (pw.length > 128) return { ok: false, message: 'Password is too long (max 128).' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3) return { ok: false, message: 'Use at least three of: lower-case, upper-case, number, symbol.' };
  const low = pw.toLowerCase();
  if (COMMON.some((c) => low.includes(c))) return { ok: false, message: 'That password is too common — pick something less guessable.' };
  const local = email.split('@')[0]?.toLowerCase();
  if (local && local.length >= 3 && low.includes(local)) return { ok: false, message: "Don't include your email name in the password." };
  if (/^(.)\1+$/.test(pw)) return { ok: false, message: 'Password cannot be a single repeated character.' };
  return { ok: true };
}

/** 0–4 score for a client-side meter (rough, UI only). */
export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  s += Math.max(0, classes - 1);
  return Math.min(4, s);
}
