# Deploying the new PPM

How the new PPM (this Next.js app) replaces the Astro PPM at **ppm.roblestech.net**, step by step, for Kenneth, for Kenneth's Claude, and for anyone helping. Written 2026-10-03, after Kenneth gave the go-ahead.

The short version: the new app moves into the `ppm/` folder of the website repository, the existing Vercel project builds it, and the shared Supabase database gets eight additive updates. Nothing else changes: the address, the portal, WanderWise and the public site stay as they are. It happens in three stages, with a rehearsal on a copy first and a one-click way back.

## Is it ready?

**Ready for the team, with two fixes first.** Every screen works and has been tested on a local copy: 23 end-to-end checks (`npm run test:smoke`), a check that opens every menu and dialog on every screen as three roles (`npm run test:menus`), and a scripted walkthrough of the demo.

**Not tested yet on real hosting:** Vercel, the hosted Supabase project and Microsoft 365 email together. Stage 2 does that before anyone relies on it.

## Who does what

| Who | Part |
|---|---|
| Kenneth | Owns the accounts: GitHub, Vercel, Supabase, Microsoft 365. Approves each step that touches the live database, merges the pull request |
| Kenneth's Claude | Makes the repository changes and runs the commands, with Kenneth watching (see "Rules for Claude" at the end) |
| Kyan | Hands over the code, tests the rehearsal, decides go or no-go with Kenneth |

## What changes where

| Place | Change |
|---|---|
| GitHub, the website repository | `ppm/` is replaced by this app, through a pull request |
| Vercel, the PPM project | The framework becomes Next.js (`vercel.json` sets it), nine settings are added, and the PR's preview points at a rehearsal database |
| Supabase project A (shared by the PPM and the portal) | A backup, then eight migrations, `20261002000200` to `20261002000900`. They only add: new columns, tables, rules and triggers. The old PPM keeps working on them, which is what makes rolling back safe. One Auth setting: an allowed redirect address |
| DNS, Microsoft 365, the portal, WanderWise, the public site | Nothing. Pushing to `main` rebuilds the portal and WanderWise too (every Vercel project in the repo builds on every push), from unchanged code |

## Stage 1: before anything goes live

### 1.1 Invitations and password resets (must fix)

Supabase project A has **one** set of email templates and one Site URL, shared by the PPM and the portal. The portal's "forgot password" uses Supabase's standard link (it exchanges a `code` at `/reset`). This app expects a different link (`/auth/confirm?token_hash=…&type=…`). Changing the shared templates for the PPM would break the portal's resets, and leaving them as they are means the PPM's invitations and resets fail.

**The fix:** the PPM sends these two emails itself, through the Microsoft 365 setup it already uses for notifications, and leaves Supabase's templates alone.

For Claude, in `src/domains/people/actions.ts`:
- `inviteMember` and `resendInvite`: replace `admin.auth.admin.inviteUserByEmail(...)` with `admin.auth.admin.generateLink({ type: "invite", email, options: { data: { full_name } } })`. It creates the account and returns `data.properties.hashed_token` without sending anything. Keep the profile upsert as it is.
- `sendPasswordReset`: replace `admin.auth.resetPasswordForEmail(...)` with `admin.auth.admin.generateLink({ type: "recovery", email })`.
- Build the link as `${APP_URL}/auth/confirm?token_hash=${hashed_token}&type=invite&next=/welcome` (or `type=recovery`). `src/app/auth/confirm/route.ts` already accepts it.
- Send it with `sendMail` and `emailLayout` from `src/lib/email.ts`, reusing the wording of `supabase/templates/invite.html` and `recovery.html`. Locally it lands in the mail catcher; in production it goes through Microsoft 365.
- Check how `generateLink` behaves when resending to someone already invited, and show a clear message if it refuses.
- `npm run test:smoke` must still pass: it follows the invitation email through to setting a password.

### 1.2 Choosing the people for "Chosen people" (should fix)

Reported by Kyan: when a task's sign-off is set to "Chosen people", there's no way to pick who they are. Expected: a selector for the people allowed to sign off, wherever "Chosen people" can be chosen, and the rule shouldn't be saved without at least one person. A hint from the build: the task panel shows a "Signed off by" picker once the rule is set, but the create dialog has none.

### 1.3 One decision for Kyan

Admins can currently mark any task done in place of the person its rule names; the button says "Sign off as admin" and the history records it. Keep it, or make admins follow the rule like everyone else (one line in the database function `ppm_can_complete`).

### 1.4 Hand over the code

The app lives in Kyan's local repository, `RTC-PPM/`, with its own history. To keep that history and give Kenneth's Claude a copy:
1. On GitHub, create an empty **private** repository (for example `rtc-ppm`).
2. In `RTC-PPM/`: `git remote add origin <its address>`, then `git push -u origin main`.

`.env.local` (local keys), `node_modules`, `.next` and `test-results` are excluded by `.gitignore`; nothing secret is in the history.

## Stage 2: a rehearsal on a copy

The aim: the new app on real hosting, against a copy of the live database, before production is touched. It catches anything the local tests can't, like a migration meeting real data or email through Microsoft 365.

1. **A staging database.** In Supabase, create a project (the free plan is enough) in Singapore, `ap-southeast-1`, like project A.
2. **Copy project A into it.** Follow Supabase's guide "Backup and restore using the CLI" (supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore): it dumps roles, schema and data from project A (reading only) and restores them into the new project. Check the guide's commands are current before running them. The dump files hold personal data: keep them off the repository and delete them after Stage 3.
3. **Apply the migrations to staging.** From the new app's folder:
   - `npx supabase link --project-ref <staging ref>`
   - `npx supabase migration repair --status applied 20261002000100` marks the first file as already there: it's a copy of the live schema, which the restore brought.
   - `npx supabase db push --dry-run` must list exactly eight files, `20261002000200` to `20261002000900`. If it lists anything else, stop.
   - `npx supabase db push`
4. **The pull request.** In the website repository, on a new branch:
   - `git rm -r -q ppm && mkdir ppm`
   - `git -C <path to RTC-PPM> archive HEAD | tar -x -C ppm` copies the tracked files only, so no keys and no build folders.
   - `git add ppm`, commit, push, and open a pull request. Vercel builds a preview of the PPM from it.
5. **Point the preview at staging.** In Vercel, the PPM project, Settings, Environment Variables, for the **Preview** environment only, add the settings below with the staging project's Supabase values. Then redeploy the preview: values starting with `NEXT_PUBLIC_` are fixed when the app is built. If teammates can't open the preview, look at Settings, Deployment Protection.
6. **Test it together** (an afternoon, or a few days of real use):
   - Sign in with your usual accounts (the copy brought them, passwords included).
   - Create, assign, comment, send for sign-off, finish; switch list, board and calendar; a repeating task.
   - Invite a test address you own: the email arrives from Microsoft 365, the link opens the PPM, a password can be set. Then a password reset.
   - The calendar, the handbook (your articles should be there), People, Projects, live updates in two windows.
7. **Go or no-go**, Kyan and Kenneth.

Emails sent during the rehearsal are real: the copy has real addresses. Tell the team first.

## Stage 3: the switch (one sitting, about an hour, at a quiet time)

1. **Tell the team** the PPM will pause for a few minutes. The address stays the same.
2. **Back up project A.** Use the dashboard's backups if the plan includes them, and take the same CLI dump as in Stage 2. Keep both privately.
3. **Apply the migrations to project A,** exactly as in Stage 2, step 3, but linked to project A. Show Kenneth the dry run first. The old PPM keeps working afterwards; open it to confirm.
4. **Supabase Auth,** URL Configuration: add `https://ppm.roblestech.net/**` to the Redirect URLs. Leave the Site URL and the email templates alone: the portal depends on them.
5. **Vercel production settings,** the PPM project, for **Production**:

   | Setting | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Project A's, the same values the live PPM uses (its setting names may differ) |
   | `NEXT_PUBLIC_APP_URL` | `https://ppm.roblestech.net` |
   | `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_FROM` | The live PPM's Microsoft 365 values |
   | `CRON_SECRET` | A new random value, for example from `openssl rand -hex 32`. Vercel sends it to the 8 AM reminder route by itself |

   Never set `NEXT_PUBLIC_DEMO_MODE` or `MAIL_DEV_URL` in production. Keep the old app's settings until a week after the switch: rolling back needs them.
6. **Merge the pull request.** Vercel builds the new PPM for ppm.roblestech.net. Under Settings, Build and Deployment, the framework should read Next.js and Node 24.x.
7. **Check, about ten minutes:**
   - Sign in; open every screen; create a task and finish it.
   - Invite a test address.
   - Sign in to the **portal** and open its account page, since it shares the database.
8. **The next morning,** the 8 AM email arrives (Vercel, the project, Logs, filtered to `/api/cron/reminders`).

## If something goes wrong

- **The app misbehaves:** in Vercel, the PPM project, Deployments, open the last Astro deployment and choose **Instant Rollback**. The old PPM works with the updated database, so this is safe; tasks the new app moved to statuses the old one doesn't know (Backlog, In review) may look odd there until you switch back. Then fix and redeploy.
- **A migration fails:** stop. Each file runs on its own, so the earlier ones stay and the old app keeps working with them. Read the error, fix on staging first, then retry.
- **Data is damaged** (not expected): restore the Stage 3 backup. That loses anything changed after it, so it's the last resort.

## Rules for Claude, helping Kenneth

- Read this file and `README.md` first. Work on a branch and open a pull request; Kenneth merges.
- Before any command that changes a hosted project (`db push`, `migration repair`, settings), show Kenneth the exact command and which project it targets, and wait for his yes.
- Never run `supabase db reset` or anything with `--include-seed` against a hosted project. `supabase/seed.sql` is sample data for local use only.
- Never print keys, the database password or the contents of `.env` files. Pass them through environment variables.
- Don't change Supabase's Site URL or email templates, and don't touch `portal/`, `travel/` or the public site's files.
- The repository is public: no keys, dumps or personal data in commits.

## After the switch

- Delete the staging project and the dump files.
- After a week, remove the old Astro-only settings in Vercel.
- Planned next: a folder-structure refactor, and checking that Vercel's plan allows commercial use.
