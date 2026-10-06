# Kenneth: your open items

Updated 2026-10-06. Tick each one off here, with the date, when it's done.

## 1. Check that the 2026-10-04 database updates are on the live database

**Why:** templates and deleting projects need two database updates that came with the 2026-10-04 pull request. If the pull request was merged before they were applied, both features quietly don't work. That's the most likely reason templates didn't work after that merge, but nobody has checked yet.

**How, with your Claude,** from the `ppm/` folder, linked to the live project:

```bash
npx supabase db push --dry-run
```

- If it lists `20261004000100_project_archive_and_delete.sql` and `20261004000200_templates.sql`, they're missing. Apply them with `npx supabase db push`, then try saving a task as a template.
- If it lists nothing, they're in, and the problem is elsewhere: tell Kyan.
- If it lists anything else, stop: the live database and the repository disagree, and that needs a look first.

## 2. Check your role

**Why:** role changes were refused for you on 2026-10-04 in a way that only happens when the database doesn't have you as a super admin.

**How:** at the bottom left of the sidebar, under your name, or in the Role column on People. If it says Admin, Christian can make you a super admin from People; if nobody is a super admin, it takes one line of SQL, given in [the 2026-10-04 report](../reports/2026-10-04-session-report.md#how-to-confirm-and-fix-it-kenneth).

## 3. Decisions waiting for you

- **A way back if nobody is a super admin** (backlog item 12). Today it takes SQL.
- **May a project's owner delete it while it has no tasks?** (backlog item 13). Today only admins delete; owners can archive.
- **The branch-name pattern** in the repository's `docs/git-conventions.md` (backlog item 16): adopt it in the shared `CLAUDE.md`, or not.
- **Vercel's plan:** check that it allows commercial use.

## 4. Review the knowledge-base pull request

`kyan/docs/ppm-knowledge-base` adds docs only: no code, no database changes. Nothing to apply first.
