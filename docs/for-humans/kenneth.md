# Kenneth: your open items

Updated 2026-10-13. Tick each one off here, with the date, when it's done. This page is for every app in the repository: anything that needs your accounts (GitHub, Vercel, Supabase, Microsoft 365, the domain and hosting) lands here.

## 1. The PPM's fixes of 2026-10-13, when their pull request reaches you

**What it is:** Kyan's branch `kyan/fix/ppm-calendar-blocks-and-plan`: 15-minute calendar blocks that no longer overlap, Finish task in a time block's details, Copy my plan as a list, deletes that ask first, a page on fixing bugs, and your decision 0013: a project's owner can delete it while it's empty ([the backlog](../../ppm/docs/backlog.md), items 13 and 34 to 43).

**Before merging: one database update.** `20261013000100_owners_delete_empty_projects.sql` changes who may delete a project (admins as before, and now its owner while it has no tasks). It only adds a rule, so the live PPM keeps working once it's in. From `ppm/`, on the pull request's branch, as in [`DEPLOY.md`](../../ppm/docs/DEPLOY.md#database-updates-after-the-switch):

```bash
npx supabase db push --dry-run    # must list this one file and nothing else
npx supabase db push
```

If it's merged first by mistake, nothing breaks: an owner is offered Delete and told "Only admins can delete a project" until the update is in.

**One thing that's your call:** it adds one line to the shared `CLAUDE.md`, pointing every session to the new [`docs/fixing-bugs.md`](../fixing-bugs.md). Say so if you'd rather it read differently.

**After merging,** on the live PPM: open the calendar and look at two short blocks in a row; open a block that's for a task and press Finish task (then Reopen the task, if it was only a test); use the arrow beside Copy my plan to turn the list on; and ask someone who isn't an admin to make a project and delete it.

## 2. Visitor and email tracking ([#22](https://github.com/kenoittt/roblestech.net/pull/22))

- [ ] **Merge the pull request.** It adds the cookie choice, Apollo's visitor tracker and the updated privacy policy and terms. Apollo starts counting the day it's live.
- [ ] **Salesforce Starter: send with tracking on.** Send outreach as an email campaign or message series (Track Opens and Track Clicks are on by default), and read the results on the campaign's engagement dashboard. Treat clicks and replies as the real signal: many email apps open the tracking image automatically.
- [ ] **Tag your email links** so a click shows up as a visit from that campaign, for example `https://roblestech.net/services?utm_source=salesforce&utm_medium=email&utm_campaign=oct-outreach`.
- [ ] **Check visitors in Apollo** under Website Visitors, about a day after the merge. The Services and Contact pages are marked as buying signals. Starter can't sync with Apollo (no API access), so move lists between the two by CSV, or move to Pro Suite with the API add-on if that gets old.
- [ ] **Keep the policy's promises:** delete Apollo visitor data older than two years, and update the privacy policy if the site ever loads another tracker. The policy's email provider still says Google Workspace; tell Claude if that should say Microsoft 365.

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
