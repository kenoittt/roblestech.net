# The database

The PPM's database: how changes are made, who may do what, and how the rules work. It's Supabase project A, which the client portal shares (the `profiles` table and the sign-in accounts are common to both). Checked against the migrations on 2026-10-06.

## The rules for changing it

1. **Only through migrations:** new, timestamped files in `supabase/migrations/` (`YYYYMMDDHHMMSS_what_it_does.sql`). Never edit a migration that has run anywhere shared; write a new one.
2. **Add, don't remove.** New columns, tables, functions and rules. Dropping or renaming would break the code that's live while the new code is on its way, and it would break rolling back.
3. **The live database, only with Kenneth's OK.** Migrations reach it with `npx supabase db push`, run by Kenneth or his Claude, **before** the pull request that needs them is merged: a merge puts the new code live at once ([DEPLOY.md](../DEPLOY.md#database-updates-after-the-switch)). Never paste SQL into the live project without his OK.
4. **Never reset a hosted database,** and never send the sample data to one (`--include-seed`). `supabase/seed.sql` is for local use only.
5. **Helpers that read `profiles` inside a rule must be `SECURITY DEFINER`,** with a fixed `search_path`, or they call themselves until the database stops them (the repository's `CLAUDE.md`).
6. **Mind the portal.** Anything that touches `profiles`, sign-in or the shared helpers affects the portal too.

## The migrations so far

| File | What it does |
|---|---|
| `20261002000100_baseline_from_rtc_website` | The live schema as it was before the revamp, rebuilt from the repository's SQL. On the live database it's marked as applied, not run |
| `20261002000200_ppm_revamp` | The revamp: profile fields, six statuses, five priorities, task numbers (`RTC-12`), sign-off rules, private tasks, comments, checklists, notifications, project members, the calendar and its privacy, the triggers that keep history and send notifications |
| `20261002000300_notification_emails` | `emailed_at`, so each notification is emailed once |
| `20261002000400_avatar_uploads` | The private `avatars` bucket |
| `20261002000500_comment_mentions` | @mentions in comments |
| `20261002000600_task_files` | Files on tasks, in the private `task-files` bucket |
| `20261002000700_admin_sign_off` | Records when an admin signs off in someone's place; a rule that names nobody now refuses |
| `20261002000800_recurring_tasks` | Repeating tasks |
| `20261002000900_sign_off_requests` | Sending a task for sign-off asks the people its rule names |
| `20261003000100_handbook_using_the_ppm` | The Handbook's "Using the PPM" shelf (data) |
| `20261003000200_last_seen_from_sign_ins` | Fills "last active" from each person's last sign-in, so the team doesn't show as "Invited" (data) |
| `20261004000100_project_archive_and_delete` | `ppm_delete_project`: delete a project, and its tasks if asked, in one step |
| `20261004000200_templates` | Task and calendar templates |

## Who may do what

The PPM has three roles: **super admin**, **admin** and **staff**. "A PPM user" below means one of those three, not deactivated (`is_ppm_user()`). The portal's **clients** share the database but can't open the PPM. "Admins" means admins and super admins (`is_admin()`).

| Area | Who may | Enforced in |
|---|---|---|
| Open the PPM at all | PPM users | Row-level security everywhere (`is_ppm_user()`), and the sign-in check |
| **People:** invite or manage staff | Admins | `domains/people/actions.ts` (`mayManage`) |
| **People:** invite, promote, demote, deactivate or reset an admin | Super admins only. Nobody changes their own role, and the last super admin can't be demoted | `people/actions.ts` |
| **People:** edit your own name, photo and preferences | Everyone, for themselves; never their own role | The `profiles` policy and its column grants |
| **Tasks:** create | PPM users | `ppm_tasks` policies |
| **Tasks:** see and edit | PPM users; a **private** task only its creator and its assignee | `ppm_tasks` policies (`ppm_task_visible`) |
| **Tasks:** make private or shared | The person who created it | The `ppm_tasks_before` trigger |
| **Tasks:** mark done | Whoever the task's sign-off rule names: anyone, anyone but the assignee, the assigner, the reviewer, or chosen people. Admins always may; the history records it as an admin sign-off | `ppm_can_complete` (`ppm_rule_allows` plus the admin exception), in the `ppm_tasks_before` trigger |
| **Tasks:** delete | The app offers it to the task's creator, as a soft delete with Undo. Removing a row for good: admins only | The app; the `ppm_tasks` delete policy |
| **Comments** | Anyone who can see the task adds them; you edit your own; you, or an admin, delete them | `ppm_task_comments` policies |
| **Checklists** | Anyone who can see the task | `ppm_task_checklist` policy |
| **Files on tasks** | Anyone who can see the task adds and opens them; you, or an admin, remove them | `ppm_task_files` and storage policies |
| **Projects:** create | PPM users | `ppm_projects` policies |
| **Projects:** edit, archive, restore, manage members | The owner, owner-members and admins | `ppm_can_manage_project` |
| **Projects:** delete | Admins only, with or without their tasks | `ppm_delete_project` (checks the caller first) |
| **Templates** | You see your own and every shared one, and change your own. Admins may also rename or delete a shared one, but not take it over | `ppm_task_templates`, `cal_event_templates` policies, and a trigger |
| **Calendar:** your entries | You create, change and delete your own; you see your own and those you're invited to; you can leave a meeting | `cal_events`, `cal_event_attendees` policies |
| **Calendar:** others' entries | As each person chose: everything, only "busy", or nothing, per entry, day or week | `cal_team_events()`, which masks entries before they leave the database |
| **Handbook** | PPM users read; admins write articles, shelves and topics; each person their own votes | `kb_*` policies |
| **Notifications** | Only your own | `ppm_notifications` policies |

When you add or change a rule, update this table in the same commit.

## How the rules work

- **Helpers** used inside rules: `is_ppm_user()`, `is_admin()`, `is_super_admin()`, `ppm_task_visible(task)`, `ppm_can_manage_project(project)`, `cal_is_owner(event)`, `cal_is_attendee(event)`.
- **`ppm_tasks_before`** (a trigger before every insert and update of a task): takes the creator and assigner from the session, so nobody can write someone else's name; checks the sign-off rule when a task moves to Done; stops anyone but the creator changing privacy; stamps when and by whom a task was finished or deleted.
- **`ppm_tasks_after`** (after every change): writes the history (`ppm_task_events`) and the notifications: assigned, sent for sign-off (to the people the rule names, through `ppm_sign_off_ids`; when the rule names nobody, to the reviewer, or else whoever assigned it), finished, reopened.
- **`ppm_tasks_repeat`:** when a repeating task is finished, makes the next one, keeping the series' creator and assigner (set from inside the database only, under an internal flag the app can't set), with the checklist unticked. The series moves to the new task, so finishing the old one again makes no duplicate.
- **Comments** have their own trigger: @mentioned people get a "mention", the others involved a "comment".
- **Notifications are emailed once:** the app claims unsent rows by setting `emailed_at`.
- **Storage:** `avatars` holds one file per person, named by their id; `task-files` keeps each task's files in a folder named by the task's id, readable by whoever can see the task.

## Making a change, step by step

1. **Write the migration:** a new file, additive, safe to run twice where possible (`if not exists`; `drop policy if exists` before `create policy`), with a comment at the top saying what it does and why.
2. **Apply it locally:** `npx supabase migration up --local`, or `npm run db:reset` for a clean run of everything.
3. **Try it safely first, if it's risky:** run it inside a transaction and roll it back (`begin; …; rollback;`). Postgres undoes schema changes too, so nothing stays.
4. **Regenerate the types:** `npm run db:types`.
5. **Update the code that mirrors the rule** (a comment says "Mirrors …") and the permissions table above.
6. **Test as every role:** add a smoke check for a new rule, then `npm run test:smoke` and `npm run test:menus` ([testing.md](testing.md)).
7. **Say so in the pull request:** name the migration, and add it to [`for-humans/kenneth.md`](../../../docs/for-humans/kenneth.md) so it's applied before the merge.

## Production facts

- **Who may change the live database:** Kenneth, or his Claude with his OK.
- **Roles live in `profiles.role`.** People can check their own at the bottom of the sidebar, under their name, or in the Role column on People.
- **Super admins were first set by SQL,** for two company addresses, when the portal was built. If someone signs in with a different address, that line never touched them; a super admin, or Kenneth with one line of SQL, fixes it ([the 2026-10-04 report](../reports/2026-10-04-session-report.md#task-1-the-refused-role-changes)).
