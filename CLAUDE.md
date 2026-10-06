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
7. **Treat previews as production data.** Assume previews use the production database and email settings unless Kenneth says otherwise. Click through, create nothing you won't delete, and send no emails to real people.
8. **Kenneth merges.** Tag Kyan on anything that touches shared code, the database or the build.

## Docs

- **`docs/` is shared, and public like the rest of the repo.** Reports go in `docs/reports/`. Nothing goes in `docs/` that you wouldn't show a stranger.
- **`docs/private/` is git-ignored:** each person's own briefs and notes, on their own computer. Never commit it, or force it in with `git add -f`.
- **Working from a brief in `docs/private/`?** Re-read it at the start of each task.
- **Start with `docs/README.md`:** how the repository's knowledge bases work (an index, a log, guides, decisions, raw sources, pages for humans, reports). Each app can have its own; the PPM's starts at `ppm/docs/index.md`.
- **How we think:** `docs/how-we-work.md`. Objective over agreeable; a senior engineer and an expert product designer at once; past the industry standard; the fewest clicks; built to scale.
- **Commits are short and warm** and pull requests a short walkthrough: `docs/git-conventions.md`.
- **Log only what's substantial, write a report only for large work or when asked,** and put anything only a person can do in a `for-humans/` page.

## Rules the history taught

- **Test as every role** (super admin, admin, staff, client) whenever sign-in, roles or row-level security change. The 2026-09-25 handbook lock-out only affected staff, so admins never saw it.
- **Row-level security helpers that read `profiles` must be `SECURITY DEFINER`** with a fixed `search_path`, or they recurse until the database stops them.
- **Build on the Node version production uses:** the `engines` field in each app's `package.json`. The 2026-09-25 outage only happened on production's older Node.
- **Don't add React or animation libraries for what plain HTML can do.** That's how a menu took the PPM down.
- **Database changes:** never paste SQL into the live project without Kenneth's OK. Never re-run `portal/supabase/schema.sql`; it would remove super admins' access. PPM changes go in new, timestamped files in `ppm/supabase/migrations/`.
- **API routes write with the service role key,** which skips row-level security, so every route must check the role itself.
- **Secrets:** in the Astro apps, read them at request time with `getSecret()` from `astro:env/server` (from Astro 6 on, `import.meta.env` values are baked into the build). In the PPM, only `NEXT_PUBLIC_*` values may reach the browser. Never commit `.env` files, and never print key values.
- **This repo is public.** Nothing goes in it that you wouldn't show a stranger: no secrets, client data or internal notes.
