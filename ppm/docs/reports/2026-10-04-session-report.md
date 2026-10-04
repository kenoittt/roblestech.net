# Session report: Kyan's brief of 2026-10-04

What a Claude Code cloud session did with [Kyan's brief](../briefs/2026-10-04-kyan-voice-brief.md), what it considered, what it ruled out, and why. Written for Kyan, for Kyan's local Claude (which will turn the useful parts into knowledge-base pages), and for Kenneth.

The session had no access to Kyan's private notes, design guide or plans. Everything here comes from this repository: the code, `ppm/README.md`, `ppm/docs/` (the knowledge-base index, the backlog, `DEPLOY.md`, Kenneth's guide), the repository's `CLAUDE.md`, and the git history. Where that wasn't enough, the report says what was assumed.

## In one page

| # | Asked | Outcome | Commit |
|---|---|---|---|
| 1 | Role changes refused for Kenneth | **The code is right; the live data almost certainly isn't.** A super admin's role changes work locally in every direction. The refusal can only appear when the database says the person asking is *not* a super admin. The message now says which role the database has, and the screen corrects itself. Kenneth needs a 10-second check (below). | `4a72a12` |
| 2 | Templatable tasks | Done. Save any task as a template from its ⋯ menu; use one from the new-task dialog (Templates, top right) or ⌘K. | `0a3c5a1` |
| 2b | Templatable time blocks and meetings | Done, in the same commit. The arrow beside Plan time adds a block in two clicks; meetings open filled in for review. | `0a3c5a1` |
| 3 | Eye icon on password fields | Done, on all five password fields (sign-in, the welcome page, Settings). | `bfba64f` |
| 4 | Delete or archive projects | Done. Archive for whoever manages a project; delete for admins, with a choice about the tasks. | `22e5772`, `94629ed` |
| 5 | "Chosen people" orange border | Analysed, not changed (as asked). Why it's there, what Kenneth's Claude knew and lacked, and a recommendation: [below](#the-chosen-people-orange-border). | none |
| 6 | Conventional commits | Every commit follows the cheat sheet. Linked and adapted in [../git-conventions.md](../git-conventions.md), with a branch-naming proposal. | `docs` commit |
| | Found on the way | The buttons in a calendar entry's details (Tick off, Edit, delete) didn't work: they opened a new Plan time dialog. Fixed. | `b00c18f` |
| | Tests | Nine new checks in the smoke test: `npm run test:smoke` passes 32/32 (23 before). | `f726d38` |

**Branch:** `kyan/feat/ppm-templates-and-archive`, from `main` at `d0b9648`. No pull request was opened: the brief didn't ask for one, and Kenneth merges.

### What Kenneth needs to do, in order

1. **Check your role (10 seconds).** In the PPM, look at the bottom-left of the sidebar: your name, and under it your role. Or open People and read the Role column on your row. If it says **Admin**, that's the cause of the refused role changes. See [Task 1](#task-1-the-refused-role-changes) for the fix.
2. **Apply the two new database updates before merging this branch**, with the commands in `DEPLOY.md`, "Database updates after the switch": `20261004000100_project_archive_and_delete.sql` and `20261004000200_templates.sql`. Both only add things; the live PPM keeps working on them as it is. Merging first would leave templates empty and project deletion failing (nothing crashes, but they don't work).
3. **Merge.** Then check: archive and restore a test project, delete one, save a task as a template and use it.

## How the work was done

### Ground rules taken from the repository

- `CLAUDE.md` (shared): a branch per task, pull requests that Kenneth merges, build on the Node version in `engines` (24), test as every role when roles change, database changes only as new timestamped migrations, never run SQL on the live project without Kenneth's OK, nothing private in the public repository.
- `ppm/CLAUDE.md` and `ppm/AGENTS.md`: read the knowledge base and the backlog before anything sizeable; this Next.js has breaking changes, so read its bundled docs before writing Next.js code. (No new Next.js APIs were needed; the server-function guidance, "verify authorization inside every server function", matches what `people/actions.ts` already does.)
- `ppm/docs/README.md`: the docs are public; plain, kind, short sentences; keep docs true in the same commit as the code.

### The local setup (worth knowing for the next cloud session)

The PPM was run for real, not reviewed on paper: the local Supabase stack with the sample data, the app on Node 24, and a headless Chromium driving it as Kenneth (super admin), Kyan (admin) and Carl (staff). Getting there in a cloud container needed four workarounds, now also in `ppm/README.md`:

- The container has Node 22; Node 24 (the `engines` version) was downloaded from nodejs.org into a scratch folder.
- Docker's daemon wasn't running: `dockerd` started it.
- The Supabase CLI pulls images from GitHub's registry, whose downloads the network policy blocks. `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` makes it use Docker Hub, which works. Studio, analytics and edge functions were left out (`-x studio,imgproxy,vector,logflare,edge-runtime,supavisor`): the app doesn't use them.
- The tests default to a Mac's Chrome. `CHROME_PATH=/opt/pw-browsers/chromium` points them at the container's.

**Baseline first:** before any change, `npm run test:smoke` passed 23/23 here. Every change was then checked in the browser with screenshots, and the database was reset from scratch (`supabase db reset`) to prove all thirteen migrations and the seed apply cleanly in order.

## Task 1: the refused role changes

### The report

Kenneth, a super admin on the live PPM, tried to make Kyan a super admin. The PPM said "Only a super admin can make or change an admin." It also refused staff to admin, and super admin to staff. Kyan asked: a bug, or the database (a role hard-coded when the app was first deployed)?

### What was checked

- **The message's source.** Only one place in the PPM says "make or change an admin": `changeRole` in `src/domains/people/actions.ts` (introduced in the revamp's commit `2a59c98`). The portal has its own role screen with different messages, so the message came from the PPM.
- **The rule.** `changeRole` refuses when `mayManage(me.role, them.role)` or `mayManage(me.role, newRole)` is false, and `mayManage` returns true straight away for a super admin. So for a super admin it can't refuse. The refusal means the server read the caller's role as something other than `super_admin`.
- **Where each side reads the role.** The screen's role menu offers Super admin only when the signed-in person's profile says `super_admin` (`useMe()`, from the same `profiles` table). The server action reads `profiles.role` for the session's user too. Same table, same row, same session; no caching in between. No role is hard-coded anywhere in the app's code (the sample accounts on the sign-in page are display-only, and only in local demo mode).
- **History.** `changeRole` and `mayManage` haven't changed since they were written; production runs this code.
- **Running it.** Locally, as Kenneth (super admin), every change worked, both ways: Carl staff to admin to super admin to staff, Kyan admin to staff to admin, Christian super admin to admin and back.
- **Reproducing the live symptom.** Kenneth opened People as a super admin; then, behind the screen's back, the database was changed to make him an admin; then he changed Carl's role. Result: exactly the reported refusal. That's the only way found to produce it.

### What it most likely is

The live database has Kenneth's role as something other than `super_admin` (most likely `admin`). Two ways that could have happened:

- **The "hard-coding" Kyan remembered.** Super admins were set once, by SQL: `portal/supabase/roles-and-approvals.sql`, step 2, copied into the PPM's baseline migration, does `update profiles set role = 'super_admin'` for the accounts whose email is `kenneth@roblestech.net` or `christian@roblestech.net`. If Kenneth signs in with any other address, that line never touched his account. (On the live database, the baseline migration was marked as applied, not run again: `DEPLOY.md`, path A, step 4.)
- **A screen loaded before a role change.** If his role changed after the page loaded, the menu would still offer what it offered when it loaded. Less likely, but the fix below covers it too.

An admin sees only "Staff" in a staff member's role menu, with the line "Only a super admin can make someone an admin." Kenneth may have seen that line rather than the server's message; it reads almost the same. Either way the cause is the same: the database doesn't have him as a super admin.

### How to confirm and fix it (Kenneth)

1. **Confirm:** the sidebar's account button (bottom left) shows the role under the name. So does People, in the Role column.
2. **If Christian is a super admin,** he can make Kenneth one from People. No SQL needed.
3. **If nobody is a super admin,** it takes SQL, run by Kenneth in Supabase's SQL editor, on the live project. First, read-only, to see the roles:

   ```sql
   select p.full_name, u.email, p.role, p.deactivated_at
   from public.profiles p join auth.users u on u.id = p.id
   where p.role in ('super_admin', 'admin', 'staff')
   order by p.role, p.full_name;
   ```

   Then, with Kenneth's own sign-in email in place of the placeholder, one row changed:

   ```sql
   update public.profiles set role = 'super_admin'
   where id = (select id from auth.users where email = '<Kenneth''s sign-in email>');
   ```

   This isn't a migration on purpose: it's data for one live account, and the repository is public.

### What changed in the code, and why

Nothing in the rule was wrong, so the rule is untouched. What was wrong is that the refusal hid its cause, so it read like a bug.

- **Every refusal in `people/actions.ts` names the role the database has** for the person asking: "You're signed in as an admin. Only a super admin can make or change an admin." (and the same for deactivating, reactivating, password resets and invitations). Staff get "You're signed in as staff, and only admins manage people."
- **The role menu and the invite dialog say "You're an admin."** before the rule, for anyone who isn't a super admin. The cause is visible before anyone clicks.
- **After any people action, refused or not, the People screen reloads the team.** A screen that was out of date (the second cause above) corrects itself: the role column, the menus and the account button show what the database says.

### Considered and not done

- **Changing who may do what.** The rules (only a super admin manages admins) match the old PPM and the portal, and `DEPLOY.md` describes them. Nothing suggested they're wrong.
- **A way back when nobody is a super admin.** If the live database has no super admin, nobody can make one from the app. A safe recovery (say, a one-time setup link for Kenneth) is a design decision about security, not a fix. It's in the backlog for Kenneth to decide.
- **Fixing the live data.** Not possible from here, and not allowed without Kenneth's OK in any case.

**Couldn't verify:** the live database. The diagnosis rests on the code, and on reproducing the exact symptom locally.

## Task 2: templates for tasks and calendar entries

### The need, as a product designer would put it

Christian's observation: tasks repeat, sometimes daily. The outreach team sends emails every day, so every day someone makes the same task (and blocks the same time on the calendar), with the same title, description, project, checklist and sign-off rule. Kyan was clear that this isn't Repeat: Repeat makes the next task when one is finished, on a fixed rhythm. Templates are for the routine that doesn't run on a clock: done most days, by different people, sometimes twice a day, sometimes skipped.

So the job to be done: "When I start my outreach for the day, I want the usual task, set up the usual way, in a moment, so I spend my time on the emails and not on the PPM."

Things that follow from that:

- **Speed of use matters far more than speed of saving.** A template is saved once and used hundreds of times. Using one should be two or three actions; saving one can take a few more.
- **The template should come from real work.** People notice a routine *while doing it*: "I've made this exact task three times." So the natural moment to save is from a task that's already right, not from an empty template editor somewhere else.
- **Teams share routines.** One outreach template, set up once by a lead, serves everyone on the team, so it can't be tied to the person who saved it: it should go to whoever uses it.
- **Dates are relative.** "Due today", "due in two days": never a fixed date.
- **Today is never quite the same as yesterday.** The template fills things in; the person changes what's different today before anything is made.

### What other tools do (from general knowledge, not re-checked online during this session)

- **Linear:** issue templates, chosen in the new-issue dialog; they set the fields, the description and sub-issues. Made and edited in settings.
- **Asana:** task templates per project, from the "Add task" menu; subtasks, assignee, relative due dates.
- **Trello:** any card can be made a template; "Create from template" sits next to "Add a card".
- **ClickUp:** "Save as template" on a task, and a template centre.
- **Notion:** database templates in the "New" menu, including repeating ones.
- **Calendars:** Google Calendar and Outlook have no event templates, only duplicate. Fantastical has event templates.

The common ground: templates live next to "create", and filling a form from a template (then reviewing) is the norm. What the PPM does beyond that is listed under "Beyond the usual" below.

### What was built

**Saving a task as a template.** A task's ⋯ menu has **Save as template…**. A small dialog (the app's existing `ModalShell`, like Invite) asks four things, three already answered:

- **Name:** the task's title, selected, ready to overwrite.
- **Assign it to:** *Whoever uses it* (the default when the task is yours), *Always* the current assignee, or *Nobody yet*.
- **Due date:** relative: no due date, the day it's made, the next day, 2, 3, 7 or 14 days later. The default is worked out from the task (its due date minus the day it was made).
- **Share with the team:** off by default.

A line says what's kept: title, description, checklist, priority, project, reviewer, sign-off rule, privacy (and not the due date itself, comments, files or history). Saving under the name of a template you can change replaces it; the dialog says so, and the button reads **Replace template**. That's how a template is updated.

**Using one.** The new-task dialog (press **C**, or any New task button) has **Templates** at the top right, in the same chip style as its other controls, built on the same `PickerMenu` as every picker in the app (search, arrows, Enter). Yours come first, then the team's, with the owner's first name beside theirs. Choosing one fills the form: title, description, status, priority, project, assignee, due date, reviewer, sign-off rule and privacy. Its checklist shows under the description; leave a step out for today with the × beside it. ⌘Enter creates the task and its checklist. The chip stays highlighted with the template's name, like the Repeat and Private chips when they're on.

- **⌘K** lists templates as "New task from …": the first five (yours first) with nothing typed, any of them as you type. Enter opens the dialog filled in.
- **What the opener set wins.** On a project's page, in a board column, on a calendar day, or from "New task for me", that context stays and the template fills in the rest. The template says *what* the task is; the place you started from says *where* it goes.
- **Create more** starts the next one from the template again.

**Calendar.**

- **The arrow beside Plan time** (a split button: Plan time still does what it did) lists your calendar templates and the team's, each with its time of day. A **block** goes straight onto the day (today if it's on screen, else the first day shown; the menu says which), with **Undo** in the confirmation. A **meeting** opens the Plan time dialog filled in instead: it invites people and notifies them, so it waits for a look before anything is sent.
- **When you drag out time,** the Plan time dialog has **Templates** too. It fills in the title, kind, who sees it, ticking off, notes and a meeting's people, and keeps the time you dragged.
- **Saving:** open one of your entries, **Edit**, **Save as template** (bottom left). A small pop-up asks for a name and whether to share it, and says what's kept: the title, the time of day, who sees it, ticking off, notes and a meeting's people, but not the day or a linked task.

**Managing.** Settings has a **Templates** section, between Notifications and Password: tasks, then calendar, yours first. Click a name to rename it; a switch shares yours with the team; the bin deletes (it asks once more: the button turns red and reads Delete for four seconds).

### Click counts for the outreach routine

| | Before | After |
|---|---|---|
| The daily task | C, type the title and description, choose the project, assignee, due date and priority (two clicks each), create; then open the task and type four checklist lines | C, Templates, choose, ⌘Enter. Or ⌘K, "outr", Enter, ⌘Enter |
| The daily time block | Plan time (or drag), type the title, choose who sees it, tick-off switch, Add to calendar | The arrow, then the template: two clicks |

### Beyond the usual

1. **Saved from real work,** at the moment the routine is noticed, instead of in an editor somewhere else.
2. **"Whoever uses it"** as the assignee, so one shared template serves a whole team.
3. **The context you started from wins** over the template (project page, board column, calendar day).
4. **Today's version can differ** without touching the template: leave out a checklist step, change anything before it's made.
5. **Two clicks for a block, with Undo; a stop for meetings.** The principle: anything that notifies other people asks first; anything private and undoable just happens.
6. **A dragged time is respected;** the template fills in everything else.
7. **Keyboard reach:** ⌘K, a few letters, Enter, ⌘Enter.

### Decisions, with what was ruled out

| Decision | Chosen | Ruled out, and why |
|---|---|---|
| Where to save a task template | The task's ⋯ menu | A "Save as template" button in the new-task dialog: a second path, and the dialog has no checklist editor, so templates saved there would lack the most valuable part. A template editor page: a new surface for something done rarely |
| Where to use one | The new-task dialog's header, ⌘K | A Templates page in the sidebar: navigation clutter for a two-click action |
| Fill the form, or create at once | Fill, then review (tasks and meetings); create at once with Undo (blocks) | Creating tasks at once: tasks notify their assignee and usually differ a little each day |
| Updating a template | Save again under the same name: Replace | An editor: one more screen to build, learn and keep in step with the task dialog |
| Personal or shared | Both; personal by default | Shared only: ten people's personal routines would bury everyone's list. Personal only: no way to standardise a team's routine |
| Assignee | Whoever uses it, a set person, or nobody | Always the saved person: wrong for shared routines |
| Due date | Relative, in days | A fixed date: wrong the day after it's saved |
| Repeat in templates | Not kept | Keeping it would blur the two ideas, and each use would start another repeating series |
| Ordering | Yours first, then the team's, by name | By how often they're used: lists that reorder themselves are harder to learn, and a team has a handful of templates; search covers the rest |
| Adding a block to every weekday at once | Not built | Considered (it's the Monday-morning planning case). Two clicks a day already removes the pain; a multi-day option adds a control to every use. A good next step if the team asks |
| A task template that also blocks time | Not built | Blocks belong to the person making them, so it only works when the template assigns the task to yourself: a rule that would surprise people. Worth revisiting |
| Data model | Two typed tables, `ppm_task_templates` and `cal_event_templates` | One table with a JSON blob: no foreign keys (a deleted project or person would linger inside the JSON) and no checks on the fields |
| Checklist storage | A `text[]` column on the template | A separate template-checklist table: extra joins and writes for a list that's always read and written whole |

### The database (migration `20261004000200_templates.sql`)

- Two tables, with the same checks as the rows they make (statuses, priorities, sign-off rules, visibility, times), plus: a template can only start a task as Backlog, Todo or In progress; due offsets 0 to 365 days; at most 100 checklist steps; a calendar template ends after it starts.
- **Who sees and changes what:** you see your own and every shared one; you change and delete your own; an admin can also rename or delete a shared one (say, once its owner has left), but can't make it private or take it over. A trigger keeps the owner and the creation date fixed. Twelve checks against the API, as staff, admin, super admin and signed out, confirmed each rule.
- Projects, people and reviewers are foreign keys that become empty if what they point to is deleted, so a template never breaks. Applying one leaves out people who have been deactivated, and projects that are archived or closed (the project pickers hide those too).

### Edge cases handled

- A template made from a private task makes private tasks; the dialog warns that sharing it shows the team its title.
- "Chosen people" templates keep their people; if all of them have left, the new-task dialog's existing check asks for someone.
- If adding the checklist fails after the task was made, the task is kept and a message says the checklist is missing, rather than failing (which would invite a duplicate).
- If the database update hasn't been applied, templates simply don't appear; nothing else breaks.

## Task 3: the eye on password fields

There are five password fields, not two: sign-in; the welcome page that invitation and reset links open (new password, type it again); and Settings (the same two). All five now use one component, `src/components/app/password-input.tsx`.

- **The icon** is the app's own pair: an open eye (`ViewIcon`) to show, a closed eye (`ViewOffIcon`) to hide, the same icons the calendar uses for shown and hidden. The button's label always says what it will do: "Show password", "Hide password".
- **One eye per field,** as most sites do; predictable for screen readers. A single "show both" toggle was considered and ruled out for that reason.
- **The cursor stays where it was.** A click doesn't take focus out of the field, so typing can go on. Chrome moves the cursor to the start of a field when it changes type; this was found by a test that typed, clicked the eye, and kept typing (it produced "-2026rtc-demo"). The component puts the cursor back on the next frame.
- **Keyboard:** the button can be reached with Tab and pressed with Enter or Space (removing it from the Tab order would leave keyboard users without it).
- **It hides again when the form is sent,** so the password isn't left on screen and password managers see a password field when they offer to save it.
- **Edge's own eye** is hidden, so there's never two.
- **Not added:** a Caps Lock warning. Browsers increasingly show their own, and it wasn't asked for.

## Task 4: archiving and deleting projects

### What was there

`ppm_projects.archived` has been in the schema since the first PPM, and the sidebar and project pickers already hide archived projects, but nothing could set it. Deleting was allowed for admins by the database (`ppm_projects_delete`), with no button anywhere. Tasks keep existing if their project goes (their `project_id` becomes empty).

### Archive and Closed: why both

The portfolio already has a **Closed** status. They mean different things:

- **Closed:** the work is finished. It stays in the portfolio under Closed, for reference.
- **Archived:** take it out of the way, everywhere, without losing anything. For things that shouldn't have been projects, duplicates, or what nobody needs to see again.

A test project shouldn't be marked Closed: that would claim finished work. It should be archived, or deleted.

### What was built

- **A ⋯ menu** on a project's page (after New task, as on the task panel) and on its row in the portfolio (shown on hover, as on People).
- **Archive project / Restore project,** for whoever can manage the project: its owner, an owner-member, or an admin (the same people who can edit it; the database already enforced this). Reversible, so it doesn't ask first: the confirmation offers **Undo** and says how many open tasks the project has, since those stay in All tasks.
- **An archived project** leaves the portfolio's tabs for a new **Archived** tab (after All), and the home dashboard, the command menu, the sidebar and the project pickers. Its page still opens, with a quiet bar: "This project is archived…" and **Restore**.
- **Delete project…,** for admins only. It can't be undone, so it asks first: the dialog says what goes, suggests archiving instead, and asks about the project's tasks: **Keep them** (the default; they stay in All tasks, with no project) or **Delete them too** (for a test project; they're deleted like any task). The red button says exactly what it will do: "Delete project and 2 tasks".
- **The database (migration `20261004000100`):** `ppm_delete_project(pid, delete_tasks)` does it in one transaction, so it never stops halfway. It checks the caller is an admin before anything else (so nobody else learns even whether a project exists), deletes tasks the app's usual way (hidden, with a "deleted" line in their history), and never touches tasks the caller can't see. Signed-out calls are refused outright.

### Considered and not done

- **Letting a project's owner delete it while it's empty.** That would let Kyan (staff) delete his own test project. Reasonable, but it changes the permission model from the revamp ("delete: admins"). Owners can archive, which hides it everywhere; an admin can delete. In the backlog as an option.
- **Hiding archived projects' tasks.** Tasks are the record of work; open work silently disappearing from All tasks would be worse than a few tasks with an archived project's name.

## Found on the way: the calendar entry buttons

Clicking one of your calendar entries opens its details, with **Tick off**, **Edit** and a delete button. None of them worked: pressing one opened a new Plan time dialog at the height of the pointer. The details float outside the day's column on the page, but React still passes their presses up to the column, whose press handler starts drawing a new block; its check ("did the press start on an entry?") looked at the page, not at React's tree. The column now ignores presses that didn't start inside it. Reproduced on the untouched sample data before the fix; checked after it, and covered by a new smoke check. Its own commit, `b00c18f`.

## The "Chosen people" orange border

### What it is

When a task's sign-off rule is set to **Chosen people** in the new-task dialog, a chip appears to choose them. While nobody is chosen, it has an amber border: `border-warning/60` in `create-task-dialog.tsx`. In the task panel, the same state shows "Choose people" in amber text (`text-warning`). It came from Kenneth's Claude, commit `23144d3` (2026-10-03), fixing backlog item 2: "Chosen people" could be saved with nobody chosen, which left a task only admins could finish.

### Is it intentional? Yes. Why it was probably built that way

Reconstructed from the code and the commit, since that session's reasoning isn't recorded:

- **The token's meaning in this app.** `--warning` (amber: `#f0b33d` dark, `#9a6a00` light) is used for things that need attention but aren't errors: due today, more work than the load limit, "Invited" (not signed in yet), draft handbook articles, "At risk" project health, paused projects, CSV rows with notes. An empty required choice "needs attention", so the token fits the letter of that meaning.
- **Token discipline.** It used a semantic token rather than a raw colour, as `globals.css` asks.
- **The task framing.** Backlog item 2 asked that the rule "can't be saved without at least one person". The session focused on blocking the bad save (it also blocks it with a toast) and on making the empty state noticeable. The amber border is the "noticeable" half.
- **What it could check.** It verified behaviour (the smoke and menu tests passed, and it checked in a browser) but had no written design rules to check the look against.

### Why it feels out of place (Kyan's instinct is right, and here's the objective case)

1. **It's the only coloured border state in that dialog.** Every other chip is neutral. The one "on" state the dialog has (Repeat, Private) uses the brand blue, `border-brand/50`. An amber border appears nowhere else on a form control in the app.
2. **It warns before anything is wrong.** The border appears the instant "Chosen people" is picked, before the person has had a chance to choose anyone. Form-design guidance is consistent here (Nielsen Norman Group, GOV.UK, Adam Silver's *Form Design Patterns*): don't show a field as wrong until the person has finished with it or tried to submit. Early warnings read as scolding.
3. **Amber already means something else here:** time and risk (due today, at risk, overloaded). On a form chip it reads like a warning *about the task*, not "fill this in".
4. **The real error lands elsewhere.** If they press Create anyway, the error is a toast at the corner of the screen, away from the chip that needs fixing.

### A recommendation (not implemented: the brief asked why, not for a change)

- **Open the people picker as soon as "Chosen people" is picked.** It's the only possible next step, so it saves a click and removes the empty state for most people.
- **Keep the chip neutral** while empty ("Choose people…"), like every other chip.
- **If they try to create without anyone,** mark that chip with the error colour (`danger`), put a one-line message under the chips, and move focus to it. The error appears at submit time, at the field.
- **In the panel,** the deferred save (the rule changes only once someone is chosen) is good and should stay; swap the amber "Choose people" for neutral text and keep its existing footer hint.

### What Kenneth's Claude had, and what it lacked

It had: this repository's code and tokens, `README.md`, `DEPLOY.md`, the backlog's description of the bug, and the existing component patterns. It lacked:

- **Colour rules:** what each token means and where it may be used ("warning: time and risk; never form validation", for instance).
- **A form-validation pattern:** when to validate, which colour, where the message goes.
- **The design references and rules** listed in backlog item 6 (the dashboards studied, "dark first, more blue and less green", "no gradients, emojis, cards inside cards").
- **Someone to look at it.** A screenshot reviewed by a person would have caught this in seconds.

This session had the same gaps. The same reconstruction method (read how tokens and components are already used, follow the most common pattern) produced the templates' "on" state in brand blue, matching Repeat and Private.

## What would have helped this session (for the knowledge base)

In order of how much each would have saved:

1. **Design rules,** short: colour semantics per token; states (selected, on, needs attention, error); form validation; when to use a dialog (`ModalShell`), a pop-up (`Popover`), a picker (`PickerMenu`), a menu (`DropdownMenu`) or a split button; the voice of the copy (the code shows it consistently: plain, short, kind).
2. **A permissions table:** role by action (people, projects, tasks, sign-off, templates, handbook), naming where each rule is enforced (database, server action, screen). It would have made Task 1 a lookup.
3. **Production facts:** who the super admins are, which email each person signs in with, how to check roles, and who may run SQL.
4. **The decisions log** backlog item 6 asks for: what was decided, by whom, why (for example, admins signing off in someone's place: kept by Kenneth on 2026-10-03).
5. **How people actually use the PPM:** the outreach team's day, what Christian measures, what Kenneth checks each morning. Templates were designed from one sentence about the outreach team.
6. **Running it in a cloud session:** now in `README.md`.

## Process notes

- **One branch, at Kyan's request.** `CLAUDE.md` prefers small, single-purpose pull requests. Kyan asked for one branch; to keep review easy, it's eight commits in conventional form (three fixes, three features, the tests, the docs), each with a body that says why and how it was checked. If Kenneth prefers separate pull requests, they can be split by cherry-picking: the role fix, the password eye and the calendar fix stand alone; templates and projects each carry their own migration (`94629ed` belongs with the projects commit).
- **The branch name** follows the proposal in [../git-conventions.md](../git-conventions.md): `kyan/feat/ppm-templates-and-archive`. `CLAUDE.md` asks for `kyan/<topic>`; this keeps that prefix and adds the type and the app.
- **Not touched:** the portal, WanderWise, the public site, the live database, Vercel.

## Verification

All on Node 24.21.0 (the `engines` version), against the local stack with the sample data:

- `npm run typecheck`: no errors. `npm run lint`: no problems. `npm run build`: succeeds, all 23 routes.
- `npm run test:smoke`: **32/32** (23 before this session, all still passing).
- `npm run test:menus`: **all menus open cleanly**: 261, 293 and 265 menus and pop-ups on 16 screens, as Kenneth, Kyan and Carl. It covers the new ones on the portfolio, project pages and the calendar; the pickers inside the new-task and Plan time dialogs are covered by the smoke test instead.
- `supabase db reset`: all thirteen migrations and the seed apply cleanly from empty.
- In a browser, with screenshots, dark and light where it matters: every flow in this report, as staff, admin and super admin.
- **Client** (the fourth role in `CLAUDE.md`'s rule): clients can't open the PPM at all, so a throwaway client account was checked against the API. It sees no templates, can't save one, can't archive a project, and is refused deleting one with the same message as staff. That check found the delete function looking for the project before checking the caller, which told a client "That project no longer exists"; the order was swapped before the migration was applied anywhere but locally.

**Couldn't verify:** anything on the live PPM (its data, Vercel, Microsoft 365). In particular, the cause of Task 1 is a strong inference, not an observation: Kenneth's 10-second check settles it.

## Files changed

| Area | Files |
|---|---|
| Roles | `src/domains/people/actions.ts`, `src/domains/people/components/people-page.tsx` |
| Password eye | `src/components/app/password-input.tsx` (new), `src/domains/auth/components/login-form.tsx`, `set-password-form.tsx`, `src/domains/people/components/settings-page.tsx` |
| Projects | `supabase/migrations/20261004000100_project_archive_and_delete.sql` (new), `src/domains/projects/data.ts`, `components/project-menu.tsx` (new), `projects-page.tsx`, `project-page.tsx`, `src/components/app/command-menu.tsx`, `src/domains/dashboard/components/home-dashboard.tsx` |
| Templates | `supabase/migrations/20261004000200_templates.sql` (new), `src/domains/templates/` (new: `data.ts`, `components/save-task-template.tsx`, `template-pickers.tsx`, `templates-settings.tsx`), `src/domains/tasks/components/create-task-dialog.tsx`, `task-panel.tsx`, `src/domains/tasks/data.ts`, `src/components/app/ui-state.tsx`, `command-menu.tsx`, `src/domains/calendar/components/event-dialog.tsx`, `calendar-page.tsx`, `src/domains/people/components/settings-page.tsx`, `supabase/seed.sql` |
| Calendar fix | `src/domains/calendar/components/time-grid.tsx` |
| Both migrations | `src/lib/supabase/database.types.ts` (regenerated; before this session, regenerating reproduced the committed file exactly) |
| Tests | `tests/smoke.mjs` |
| Docs | this report, `../briefs/2026-10-04-kyan-voice-brief.md`, `../git-conventions.md`, `../README.md`, `../backlog.md`, `../DEPLOY.md`, `../../README.md` |
