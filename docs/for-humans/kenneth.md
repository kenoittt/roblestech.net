# Kenneth: your open items

Updated 2026-10-07. Tick each one off here, with the date, when it's done. This page is for every app in the repository: anything that needs your accounts (GitHub, Vercel, Supabase, Microsoft 365, the domain and hosting) lands here.

Nothing is waiting for you right now.

## Done

- **2026-10-07: templates work on the live PPM.** You saved one once the database updates were in (backlog item 18).
- **2026-10-07: Vercel's plan allows commercial use.**
- **2026-10-07: the live database is up to date.** Applied with Claude after #19 was merged: the dry run listed exactly the four updates (deleting projects, templates, blocks that follow their task, block colours) and nothing else, and `npx supabase db push` applied them. The live database now matches the repository.
- **2026-10-07: your role.** You're a super admin on the live database, and so are Christian and Kyan. If a role change is refused again, reload People first: a screen opened before a role change keeps its old menus.
- **2026-10-07: decisions.**
  - A way back if nobody is a super admin (backlog item 12): no new code; it's fixed in Supabase ([0014](../../ppm/docs/decisions/0014-a-way-back-when-nobody-is-a-super-admin.md)). The steps are in [giving the team accounts](../../ppm/docs/for-humans/giving-the-team-accounts.md#if-nobody-is-a-super-admin).
  - A project's owner may delete it while it has no tasks (backlog item 13, [0013](../../ppm/docs/decisions/0013-owners-delete-empty-projects.md)). To build.
  - Branch names follow `<owner>/<type>/<app>-<topic>` in every app: rule 2 in `CLAUDE.md`.
- **2026-10-07: the next PPM pull request.** You merged #19: templates made where work is made, the all-day calendar, block colours and more.
