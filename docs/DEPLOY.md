# Deploying the new PPM

How the new PPM (this Next.js app) replaces the Astro PPM at **ppm.roblestech.net**, for Kenneth, for Kenneth's Claude, and for anyone helping. Written 2026-10-03, after Kenneth gave the go-ahead; the plan is to switch in a day and give the team accounts straight away.

## In one page

- **What happens:** this app goes into the `ppm/` folder of the website repository, the existing Vercel project builds it, and the shared database gets eight updates that only add things. The address stays the same; the portal, WanderWise and the public site don't change.
- **How long:** one day. First Claude makes two fixes (about 2 to 3 hours). Then the switch, with Kenneth (about an hour). Then everyone gets their account.
- **Who:** Claude writes the code and types the commands. Kenneth owns the accounts (GitHub, Vercel, Supabase, Microsoft 365), approves every step that touches the live database, and merges. Kyan hands over the code and tries the result.
- **How hard:** mostly settings and copy-paste commands. The one delicate part is the database, because the client portal uses it too. Three things protect it: a backup, a dry run that is undone straight after, and Vercel's Instant Rollback, which brings the old PPM back in one click.

## Is it ready?

Yes, after two fixes (Step 1). Every screen works and has been tested on a local copy: 23 end-to-end checks (`npm run test:smoke`), a check that opens every menu and dialog on every screen as three roles (`npm run test:menus`), and a scripted walkthrough of the demo. It hasn't yet run on real hosting (Vercel, the hosted database and Microsoft 365 email together); the checks in Step 3 cover that.

## Choose a path: keep the current database, or start fresh

| | **A. Keep the current database** (recommended) | **B. Start fresh** |
|---|---|---|
| Current PPM tasks, projects, history | Carried over | Left behind |
| Handbook articles | Carried over | Copied back by hand, if wanted |
| The team's accounts | Carried over: same email, same password | Everyone is invited again |
| Risk to the portal | Low: the updates only add things, and the portal was checked | None: the PPM moves to its own database |
| Steps | Step 1, Step 2, Step 3A | Step 1, Step 2, Step 3B |

## Step 1: two fixes first (Claude, about 2 to 3 hours)

Details are in [backlog.md](backlog.md):
1. **Invitation and password-reset emails** (item 1). Without it, nobody new can be invited. The database's email templates are shared with the portal, so the PPM must send these two emails itself.
2. **The "Chosen people" selector** (item 2).
3. **One decision for Kyan** (item 3): should admins be able to sign off in someone's place?

Then `npm run test:smoke` and `npm run test:menus` must pass, and the fixes go into the code before Step 2.

## Step 2: put the code into the website repository (Claude)

The app sits in Kyan's local folder `RTC-PPM/` for now. It goes straight into the website repository, replacing `ppm/`, through a pull request.

1. **Get the code.** If Kyan can push to the website repository, he does Step 2 himself. If not, he makes a clean copy, `git -C RTC-PPM archive -o rtc-ppm.zip HEAD`, which holds the tracked files only (no keys, no build folders), and sends it to Kenneth.
2. **On a new branch** of the website repository:
   ```bash
   git switch -c ppm-nextjs
   git rm -r -q ppm && mkdir ppm
   git -C <path to RTC-PPM> archive HEAD | tar -x -C ppm   # or: unzip rtc-ppm.zip -d ppm
   git add ppm && git commit -m "PPM: replace the Astro app with the Next.js app"
   git push -u origin ppm-nextjs
   ```
3. **Open a pull request.** Don't merge yet: that's Step 3A.7 or 3B.7. Pushing straight to `main` would put the new app live at once, before the database has its updates, and it would break.

Vercel builds a preview of the branch. It may show errors until the database has its updates (Step 3): that's expected. Don't send the team to it.

No other repository is needed: the code goes straight into the website repository. `RTC-PPM`'s own history (about fifty commits that explain each step) stays in Kyan's folder.

## Step 3A: the switch, keeping the current database (Kenneth with Claude, about an hour)

1. **Tell the team** the PPM will pause for a few minutes. The address stays the same.
2. **Back up.**
   - The whole database: the dashboard's backups if the plan includes them, and a copy with the Supabase CLI, following Supabase's guide "Backup and restore using the CLI" (roles, schema and data). Check the guide's commands are current.
   - The handbook on its own: in Supabase, Table Editor, export `kb_articles`, `kb_categories` and `kb_topics` as CSV.
   - Keep both privately, never in the repository: they hold personal data and internal content.
3. **Dry run, five minutes.** Run the eight updates inside a transaction, then undo it. This tests them against the real data and changes nothing:
   ```bash
   cd ppm
   { echo "begin;"; cat supabase/migrations/20261002000[2-9]00_*.sql; echo "rollback;"; } > /tmp/dry-run.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f /tmp/dry-run.sql
   ```
   `DATABASE_URL` is the database's connection string (Supabase, Connect), with the password from Kenneth, passed as a setting and never printed. It must end with `ROLLBACK` and no `ERROR`. If there's an error, stop and look at it; nothing has changed. Without psql, paste the file's contents into Supabase's SQL Editor and run it. Tables are locked for the few seconds it runs, so pick a quiet moment.
4. **Apply the updates.** The CLI records them, so future updates know where things stand:
   ```bash
   npx supabase link --project-ref <the live project's ref>
   npx supabase migration repair --status applied 20261002000100
   npx supabase db push --dry-run    # must list exactly eight files, 20261002000200 to 20261002000900
   npx supabase db push
   ```
   The first file is a copy of the live schema, which is already there; `repair` marks it as applied. Then open the old PPM: it still works.
5. **Supabase Auth,** URL Configuration: add `https://ppm.roblestech.net/**` to the Redirect URLs. Leave the Site URL and the email templates alone: the portal depends on them.
6. **Vercel,** the PPM project, Settings, Environment Variables, for **Production**:

   | Setting | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | The live project's, the same values the Astro PPM uses (its setting names may differ) |
   | `NEXT_PUBLIC_APP_URL` | `https://ppm.roblestech.net` |
   | `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_FROM` | The Astro PPM's Microsoft 365 values |
   | `CRON_SECRET` | A new random value, for example from `openssl rand -hex 32`. Vercel sends it to the 8 AM reminder route by itself |

   Never set `NEXT_PUBLIC_DEMO_MODE` or `MAIL_DEV_URL` in production. Keep the Astro PPM's settings for a week: rolling back needs them.
7. **Merge the pull request.** Vercel builds the new PPM for ppm.roblestech.net. Under Settings, Build and Deployment, the framework should read Next.js and Node 24.x. (Every Vercel project in the repository rebuilds on a push to `main`; the portal and WanderWise rebuild from unchanged code.)
8. **Check, about ten minutes:**
   - Sign in. Open every screen. Create a task and finish it.
   - Invite an address you own: the email arrives from Microsoft 365, the link opens the PPM, a password can be set.
   - Sign in to the **portal** and open its account page, since it shares the database.
9. **Give everyone their accounts** (see "Accounts for the team").
10. **The next morning,** the 8 AM email arrives (Vercel, the project, Logs, filtered to `/api/cron/reminders`).

## Step 3B: start fresh (only if Kenneth chooses it)

> **WARNING: starting fresh leaves the current PPM behind.** Its tasks, projects, comments, history and handbook articles do not come along, and everyone needs a new account, by invitation. These steps don't delete anything; they just stop using it. If anyone later removes the old PPM's tables, that is permanent.
>
> **Never delete the live Supabase project itself.** The client portal and its clients' accounts live there too.

1. **Back up the handbook** (Step 3A.2) if you want any articles back.
2. **Create a database for the PPM alone:** a new Supabase project, for example `rtc-ppm`, in Singapore (`ap-southeast-1`).
3. **Build it:**
   ```bash
   npx supabase link --project-ref <the new project's ref>
   npx supabase db push --dry-run    # must list all nine files, 20261002000100 to 20261002000900
   npx supabase db push
   ```
   Never add `--include-seed`: `supabase/seed.sql` is sample data for local use.
4. **Supabase Auth,** URL Configuration, in the new project: Site URL `https://ppm.roblestech.net`; Redirect URLs `https://ppm.roblestech.net/**`.
5. **The first super admin.** Nobody can invite anyone yet, so Kenneth's account is made by hand. In Authentication, Users, Add user, Create new user: his email and a password, with "Auto Confirm User" on. Then in the SQL Editor:
   ```sql
   insert into public.profiles (id, role, full_name, email)
   select id, 'super_admin', 'Kenneth Robles', email from auth.users where email = '<Kenneth''s email>';
   ```
   Nothing creates a profile automatically; the app's invitations do it for everyone else.
6. **Vercel settings** as in Step 3A.6, with the new project's three Supabase values.
7. **Merge and check** as in Steps 3A.7 and 3A.8. The portal isn't affected: it stays on the live project.
8. **Invite everyone** (see "Accounts for the team"), then put back any handbook articles you want.

Later, the old PPM's tables in the live project can stay; they're harmless. Removing them is permanent: back up first, and remove only the old PPM's own tables (names starting with `ppm_` and `kb_`), never `profiles` or anything the portal uses.

## Accounts for the team

**Keeping the current database:** everyone who uses the PPM today keeps their account, with the same email, password and role. Portal clients can't open the PPM: their role is "client".

**New people:** People, Invite: name, email and role. They get an email from the company's Microsoft 365 address, choose a password, and land on Home. This needs the Step 1 email fix and the Microsoft 365 settings.

**The roles:**
- **Super admin:** everything, including making admins.
- **Admin:** manages people (staff), projects and all work.
- **Staff:** creates, assigns and finishes tasks, plans their calendar, and manages the projects they own.

**Forgotten password:** an admin sends a reset from People, in the person's menu. **Someone leaving:** Deactivate keeps their history, and their open work can be handed to someone else in the same step.

Kenneth's Claude turns this into a one-page guide for Kenneth ([backlog.md](backlog.md), item 4).

## The handbook

- **Keeping the current database:** Kenneth's handbook articles carry over and show in the new Handbook straight away; they use the same tables.
- **The drafts:** [handbook-drafts/](handbook-drafts/) has six how-to articles written during the build: Assigning work, Keyboard shortcuts, Planning your day on the calendar, Private tasks, What each status means, and Who can mark a task done.
- **Kenneth's Claude** turns them into a short, step-by-step set on a "Using the PPM" shelf (make the shelf in the Handbook's Shelves if it isn't there), checked against the app first, and keeps Kenneth's articles ([backlog.md](backlog.md), item 5).

## If something goes wrong

- **The app misbehaves:** in Vercel, the PPM project, Deployments, open the last Astro deployment and choose **Instant Rollback**. The old PPM works with the updated database, so this is safe. Tasks the new app moved to statuses the old one doesn't know (Backlog, In review) may look odd there until you switch back. Then fix and redeploy.
- **The dry run shows an error:** stop. Nothing changed. Read the error and fix it before going on.
- **An update fails during `db push`:** stop. Each file is applied on its own, so the earlier ones stay, and the old PPM keeps working with them. Fix the cause, then push again.
- **Data is damaged** (not expected): restore the Step 3A backup. That loses anything changed after it, so it's the last resort.

## Rules for Claude, helping Kenneth

- Read this file, [backlog.md](backlog.md) and `README.md` first. Work on a branch and open a pull request; Kenneth merges.
- Before any command that changes a hosted project (`db push`, `migration repair`, SQL that writes, settings), show Kenneth the exact command and which project it targets, and wait for his yes.
- Never delete a Supabase project, a table or data unless Kenneth asks for that exact thing, after a backup.
- Never run `supabase db reset` or anything with `--include-seed` against a hosted project.
- Never print keys, the database password or the contents of `.env` files. Pass them as settings.
- Don't change the live project's Site URL or email templates, and don't touch `portal/`, `travel/` or the public site's files.
- The repository is public: no keys, backups or personal data in commits.

## After the switch

- Delete the backup copies once you're sure they aren't needed, or move them somewhere private and safe.
- After a week, remove the Astro PPM's old settings in Vercel.
- What's next is in [backlog.md](backlog.md).
