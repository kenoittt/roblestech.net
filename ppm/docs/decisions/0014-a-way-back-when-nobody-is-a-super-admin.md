# 0014. A way back when nobody is a super admin

- **Status:** decided; nothing to build
- **When:** 2026-10-07
- **Who:** Kenneth (backlog item 12)

## Context

Only a super admin can make another. If the live database ever has none (a role changed by mistake, people leaving), nobody can fix it from the app.

## Decision

Nothing new in the app. Whoever holds the Supabase login sets one role back to `super_admin` in Supabase: in the Table Editor, or with the one-line update in the [2026-10-04 report](../reports/2026-10-04-session-report.md#how-to-confirm-and-fix-it-kenneth), which their Claude can run with their yes. The steps are in [giving the team accounts](../for-humans/giving-the-team-accounts.md#if-nobody-is-a-super-admin).

## Why

There are three super admins, so the PPM losing all of them should be rare. Two other ways were weighed:

- **A one-time setup link in the PPM**, working only while there's no super admin and only with a secret kept in Vercel. It works without Supabase, but it's a new way into admin rights that has to be built, guarded and tested as every role.
- **A recovery command** for Kenneth's Claude to run. No new way in, but still Kenneth's Supabase login, so it adds little over the Table Editor.

Fixing it where the account lives needs no new code and opens no new door. Kenneth first chose the link the same day, then chose this with the three ways side by side.

## What it means for you

If you're ever locked out of People, follow [giving the team accounts](../for-humans/giving-the-team-accounts.md#if-nobody-is-a-super-admin).
