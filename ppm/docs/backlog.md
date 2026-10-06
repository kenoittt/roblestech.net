# Backlog

What's left to do on the PPM, newest decisions first within each part. Tick items off with the date, and keep the detail: the next person or Claude session starts from here.

## From Kyan's brief of 2026-10-06, evening

Built 2026-10-07 by Kyan's local Claude, on the branch `kyan/feat/ppm-templates-and-calendar`, which also carries the docs from the closed pull request #18. Two of the changes need database updates applied before the merge ([`for-humans/kenneth.md`](../../docs/for-humans/kenneth.md), item 1). Smoke test 35/35.

### 20. Make templates where tasks and time are planned

**Done 2026-10-07.** A **Save as template** switch in the new-task dialog and in Plan time saves a template and makes nothing else; Settings, Templates has New and Edit; the arrow beside Plan time has New template…; a task's ⋯, Save as template…, opens the same dialog, filled in. Why and what was ruled out: [decision 0012](decisions/0012-templates-are-made-where-work-is-made.md).

### 21. Plan time's split button looked like two buttons

**Done 2026-10-07.** The arrow was 2 px taller than the button, with a dark seam and a light edge between them. It's now one shape with one hairline; the pattern is `splitButton()` in `src/components/app/split-button.tsx` ([design system](guides/design-system.md#components-which-one-for-what)).

### 22. Finishing a task ticks off its time blocks

**Done 2026-10-07; needs migration `20261007000100` on the live database.** When a task is done, its blocks that aren't ticked off are, whoever finished it; reopening the task unticks exactly those. Ticking a block off by itself once its time passes still works: you might work on a task without finishing it.

### 23. Copy my plan, the way each person likes it

**Done 2026-10-07.** The arrow beside Copy my plan: a message before and after, which parts show (the title line, times, task codes, tasks due), and how finished entries look (as they are, struck out, with ✓, with DONE), with a preview. Saved in each person's preferences. It copies rich text too, so Teams keeps the strikethrough.

### 24. Crowded days and hours on the calendars

**Done 2026-10-07.** The month view shows as many tasks as a day has room for, open ones first, and "N more" lists the rest; weeks no longer spill into each other. In the day and week view, entries share a column only while each stays readable, and the rest fold into a "+N" that lists them and opens any one. A day's extra due tasks open the same way.

### 25. A new task from Plan time

**Done 2026-10-07.** In "For a task", type a name and choose New task: it's made for you when the block is saved, already linked.

### 26. The person page's month view

**Done 2026-10-07**, with item 24: the dates drifted away from their cells, and the out-of-month shading landed a row too low, because the cells were taller than their rows.

### 27. Colours for time blocks

**Done 2026-10-07; needs migration `20261007000200` on the live database.** Blue, teal, purple, pink or slate, beside a block's title; templates keep them. Green, amber, red and orange are left out, since they mean done, time and risk, errors and urgent; meetings keep their violet.

### 28. The calendar runs all day, and blocks cross midnight

**Done 2026-10-07.** The day runs from 12 AM to midnight and opens just before the current time (8 AM on other weeks). A block can end the next day ("1 AM · next day" in To) or days later ("Ends on"), and each day shows its own piece, with its title kept in view. Pieces that cross midnight change in their details, not by dragging.

### 31. Search in the filter menu's longer lists

New, 2026-10-07 (found while looking for lists that show everyone, item 17). The Filter menu lists every person and project with no search; fine for a team of ten, slow for a hundred. Add a search field to a category once it has more than about eight options.

## From Kyan, 2026-10-06

### 17. A people picker that scales, for meetings

**Done 2026-10-07.** Meeting guests and project members are chosen with `PeoplePicker` (`src/domains/people/components/people-picker.tsx`): the field shows who's chosen as photos and names, with a searchable list behind it. The other places that list people already search (the assignee, reviewer and sign-off pickers, ⌘K); the Filter menu doesn't yet (item 31).

The Plan time dialog lists every teammate as a chip to invite to a meeting. That works for a few people, and fails for many, or for long names. Replace it with a searchable multi-select that shows photos and names, like the picker for "Chosen people" (`PickerMenu` with `multiple`), and look for any other place that lists everyone at once. The principle is in [`guides/ux-principles.md`](guides/ux-principles.md#scale).

### 18. Templates don't work on the live PPM (reported by Kyan)

Kyan found that templates didn't work after the 2026-10-04 merge. First check item 10: the two database updates may not be on the live database ([`for-humans/kenneth.md`](../../docs/for-humans/kenneth.md), item 1).

**Checked 2026-10-07 (Kyan's Claude), as far as possible without the live database:** templates work end to end locally, on a fresh copy of every migration (the smoke test's template checks pass). The only local problem was missing sample templates, because that database was seeded before templates existed. So the code is very likely fine, and the cause is almost certainly the missing database update. Only Kenneth's `db push --dry-run` can confirm it. Until it's applied, the app now says "Templates aren't available yet: the database needs an update first" instead of showing an empty list.

### 19. A made-up client name in sample data and placeholders

The local sample data (`supabase/seed.sql`) and two input hints ("For example, Promix Nutrition", in the project form and the import dialog) use a real client's name. The name was already public through the portal's history, but sample data shouldn't name real clients: swap in an invented one. Found 2026-10-06; small.

## From Kyan's brief of 2026-10-04

The brief and what was done with it: [raw/2026-10-04-kyan-voice-brief.md](raw/2026-10-04-kyan-voice-brief.md), [reports/2026-10-04-session-report.md](reports/2026-10-04-session-report.md). Branch `kyan/feat/ppm-templates-and-archive`.

### 9. Kenneth: check your role on the live PPM (blocks making Kyan a super admin)

Role changes were refused because the live database almost certainly doesn't have Kenneth as a super admin; the code is right (report, Task 1). Look at the bottom-left of the sidebar: your role is under your name. If it says Admin: Christian can change it from People, if Christian is a super admin; otherwise it takes one line of SQL, given in the report, run by Kenneth.

### 10. Kenneth: apply two database updates, then merge

**Not confirmed as of 2026-10-06.** The branch was merged on 2026-10-04; whether the updates went in first hasn't been checked. See item 18 and [`for-humans/kenneth.md`](../../docs/for-humans/kenneth.md), item 1.

`20261004000100_project_archive_and_delete.sql` and `20261004000200_templates.sql`, before merging the branch: see `DEPLOY.md`, "Database updates after the switch". Then check archive, restore and delete on a test project, and save and use a template.

### 11. A decision for Kyan: the "Chosen people" chip

Its amber border warns before anything is wrong, and amber means time and risk elsewhere in the app. Recommended (report, "The Chosen people orange border"): open the people picker as soon as the rule is chosen, keep the chip neutral, and show an error at the chip only if someone tries to create the task without choosing anyone.

### 12. A decision for Kenneth: a way back if nobody is a super admin

If the live database has no super admin, nobody can make one from the app; it takes SQL. A safe way back (a one-time setup link, say) is a security decision, so it waits for Kenneth.

### 13. A decision: may a project's owner delete it while it has no tasks?

Today owners archive and only admins delete, as the revamp decided. Allowing owners to delete a project that's still empty would cover the "I made a test project" case without an admin. One database rule and one line in the app.

### 14. The Handbook: templates and archiving projects

Two short articles for the "Using the PPM" shelf: "Templates for work you repeat" and "Archiving or deleting a project", checked against the app. The templates article should describe the 2026-10-07 flow: Save as template in the new-task dialog and Plan time, and Edit in Settings (item 20).

### 15. Templates, if the team asks

- Add a block to every weekday of the week at once (the Monday-morning planning case).
- A task template that also blocks time for the task. Only works when the task is yours, which is why it waited.

### 16. Kenneth: the branch-name pattern

The repository's [`docs/git-conventions.md`](../../docs/git-conventions.md) proposes `<owner>/<type>/<app>-<topic>`. Adopting it repository-wide is one line in the shared `CLAUDE.md`.

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

**Done 2026-10-03 (Kenneth's Claude):** now [`for-humans/giving-the-team-accounts.md`](for-humans/giving-the-team-accounts.md).

Once invitations work (item 1), write Kenneth a short guide: who already has an account, how to invite someone (People, Invite), what the three roles allow, what the invited person sees, and how to send a password reset. `DEPLOY.md`, "Accounts for the team", has the facts.

### 5. A concise, step-by-step Handbook

**Done 2026-10-03 (Kenneth's Claude):** seven articles on the "Using the PPM" shelf, published by migration `20261003000100`. Edit them in the app from now on.

`docs/handbook-drafts/` holds six how-to articles written during the build. Turn them into a short, instructional set on the Handbook's "Using the PPM" shelf: one task per article, numbered steps, checked against the app (some features came after the drafts). Keep the articles Kenneth already has.

## Goals

### 6. Fill this knowledge base (Kyan, 2026-10-03)

**Shaped and filled 2026-10-06** (Kyan's local Claude): [`index.md`](index.md), [`log.md`](log.md), the guides (design system, UX principles, architecture, database with a permissions table, testing, workflow, limitations), ten decisions, people, `for-humans/`, references, and the repository-wide `docs/` (how we work, commit style, the knowledge-base conventions). **Still to add:** how the team uses the PPM day to day (what each person does in it each morning, what Christian and Kenneth check), which needs the team's input.

**Started 2026-10-04:** `briefs/` (now `raw/`), `reports/` and `git-conventions.md` (now in the repository's `docs/`). The 2026-10-04 report ends with what a session without the private notes most needed: design rules (colour meanings, states, form validation, which component for what), a permissions table, production facts, a decisions log and how the team uses the PPM day to day.

So that anyone, a person or a Claude session, can keep building at the same quality. Record what mattered in making the PPM:
- **Decisions and why:** the framework, the database rules, sign-off, privacy, what was ruled out.
- **Design:** the references (Linear's dashboard, Amir Baghian's shots, aceframe.pro, the design guide Kyan used), the rules (dark first, more blue and less green, no gradients, emojis, cards inside cards, pills or illustrations), density, motion after Emil Kowalski, the tokens in `src/app/globals.css`.
- **How it's built:** the folders, data flow, live updates, the database's role in rules and history.
- **Limitations and known gaps,** with their reasons.
- **The steps taken and the lessons:** what broke and how it was caught (for example, menus that crashed their screen, found by a walkthrough, now covered by `npm run test:menus`).
- **Testing:** what each test covers and when to run it.

Good sources: the git history (the commit messages explain each step), `README.md`, `DEPLOY.md`, this backlog. Kyan's own planning notes are kept privately; copy from them only with his OK, since this repository is public.

### 7. A consistent, scalable folder structure (Kyan, 2026-10-03)

**Decided 2026-10-06:** domain-driven design, with one shape for every domain ([0011](decisions/0011-domain-driven-folders.md)). The refactor itself is still to do.

Domain-driven all the way: each domain holds its own types, constants, data access, hooks, contexts and components in the same layout, so every number and rule has one source of truth; shared pieces live in one place; no barrel files (index files that re-export a folder: they slow builds and blur imports); the single global stylesheet stays. Today each domain mixes loose files with inconsistent names (`tasks/config.ts`, `workspace/types.ts`, `calendar/layout.ts`, data hooks in `data.ts`) beside `components/`.

### 29. Read a Handbook article while you work (Kenneth, 2026-10-06)

Kenneth's idea: keep one Handbook article open while browsing the rest of the PPM, to follow a procedure while working through your tasks. Most useful for the "Using the PPM" articles. Worth its own design pass: a side panel like the task panel, a floating reader, or a pinned article. Not started.

### 30. A Gantt chart view (Kyan, 2026-10-06)

Projects and tasks on a timeline, with their dates and how they overlap. Kyan: it "deserves a specific session", since a good Gantt chart is hard to get right (dragging, dependencies, scale from a week to a year). The tasks already have start and due dates. Not started.

### 8. From earlier

- Make type errors block pull requests.
- Check that Vercel's plan allows commercial use.
