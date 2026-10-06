# Kenneth: your open items

Updated 2026-10-07. Tick each one off here, with the date, when it's done. This page is for every app in the repository: anything that needs your accounts (GitHub, Vercel, Supabase, Microsoft 365, the domain and hosting) lands here.

## 1. Bring the live database up to date, before merging the next PPM pull request

**Why:** templates and deleting projects need two database updates that came with the 2026-10-04 pull request. If that pull request was merged before they were applied, both features quietly don't work. That's almost certainly why templates don't work on the live PPM: on 2026-10-07 they worked end to end on a local copy of every update. The next pull request (`kyan/feat/ppm-templates-and-calendar`) adds two more updates, and needs all of them in first.

**How, with your Claude,** from the `ppm/` folder, linked to the live project:

```bash
npx supabase db push --dry-run
```

It should list some or all of these four, in this order, and nothing else:

1. `20261004000100_project_archive_and_delete.sql`: deleting projects (from 2026-10-04)
2. `20261004000200_templates.sql`: templates (from 2026-10-04)
3. `20261007000100_blocks_follow_their_task.sql`: finishing a task ticks off its time blocks
4. `20261007000200_block_colours.sql`: colours for time blocks

- **If it lists only these:** apply them with `npx supabase db push`, then open the live PPM: it still works, since each one only adds things. Then merge the pull request, and try saving a template.
- **If it lists only the last two,** the 2026-10-04 updates were in already, so the templates problem has another cause. Apply these two, merge, and tell Kyan if templates still don't work.
- **If it lists anything else, stop:** the live database and the repository disagree, and that needs a look first.

## 2. Check your role

**Why:** role changes were refused for you on 2026-10-04 in a way that only happens when the database doesn't have you as a super admin.

**How:** at the bottom left of the sidebar, under your name, or in the Role column on People. If it says Admin, Christian can make you a super admin from People; if nobody is a super admin, it takes one line of SQL, given in [the 2026-10-04 report](../../ppm/docs/reports/2026-10-04-session-report.md#how-to-confirm-and-fix-it-kenneth).

## 3. Decisions waiting for you

- **A way back if nobody is a super admin** (backlog item 12). Today it takes SQL.
- **May a project's owner delete it while it has no tasks?** (backlog item 13). Today only admins delete; owners can archive.
- **The branch-name pattern** in the repository's `docs/git-conventions.md` (backlog item 16): adopt it in the shared `CLAUDE.md`, or not.
- **Vercel's plan:** check that it allows commercial use.

## 4. Review the next PPM pull request

**The knowledge-base pull request (#17) was merged on 2026-10-06.** Its follow-up docs (the closed #18) come with the next pull request, `kyan/feat/ppm-templates-and-calendar`: templates made in the new-task dialog and Plan time, a calendar that runs all day, blocks that cross midnight, a people picker, Copy my plan your way, block colours and more. Apply item 1 first.
