# 0014. A way back when nobody is a super admin

- **Status:** decided; its design comes next
- **When:** 2026-10-07
- **Who:** Kenneth (backlog item 12)

## Context

Only a super admin can make another. If the live database ever has none (a role changed by mistake, people leaving), nobody can fix it from the app: today it takes SQL on the live project, written out in the [2026-10-04 report](../reports/2026-10-04-session-report.md#how-to-confirm-and-fix-it-kenneth).

## Decision

Build a one-time setup link that makes one super admin, and only while there is none.

## Why

Getting back in shouldn't depend on someone with SQL access to the live project. Kenneth chose the link over keeping SQL, knowing there are three super admins today.

## What the design has to answer

The link is a way past the role rules, so before it's built:

- It works only while the database has no active super admin, checked by the database at the moment it's used, and stops working by itself once there is one.
- It needs a secret only Kenneth sets (an environment variable in Vercel, say), compared in constant time, and never in the repository.
- It makes the signed-in person a super admin: an existing, active PPM account, never a new one.
- Every use is recorded where admins see it, and repeated attempts are slowed down.
- It's tested as every role, as the repository's rules ask for anything touching roles.
