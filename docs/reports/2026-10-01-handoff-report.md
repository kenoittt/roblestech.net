# Handoff report: the 2026-09-30 brief

For Kyan, from Kenneth's Claude session. It covers the nine tasks in the brief, worked from 2026-09-30 to 2026-10-01 (Manila). Every change went through its own pull request, and Kenneth merged each one.

## Summary

| # | Task | Status | Pull request |
|---|---|---|---|
| 1 | Node.js for the Vercel apps | Done, on **24.x** (see below) | [#1](https://github.com/kenoittt/roblestech.net/pull/1) |
| 2 | Shared `CLAUDE.md` and `docs/` | Done | [#2](https://github.com/kenoittt/roblestech.net/pull/2) |
| 3 | Check on every pull request | Done. The branch rule on `main` is still to do (Kenneth) | [#3](https://github.com/kenoittt/roblestech.net/pull/3) |
| 4 | Portal sign-in bug | Done | [#4](https://github.com/kenoittt/roblestech.net/pull/4) |
| 5 | Reminder emails at 8 AM Manila | Done | [#5](https://github.com/kenoittt/roblestech.net/pull/5) |
| 6 | Only super admins create PPM admins | Done | [#6](https://github.com/kenoittt/roblestech.net/pull/6) |
| 7 | CSV import results on the Tasks page | Done | [#7](https://github.com/kenoittt/roblestech.net/pull/7) |
| 8 | Astro 7 for the PPM, portal and site | Done, one pull request per app | [#8](https://github.com/kenoittt/roblestech.net/pull/8), [#9](https://github.com/kenoittt/roblestech.net/pull/9), [#10](https://github.com/kenoittt/roblestech.net/pull/10) |
| 9 | This report | This pull request | |

WanderWise was only touched by task 1's `engines` line and task 3's check, as the brief asked.

## Kenneth's answers

- **Kyan's GitHub account:** `kyan-nocedal`. Tagged on every pull request.
- **Node.js in the Vercel dashboards:** all three projects already showed **24.x**, not 20. Kenneth asked for 24, so task 1 set `"engines": { "node": "24.x" }` rather than 22.
- **Vercel plan:** Hobby.
- **Supabase region:** Singapore.
- **About page card (task 8):** remove it.

## How the testing worked

Previews use the production database, and the PPM can't delete accounts or projects. So most checks ran locally, against a small mock of Supabase Auth, PostgREST and Storage written for this work. The mock serves sample rows and records every write: accounts it would create, passwords it would set, rows it would insert. Nothing was sent to the real database and no emails went out. The mock scripts aren't committed. Each pull request describes what was run and shows the results.

For task 8, each app's real build output (the Vercel function in `.vercel/output`) ran locally, for both `main` and the branch, and the two were compared:

- status codes and redirects;
- visible text, using Appendix D's script;
- security headers;
- database calls;
- headless-browser screenshots at 1280 px and 390 px.

## Task by task

### 1. Node.js: done

- **Files:** `ppm/package.json`, `portal/package.json` and `travel/package.json`, each with `"engines": { "node": "24.x" }`.
- **Verified:** builds pass on Node 24. All three production deployments were Ready after the merge, and each sign-in page loaded.
- **Surprising:** `@astrojs/vercel` 8 writes the `nodejs22.x` function runtime even when building on Node 24. It warns that the local Node version isn't supported. So the functions kept running on 22 until task 8.
  - The PPM and portal functions now target `nodejs24.x` (adapter 11).
  - WanderWise builds on 24 but its function still says `nodejs22.x`, because it stays on adapter 8.
- **Couldn't verify:** a PPM sign-in on production. That needs Kenneth's own login.

### 2. `CLAUDE.md` and `docs/`: done

- **Files:** `CLAUDE.md` (Appendix A, word for word), and `.gitignore`, which gains `docs/private/`.
- **Verified:** `git check-ignore` confirms `docs/private/` is ignored.

### 3. Check on every pull request: done

- **Files:**
  - `.github/workflows/checks.yml` (Appendix E, with Node 24 for all four apps).
  - `@astrojs/check` and `typescript` as dev dependencies in each app's `package.json` and lockfile.
- **Verified:** it has passed on every pull request since #3.
- **Type errors when the check was added:** 80 (site), 7 (PPM), 4 (portal) and 12 (WanderWise). Now: 6, 5, 2 and 12.
  - The site's 80 counted the other apps' files, which the old root `tsconfig.json` included. Task 8's root config excludes them.
- **Surprising:** TypeScript 6 and 7 are out, but `@astrojs/check` 0.9 only accepts `^5 || ^6`. The check uses 5.9.3.
- **Still to do (Kenneth):** a branch rule on `main` that requires a pull request and the four checks (Public site, PPM, Portal, WanderWise). When last checked, the GitHub API said `main` wasn't protected.

### 4. Portal sign-in bug: done

- **Files:** `portal/src/lib/supabase.ts`.
- **The bug:** one request builds several Supabase clients: middleware, `getSession()` and the page itself. Once the access token has expired, the first client refreshes it. The later ones read only the incoming Cookie header, so they tried the same refresh token again.
  - Supabase rotates refresh tokens, so the second attempt failed with "Already Used".
  - The library then cleared the session cookie, and the next click went to `/login`.
- **The fix:** the PPM's approach from `c5b1881`. The cookies written during a request are recorded in a `WeakMap` keyed on the `Request`, and later clients on that request read them first. The cookie security settings are unchanged.
- **Verified:** locally, with a mock that rotates refresh tokens and rejects reused ones. The test sent `/dashboard` an expired session, then a second click.

  | | Refreshes | Next click |
  |---|---|---|
  | `main` | 2, one failed | sent to `/login` |
  | Fix | 1 | still signed in |

- **Couldn't verify:** a real hour-long wait on production.
- **Not touched, as asked:** `travel/src/lib/supabase.ts` (WanderWise) has the same single-client pattern, so it has the same bug. Port the fix when WanderWise wakes up.

### 5. Reminder emails at 8 AM Manila: done

- **Files:** `ppm/vercel.json`, where the schedule `0 13 * * *` becomes `0 0 * * *`.
- **Verified:** `due-reminders.ts` uses UTC dates. On Hobby the job can start at any minute of 00:00 to 00:59 UTC. I checked every minute of that hour for every day of 2026: "today" and "tomorrow" in UTC matched Manila's every time.
- **Couldn't verify:** a real run. The job emails real people, so it wasn't triggered. The first run after the merge is on 2026-10-01 between 08:00 and 08:59 Manila.

### 6. Who can create PPM admins: done

- **Files:** `ppm/src/pages/api/create-staff.ts`, `ppm/src/pages/api/reset-user-password.ts` and `ppm/src/pages/admin/index.astro`.
- **What changed:**
  - Creating the role `admin` needs a super admin.
  - Setting the password of an admin or a super admin needs a super admin.
  - The page only offers what the viewer can do. The API routes enforce the rule either way.
- **Verified:** locally, calling the routes directly as super admin, admin and staff against every kind of target. The mock recorded which accounts and passwords would have been written.
  - On `main`, an admin could create an admin and reset another admin's password.
  - Now only a super admin can. Staff get 403, as before.
- **Side effect:** an admin can no longer use "Set password" on their own row. They use the account page, as before.
- **Couldn't verify:** each role on the preview, because creating test admins there can't be undone.

### 7. CSV import results: done

- **Files:** `ppm/src/pages/api/task-import.ts`. The four redirects go to `/tasks` instead of `/`.
- **Verified:** locally with five files: a small import, an unknown assignee email, no "title" column, a header only, and an empty file. Each message now shows on the Tasks page; on `main`, none did.
- **For the preview:** the pull request lists three test files (Kenneth has them). They use no project and no assignee, so they leave nothing behind.
- **Left for later, as asked:** the import can assign tasks to client accounts, and it saves one row at a time.

### 8. Astro 7: done (PPM, portal, public site)

All three are on Astro 7.3.5 with Vite 8.3.1.
- The PPM and portal use `@astrojs/vercel` 11; their functions run on `nodejs24.x`.
- The site uses `@astrojs/react` 7, so `npm ls vite` at the root shows one version.
- Changes A to E went in as the brief describes. The root `tsconfig.json` went in with the PPM (#8).

**What was checked, by app:**

- **PPM (#8)**
  - 60 requests (12 pages × 5 roles) had identical statuses and redirects.
  - 88 screenshot pairs showed no visible differences.
  - Creating, moving and deleting a task, and the handbook's "Was this article helpful?", behave as on `main`.
  - Security headers are identical. Type errors went from 7 to 5.
- **Portal (#9)**
  - 80 requests (16 pages × 5 roles) were identical, and so was their visible text.
  - `/demo` and a client's `/d` are byte-for-byte identical.
  - Sign-in, forgot password, and a role request followed by approval behave as on `main`. Type errors went from 4 to 2.
- **Public site (#10)**
  - Appendix D: 23 pages compared, 0 differ.
  - The same 5 React islands.
  - In the 46 screenshot pairs, only `/about` differs (see below). Type errors went from 16 to 6.
  - After the merge, the GitHub Pages deploy succeeded. The live site has the same stylesheet hash, and its About page shows the two cards.

**Secrets:** each app was built with test values. The service role key, cron secret and Google secrets appeared in 0 files of the build output.
- The public Supabase URL and anon key appear inside the server bundle's `import.meta.env` snapshot. They're public anyway.
- A build made with placeholder settings worked when run with real ones, which confirms `getSecret()` reads them at request time. On Astro 5, `main`'s build had fixed the Supabase URL at build time.

**Things worth knowing:**

- **About page (Kenneth chose to remove the card).** The empty card's unclosed `<div>` made browsers nest the "Our current stack" card inside the "RTC by the numbers" box, as a faint, misplaced panel.
  - With the markup balanced, "Our current stack" is its own card under the box, as the code was written.
  - That is the only visible change on the site, and Kenneth saw a before/after screenshot first.
- **`BaseLayout.astro`:** I used `readFileSync('public/styles.css')` instead of the brief's `new URL(..., process.cwd())`. It reads the same file relative to the project folder, and it avoids a new type error, since the site has no Node types. The stylesheet hash is unchanged. It relies on building from the repo root, which the deploy workflow and the check both do.
- **Whitespace in the HTML.** Even with `compressHTML: true`, Astro 7 keeps the line breaks inside the avatar's `<span>` as spaces, for example ` AA ` instead of `AA`. The avatar is `inline-flex`, so the spaces aren't drawn; the screenshots confirm this. Only text-extraction tools see it.
- **The handbook article page fails in `astro dev` on Astro 5** (`require is not defined` in `sanitize-html`). The production build is fine, because `noExternal` bundles it. So test that page against a build, not the dev server.
- **Left in place, as asked:** the `vite.ssr.noExternal` list and the no-op image service in `ppm/astro.config.mjs`. Removing them is a separate test.
- **Couldn't verify:** signing in as every role on the real previews. That's Kenneth's check, because the previews use the production database.

## Risks and loose ends

- **The functions run far from the database.** Production responses carry `x-vercel-id: sin1::iad1::…`. Requests enter Vercel in Singapore, but the PPM and portal functions run in `iad1` (Washington, D.C.), Vercel's default. The database is in Singapore, so every Supabase call crosses the Pacific and back, and a page makes several.
  - Setting each project's Function Region to Singapore (`sin1`) should make signed-in pages noticeably faster.
  - It's a dashboard setting (Kenneth's) or a `regions` entry in `vercel.json`. Hobby allows one region.
- **No branch rule on `main` yet** (task 3).
- **The same sign-in bug is in WanderWise** (task 4).
- **WanderWise stays on Astro 5.** The Astro 7 compiler rejects `travel/src/pages/checklists.astro`, because of an unbalanced tag before line 103. Fix that first.
- **Dashboard, calendar and activity log dates are still UTC** (task 5's "bigger change planned for later"). Between 00:00 and 08:00 Manila they show yesterday's date.
- **CSV import:** it can assign tasks to client accounts, and it inserts one row at a time (task 7).
- **Type errors left:**
  - PPM: 5, all in `kb/[slug].astro`, including the missing `@types/sanitize-html`.
  - Portal: 2, `pw` possibly null in `login.astro`.
  - Site: 6, including `node:fs` and `node:crypto` without Node types.
  - WanderWise: 12.
  - Each is small. The check doesn't fail on them today.

## Suggested next

1. Kenneth: add the branch rule on `main`, and set the PPM's and portal's Function Region to Singapore.
2. Clear the remaining type errors, then make `astro check` failures block pull requests.
3. Start the React islands work on the PPM. `@astrojs/react` 7 is now the right add-on for all three apps.
4. Move the PPM's dates to Manila time (the planned "bigger change").
5. When WanderWise is needed: fix `checklists.astro`, port the sign-in fix, then upgrade it to Astro 7 like the others.
