# CLAUDE.md: roblestech.net

Rules for every Claude session in this repo, whoever starts it. Keep it short, and add a rule when a mistake teaches one.

## What this repo is

Four apps in one public repo. `main` is production for all of them.

| Folder | App | Runs on |
|---|---|---|
| root (`src/`, `public/`) | Public site, roblestech.net | Static Astro on GitHub Pages, deployed by GitHub Actions on every push to `main` |
| `ppm/` | Internal PPM and team handbook | Next.js on Vercel, Supabase project A (Kyan's revamp; see `ppm/README.md` and `ppm/docs/`) |
| `portal/` | Client portal | Astro on Vercel, Supabase project A |
| `travel/` | WanderWise (dormant) | Astro on Vercel, Supabase project B |

Each app has its own `package.json`; run npm commands inside its folder. Every push to `main` rebuilds all three Vercel projects, not only the one that changed.

## Who works here

Kenneth (owner; merges to `main`) and Kyan (developer and architecture), each with their own Claude sessions. Assume someone else may be working in the repo at the same time.

## How changes are made

1. **Never commit to `main` directly.** One branch per task, merged through a pull request.
2. **Branch names:** `claude/<topic>` for Kenneth's sessions, `kyan/<topic>` for Kyan's.
3. **Check for other work first:** `git fetch --all --prune`, then `git branch -r` and the open pull requests. If another branch or pull request touches the same app or files, stop and ask before going on.
4. **Stay current:** rebase on `origin/main` before opening a pull request, and again before merging.
5. **Keep pull requests small and single-purpose.** Say what changed, why, how you verified it, and what you couldn't verify.
6. **Check before merging:** the automatic pull-request check must pass once it exists, and `npm run build` and `npx astro check` should pass in every app you touched. Then check the Vercel preview for the three Vercel apps. The public site has no preview: build it and check it locally.
7. **Local databases start full.** Each app's local database is seeded (the PPM's: `ppm/supabase/seed.sql`, loaded by `npx supabase db reset`) with a realistic team and enough projects, tasks, calendar entries and templates to show every option the app has, the newest included. A feature isn't done until the seed has data for it. Never send the seed to a live database.
8. **Treat previews as production data.** Assume previews use the production database and email settings unless Kenneth says otherwise. Click through, create nothing you won't delete, and send no emails to real people.
9. **Kenneth merges.** Tag Kyan on anything that touches shared code, the database or the build.
10. **Messages for people go where they'll see them.** When a task needs something from someone (Kenneth, Kyan, anyone), write it on their page in `docs/for-humans/<name>.md` (make one if there isn't one), say so in the pull request, and tell the person you're working with. At the start of a session, read your person's page (Kenneth's sessions: `kenneth.md`; Kyan's: `kyan.md`) and tell them what's waiting for them.

## Docs

- **`docs/` is shared, and public like the rest of the repo.** Reports go in `docs/reports/`. Nothing goes in `docs/` that you wouldn't show a stranger.
- **`docs/private/` and `ppm/docs/private/` are git-ignored** (the PPM's keeps only its README): each person's own briefs and notes, on their own computer. Never commit them or force them in with `git add -f`, and never run `git clean -x` or `-X` here: it deletes them, and every `.env` file.
- **Working from a brief in a `private/` folder?** Re-read it at the start of each task.
- **Start with `docs/README.md`:** how the repository's knowledge bases work (an index, a log, guides, decisions, raw sources, pages for humans, reports). Each app can have its own; the PPM's starts at `ppm/docs/index.md`.
- **How we think:** `docs/how-we-work.md`. Objective over agreeable; a senior engineer and an expert product designer at once; past the industry standard; the fewest clicks; built to scale. UI and UX are weighed in every change, in every app: `docs/ux-principles.md`.
- **Give goals, not steps:** a task comes with its goal, why, limits and a done you can check. A written checklist only when the work outlasts the session or has many asks (`docs/how-we-work.md`).
- **Searching:** if `qmd` is installed, ask questions with `qmd query`, writing its intent, lex, vec and hyde lines yourself (the most accurate search, 13 to 27 s), and read the top few results, not only the first; use `qmd search` or `grep` for exact names. Without qmd, the indexes and `grep`. How and why: `docs/references/qmd.md`.
- **Commits are short and warm** and pull requests a short walkthrough: `docs/git-conventions.md`.
- **Log only what's substantial, write a report only for large work or when asked,** and put anything only a person can do in a `for-humans/` page. What needs Kenneth's accounts (Vercel, Supabase, the domain, hosting) goes on `docs/for-humans/kenneth.md`.

## Rules the history taught

- **Test as every role** (super admin, admin, staff, client) whenever sign-in, roles or row-level security change. The 2026-09-25 handbook lock-out only affected staff, so admins never saw it.
- **Row-level security helpers that read `profiles` must be `SECURITY DEFINER`** with a fixed `search_path`, or they recurse until the database stops them.
- **Build on the Node version production uses:** the `engines` field in each app's `package.json`. The 2026-09-25 outage only happened on production's older Node.
- **Don't add React or animation libraries for what plain HTML can do.** That's how a menu took the PPM down.
- **Database changes:** never paste SQL into the live project without Kenneth's OK. Never re-run `portal/supabase/schema.sql`; it would remove super admins' access. PPM changes go in new, timestamped files in `ppm/supabase/migrations/`.
- **API routes write with the service role key,** which skips row-level security, so every route must check the role itself.
- **Secrets:** in the Astro apps, read them at request time with `getSecret()` from `astro:env/server` (from Astro 6 on, `import.meta.env` values are baked into the build). In the PPM, only `NEXT_PUBLIC_*` values may reach the browser. Never commit `.env` files, and never print key values.
- **This repo is public.** Nothing goes in it that you wouldn't show a stranger: no secrets, client data or internal notes.
