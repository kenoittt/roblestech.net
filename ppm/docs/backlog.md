# Backlog

What's left to do on the PPM, newest decisions first within each part. Tick items off with the date, and keep the detail: the next person or Claude session starts from here.

## From Kyan's brief of 2026-10-04

The brief and what was done with it: [briefs/2026-10-04-kyan-voice-brief.md](briefs/2026-10-04-kyan-voice-brief.md), [reports/2026-10-04-session-report.md](reports/2026-10-04-session-report.md). Branch `kyan/feat/ppm-templates-and-archive`.

### 9. Kenneth: check your role on the live PPM (blocks making Kyan a super admin)

Role changes were refused because the live database almost certainly doesn't have Kenneth as a super admin; the code is right (report, Task 1). Look at the bottom-left of the sidebar: your role is under your name. If it says Admin: Christian can change it from People, if Christian is a super admin; otherwise it takes one line of SQL, given in the report, run by Kenneth.

### 10. Kenneth: apply two database updates, then merge

`20261004000100_project_archive_and_delete.sql` and `20261004000200_templates.sql`, before merging the branch: see `DEPLOY.md`, "Database updates after the switch". Then check archive, restore and delete on a test project, and save and use a template.

### 11. A decision for Kyan: the "Chosen people" chip

Its amber border warns before anything is wrong, and amber means time and risk elsewhere in the app. Recommended (report, "The Chosen people orange border"): open the people picker as soon as the rule is chosen, keep the chip neutral, and show an error at the chip only if someone tries to create the task without choosing anyone.

### 12. A decision for Kenneth: a way back if nobody is a super admin

If the live database has no super admin, nobody can make one from the app; it takes SQL. A safe way back (a one-time setup link, say) is a security decision, so it waits for Kenneth.

### 13. A decision: may a project's owner delete it while it has no tasks?

Today owners archive and only admins delete, as the revamp decided. Allowing owners to delete a project that's still empty would cover the "I made a test project" case without an admin. One database rule and one line in the app.

### 14. The Handbook: templates and archiving projects

Two short articles for the "Using the PPM" shelf: "Templates for work you repeat" and "Archiving or deleting a project", checked against the app.

### 15. Templates, if the team asks

- Add a block to every weekday of the week at once (the Monday-morning planning case).
- A task template that also blocks time for the task. Only works when the task is yours, which is why it waited.

### 16. Kenneth: the branch-name pattern

`git-conventions.md` proposes `<owner>/<type>/<app>-<topic>`. Adopting it repository-wide is one line in the shared `CLAUDE.md`.

## Before going live

### 1. Invitation and password-reset emails must send themselves (blocks inviting people)

**Done 2026-10-03 (Kenneth's Claude).** Invite, Resend invite and Send password reset use `generateLink` and send through `sendMail`. With no email settings they refuse up front; a failed invitation email removes the new account again. Resending to someone who already set a password returns `email_exists`, and the app suggests a reset instead. `npm run test:smoke` passes 23/23.

**Why:** Supabase project A has one set of email templates and one Site URL, shared by the PPM and the client portal. The portal's "forgot password" relies on Supabase's standard link (it exchanges a `code` at `/reset`). This app expects a different link (`/auth/confirm?token_hash=…&type=…`). Changing the shared templates for the PPM would break the portal's resets; leaving them means the PPM's invitations and resets fail. Found 2026-10-03 while writing `DEPLOY.md`, by reading the portal's code.

**The fix:** the PPM sends these two emails itself, through the Microsoft 365 setup it already uses for notifications, and leaves Supabase's templates alone. In `src/domains/people/actions.ts`:
- `inviteMember` and `resendInvite`: replace `admin.auth.admin.inviteUserByEmail(...)` with `admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name } } })`. It creates the account and returns `data.properties.hashed_token` without sending anything. Keep the profile upsert as it is: nothing else creates a profile row.
- `sendPasswordReset`: replace `admin.auth.resetPasswordForEmail(...)` with `admin.auth.admin.generateLink({ type: "recovery", email })`.
- Build the link as `${APP_URL}/auth/confirm?token_hash=${hashed_token}&type=invite&next=/welcome` (or `type=recovery`). `src/app/auth/confirm/route.ts` already accepts it.
- Send it with `sendMail` and `emailLayout` from `src/lib/email.ts`, reusing the wording of `supabase/templates/invite.html` and `recovery.html`. Locally it lands in the mail catcher; in production it goes through Microsoft 365.
- Check what `generateLink` does when resending to someone already invited, and show a clear message if it refuses.
- `npm run test:smoke` must still pass: it follows the invitation email through to setting a password.

### 2. Choosing the people for "Chosen people" (reported by Kyan, 2026-10-03)

**Done 2026-10-03 (Kenneth's Claude).** Reproduced: the create dialog could save "Chosen people" with nobody chosen, and the panel saved the rule with an empty list. The create dialog now shows a people picker for that rule and won't create the task until someone is chosen; the panel saves the rule only with the first person and won't remove the last one. Checked in a browser; `test:smoke` 23/23 and `test:menus` clean.

When a task's sign-off is set to "Chosen people", there's no way to pick who they are. Wanted: a selector for the people allowed to sign off, wherever "Chosen people" can be chosen, and the rule can't be saved without at least one person. Documented as Kyan asked, not reproduced yet. A hint from the build: the task panel shows a "Signed off by" picker once the rule is set; the create dialog (`src/domains/tasks/components/create-task-dialog.tsx`) has none.

### 3. A decision for Kyan: admins signing off in someone's place

**Decided 2026-10-03 by Kenneth: keep it.** Admins can sign off in someone's place; nothing changes.

Admins can mark any task done in place of the person its rule names, so a reviewer on leave doesn't block the team. The button says "Sign off as admin", a toast names whose sign-off it replaced, and the history records it. This came from the build, not from a decision. Keep it, or make admins follow the rule like everyone else: one line in the database function `ppm_can_complete` (and `canComplete` in `src/domains/tasks/config.ts`).

## Soon after going live (tasks for Kenneth's Claude)

### 4. A one-page guide for Kenneth: giving the team accounts

Once invitations work (item 1), write Kenneth a short guide: who already has an account, how to invite someone (People, Invite), what the three roles allow, what the invited person sees, and how to send a password reset. `DEPLOY.md`, "Accounts for the team", has the facts.

### 5. A concise, step-by-step Handbook

`docs/handbook-drafts/` holds six how-to articles written during the build. Turn them into a short, instructional set on the Handbook's "Using the PPM" shelf: one task per article, numbered steps, checked against the app (some features came after the drafts). Keep the articles Kenneth already has.

## Goals (not started)

### 6. Fill this knowledge base (Kyan, 2026-10-03)

**Started 2026-10-04:** `briefs/`, `reports/` and `git-conventions.md`. The 2026-10-04 report ends with what a session without the private notes most needed: design rules (colour meanings, states, form validation, which component for what), a permissions table, production facts, a decisions log and how the team uses the PPM day to day.

So that anyone, a person or a Claude session, can keep building at the same quality. Record what mattered in making the PPM:
- **Decisions and why:** the framework, the database rules, sign-off, privacy, what was ruled out.
- **Design:** the references (Linear's dashboard, Amir Baghian's shots, aceframe.pro, the design guide Kyan used), the rules (dark first, more blue and less green, no gradients, emojis, cards inside cards, pills or illustrations), density, motion after Emil Kowalski, the tokens in `src/app/globals.css`.
- **How it's built:** the folders, data flow, live updates, the database's role in rules and history.
- **Limitations and known gaps,** with their reasons.
- **The steps taken and the lessons:** what broke and how it was caught (for example, menus that crashed their screen, found by a walkthrough, now covered by `npm run test:menus`).
- **Testing:** what each test covers and when to run it.

Good sources: the git history (the commit messages explain each step), `README.md`, `DEPLOY.md`, this backlog. Kyan's own planning notes are kept privately; copy from them only with his OK, since this repository is public.

### 7. A consistent, scalable folder structure (Kyan, 2026-10-03)

Domain-driven all the way: each domain holds its own types, constants, data access, hooks, contexts and components in the same layout, so every number and rule has one source of truth; shared pieces live in one place; no barrel files (index files that re-export a folder: they slow builds and blur imports); the single global stylesheet stays. Today each domain mixes loose files with inconsistent names (`tasks/config.ts`, `workspace/types.ts`, `calendar/layout.ts`, data hooks in `data.ts`) beside `components/`.

### 8. From earlier

- Make type errors block pull requests.
- Check that Vercel's plan allows commercial use.
