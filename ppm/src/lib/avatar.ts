/*
 * Profile pictures. `profiles.avatar_url` holds a path inside the private
 * 'avatars' storage bucket — never a public URL — so images are always served
 * through /api/avatar/<user-id>, which is same-origin (the CSP allows only
 * 'self' for images) and session-checked.
 */

/** Avatar URL for a user, versioned by filename so a new photo busts the cache. */
export const avatarSrc = (id: string, path: string | null | undefined): string | null =>
  path ? `/api/avatar/${id}?v=${encodeURIComponent(path.split('/').pop() || '1')}` : null;

/** Up to two initials, from a name or else the local part of an email. */
export function initials(name?: string | null, email?: string | null): string {
  const src = (name && name.trim()) || (email ? email.split('@')[0].replace(/[._-]+/g, ' ') : '');
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable colour per user, so people without a photo are still distinguishable. */
export function tint(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 52% 40%)`;
}

/** What we accept as a profile picture, and the extension we store it under. */
export const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
