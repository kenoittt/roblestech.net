# CLAUDE.md: roblestech.net

Rules for every Claude session in this repo, whoever starts it. Keep it short, and add a rule when a mistake teaches one.

## What this repo is

Four apps in one public repo. `main` is production for all of them.

| Folder | App | Runs on |
|---|---|---|
| root (`src/`, `public/`) | Public site, roblestech.net | Static Astro on GitHub Pages, deployed by GitHub Actions on every push to `main` |
| `ppm/` | Internal PPM and team handbook | Astro on Vercel, Supabase project A |
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

## Rules the history taught

- **Test as every role** (super admin, admin, staff, client) whenever sign-in, roles or row-level security change. The 2026-09-25 handbook lock-out only affected staff, so admins never saw it.
- **Row-level security helpers that read `profiles` must be `SECURITY DEFINER`** with a fixed `search_path`, or they recurse until the database stops them.
- **Build on the Node version production uses:** the `engines` field in each app's `package.json`. The 2026-09-25 outage only happened on production's older Node.
- **Don't add React or animation libraries for what plain HTML can do.** That's how a menu took the PPM down.
- **Database changes:** never paste SQL into the live project without Kenneth's OK. Never re-run `portal/supabase/schema.sql` or `ppm/supabase/schema.sql`; they would remove super admins' access. New changes go in new, numbered files.
- **API routes write with the service role key,** which skips row-level security, so every route must check the role itself.
- **Secrets:** read them at request time with `getSecret()` from `astro:env/server`. From Astro 6 on, `import.meta.env` values are baked into the build. Never commit `.env` files, and never print key values.
- **This repo is public.** Nothing goes in it that you wouldn't show a stranger: no secrets, client data or internal notes.
