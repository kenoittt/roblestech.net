# Kenneth: your open items

Updated 2026-10-07. Tick each one off here, with the date, when it's done. This page is for every app in the repository: anything that needs your accounts (GitHub, Vercel, Supabase, Microsoft 365, the domain and hosting) lands here.

## 1. Try saving a template on the live PPM

**Why:** the live database never had the 2026-10-04 updates, which is why templates didn't work there. They're applied now (below), so one template saved on the live PPM closes the problem (backlog item 18).

**How:** New task, fill it in, then Save as template. If it doesn't work, tell Kyan.

## 2. Check that Vercel's plan allows commercial use

**Why:** the PPM is a company tool. Vercel's free Hobby plan is for personal, non-commercial use only; a business needs Pro.

**How:** Vercel, your team's Settings, then Billing: the plan's name is at the top.

## Done

- **2026-10-07: the live database is up to date.** Applied with Claude after #19 was merged: the dry run listed exactly the four updates (deleting projects, templates, blocks that follow their task, block colours) and nothing else, and `npx supabase db push` applied them. The live database now matches the repository.
- **2026-10-07: your role.** You're a super admin on the live database, and so are Christian and Kyan. If a role change is refused again, reload People first: a screen opened before a role change keeps its old menus.
- **2026-10-07: decisions.**
  - A way back if nobody is a super admin (backlog item 12): build a one-time setup link ([0014](../../ppm/docs/decisions/0014-a-way-back-when-nobody-is-a-super-admin.md)). Until it's built, it takes SQL.
  - A project's owner may delete it while it has no tasks (backlog item 13, [0013](../../ppm/docs/decisions/0013-owners-delete-empty-projects.md)). To build.
  - Branch names follow `<owner>/<type>/<app>-<topic>` in every app: rule 2 in `CLAUDE.md`.
- **2026-10-07: the next PPM pull request.** You merged #19: templates made where work is made, the all-day calendar, block colours and more.
