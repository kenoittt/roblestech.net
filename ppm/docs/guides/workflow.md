# How a piece of work goes

From reading the brief to the merge, for anyone working on the PPM. The repository's `CLAUDE.md` has the rules every app shares; this page adds what the PPM needs.

## 1. Read first

1. [`../index.md`](../index.md): what's in these docs.
2. The repository's [`docs/how-we-work.md`](../../../docs/how-we-work.md): the mindset.
3. The guides that apply: [design system](design-system.md), [UX principles](ux-principles.md), [architecture](architecture.md), [database](database.md), [testing](testing.md).
4. [`../backlog.md`](../backlog.md) and the last few entries of [`../log.md`](../log.md): what's open, and what changed recently.
5. If you're working from a brief, re-read it at the start of each task. Private briefs live in `docs/private/` (git ignores it); a brief only goes in [`../raw/`](../raw/) when its author asks for it to be kept in the repository.

## 2. Check for other work

`git fetch --all --prune`, then look at the branches and open pull requests. If someone else is changing the same files, stop and ask (the repository's `CLAUDE.md`, rule 3).

## 3. Branch

One branch per task, never `main`. Name it as in [`docs/git-conventions.md`](../../../docs/git-conventions.md): `kyan/feat/ppm-templates` or `claude/fix/ppm-sign-in`.

## 4. Understand, then plan

- Work through "Designing a feature" in [ux-principles.md](ux-principles.md): the job to be done, what good tools do, what this team does, where it lives, the click count, the scale, the rules, the states.
- Find the existing component, pattern or token that already does the job before making a new one.
- If the brief is unclear, or something in it looks wrong, ask. Say why, and suggest the better option.

## 5. Build

- **Follow the nearest existing pattern.** Same components, same tokens, same voice.
- **Rules go in the database** (row-level security, triggers, functions), with the screen mirroring them to explain.
- **Database changes are new migrations,** added only ([database.md](database.md)).
- **One source of truth:** a number, a label or a rule is defined once and used everywhere. No barrel files.
- **Ask the scale question:** what happens with ten times the people, projects or tasks?

## 6. Check

Run what [testing.md](testing.md) asks for. Look at the screens yourself, in both themes, at both widths, as each role that's affected.

## 7. Update the docs, in the same commit

| If you… | Update |
|---|---|
| Changed how something works or looks | The guide that describes it |
| Changed who may do what | The permissions table in [database.md](database.md) |
| Added, moved or removed a page or folder in `docs/` | [`../index.md`](../index.md) |
| Finished a backlog item | [`../backlog.md`](../backlog.md): tick it, with the date |
| Made a substantial decision | A new record in [`../decisions/`](../decisions/) |
| Changed something substantial | An entry in [`../log.md`](../log.md) (see the rules at its top) |
| Need a person to do something | A page in [`../for-humans/`](../for-humans/), and say so in the pull request |
| Did something large, or were asked for one | A report in [`../reports/`](../reports/) |

## 8. Commit and open a pull request

- **Commits:** short and warm, in the conventional form, details in the docs ([git-conventions.md](../../../docs/git-conventions.md)).
- **The pull request:** a short walkthrough: what it does, what changed, what someone has to do (database updates to apply **before** the merge, settings), how it was checked, and what couldn't be checked.

## 9. The merge (Kenneth)

1. Apply any new migrations to the live database (`npx supabase db push --dry-run`, then `npx supabase db push`).
2. Check the Vercel preview.
3. Merge, then try the change on the live PPM.

If a pull request adds migrations and they aren't applied first, the new code goes live against a database that lacks them: features quietly don't work. That's the most likely reason templates didn't work after the 2026-10-04 merge (not yet confirmed: [`for-humans/kenneth.md`](../../../docs/for-humans/kenneth.md) says how to check).
