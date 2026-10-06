# Session report: Kyan's briefs of 2026-10-06 and 2026-10-07

What Kyan's local Claude did with Kyan's evening brief of 2026-10-06 and his review the next day, what it considered and ruled out, and why. Written for Kyan, for Kenneth (who merges), and for any later session. The brief itself stays in Kyan's private notes; this report quotes it where it matters.

**Branch:** `kyan/feat/ppm-templates-and-calendar`, from `kyan/docs/knowledge-base-follow-ups`, so it also carries the docs of the closed pull request #18 ("these docs will come with the next round of fixes"). One pull request, at Kyan's request, as a series of small commits.

## In one page

| Asked | Outcome | Commits |
|---|---|---|
| Templates don't work on the live PPM | **Almost certainly the 2026-10-04 database updates were never applied.** Templates work end to end on a local copy of every update. Only Kenneth can check the live database; the steps are on [his page](../../../docs/for-humans/kenneth.md), item 1. Until then, the app says templates need a database update instead of showing an empty list | `bbfb7be` |
| Make templates without making a task first | A **Save as template** switch in the new-task dialog and in Plan time; New and Edit in Settings; New template… under Plan time's arrow ([decision 0012](../decisions/0012-templates-are-made-where-work-is-made.md)) | `bbfb7be` |
| Plan time's arrow looked like a second button | One button in two parts, with one hairline (`splitButton()`) | `0e8b7d1` |
| Finishing a task should tick off its time blocks | A database trigger ticks them off, and unticks them if the task is reopened. Ticking off by time still works | `6cc9439` |
| A people picker that scales, for meetings | `PeoplePicker`: photos and names in the field, search behind it. Also for project members, and a search in the Filter menu's long lists | `d9af1e8`, `7eb286b` |
| Copy my plan, customizable | A message before and after, which parts show, and how finished entries look, saved per person | `04eebb9` |
| Calendars that overflow | The month view shows what fits and "N more"; crowded hours fold into "+N" | `bd41d80`, `425c2cc` |
| A new task from Plan time | Type a name in "For a task", choose New task | `d5e03bd` |
| Dates overlapping on a person's page | Fixed with the month view | `425c2cc` |
| Colours for time blocks | Five, chosen to avoid the colours that already mean something | `9ac2a91` |
| The day ends at 10 PM; blocks can't cross midnight | All 24 hours; blocks can end the next day or days later (Starts and Ends, each a date and a time) | `25aad34`, `be8f5c1` |
| Goals: a Handbook reading view, a Gantt chart | Backlog items 29 and 30 | `361da14` |
| **The review, 2026-10-07:** multi-day wasn't findable, the select arrow, two colour pickers, a spilling chip, the board's first card, Cmd+Enter, sample data | All done (backlog item 32), plus an audit goal for shared components (item 33) | `e0d654c` to `0281574` |

## What Kenneth needs to do

1. **Before merging:** bring the live database up to date. Four updates, two of them possibly applied already. The exact command and what to expect: [`docs/for-humans/kenneth.md`](../../../docs/for-humans/kenneth.md), item 1. Each one only adds things, so the live PPM keeps working once they're in.
2. **Merge,** then try three things on the live PPM: press C, turn on Save as template and save one; in Plan time, plan a block from 10 PM to 2 AM; finish a task that has a block, and see the block ticked off.

Nothing else: no settings, no accounts.

## How the work was done

- **Read first:** the knowledge base, the guides, the backlog and log, the 2026-10-04 report, and the screenshots Kyan left in `ppm/docs/references/` (left untracked: they show real task titles and an email).
- **Checked for other work:** no open pull requests, and `main` unchanged since the branch began.
- **A baseline before any change:** the smoke test passed 28 of 31 at first. The three failures were templates, because the local database had been seeded before templates existed. With the sample templates added, 32 of 32. That was also the first evidence for the live diagnosis: the code works, so the live database is the likely cause.
- **Every change checked in a browser,** with screenshots at laptop and phone widths, dark and light, signed in as staff, admin and super admin where it mattered.

## Templates

**The live problem.** The 2026-10-04 pull request added two database updates. If they weren't applied before the merge, templates have no tables to read or write. On the screen that looks like an empty list, and saving fails. The app can't fix a missing table, but it can say so: when the database has no templates yet, the pickers and switches now say "Templates aren't available yet: the database needs an update first."

**The revamp.** Making a template took about eight clicks and a throwaway task. Now: C, the switch, type, ⌘Enter. With the switch on, the same dialog shows what only a template has (its name, who it's for, a due date relative to the day it's used, a checklist built right there, shared or not), and the button says Save template. Settings gains New and Edit, and Edit opens the dialog the template was made in. A task's ⋯ "Save as template…" opens the same dialog, filled in from the task, so the separate save dialog was removed. Why, and what was ruled out: [decision 0012](../decisions/0012-templates-are-made-where-work-is-made.md).

**The split button.** The arrow beside Plan time was 2 px taller than the button, with a dark seam and a light edge between them. The button had a clear 1px border that clipped its colour, and the arrow had none. `splitButton()` gives both parts one shape and one hairline, at the same height as every small button. Kyan wondered whether templates belong there at all. They do: a routine block lands in two clicks, it's the usual pattern (GitHub's merge button, Gmail's send), and the dialog's own Templates picker covers dragging out time first.

## The calendar

- **All 24 hours.** The day ran from 7 AM to 10 PM; the team works at any hour. It now runs from 12 AM to midnight and opens just before the current time, or at 8 AM on other weeks.
- **Past midnight and over days.** The database already allowed it (`ends_at` only has to come after `starts_at`), so this was the screen's job. Each day shows its own piece of a block, square-cornered where it carries on, with its title kept in view as you scroll. Pieces that cross midnight change in their details, not by dragging, as Kyan confirmed. Plan time first hid the end date until a next-day time was chosen; Kyan couldn't find multi-day that way, so it now always shows **Starts** and **Ends**, each a date and a time, as Google Calendar, Outlook and Apple's calendar do.
- **Crowded hours.** Entries share a column only while each is at least 60 px wide; the rest fold into a "+N" that lists them and opens any one. The due tasks above a day open the same way.
- **The month view.** Rows had a minimum of `minmax(0, 1fr)`, so on a short screen (a person's page) they shrank below their cells, which then overlapped the next week. That's why the dates drifted and the shading landed a row too low. Rows now have a real minimum; each day measures how many tasks fit, shows open ones first, and "N more" lists the rest.
- **Colours.** Blue (the usual), teal, purple, pink and slate, as tokens with a shade for each theme, all above 3 to 1 against the page in both. Green, amber, red and orange are left out: in the PPM they mean done, time and risk, errors and urgent. Meetings keep their violet. Templates keep a block's colour.
- **A new task from Plan time.** In "For a task", typing a name offers "New task …". The task is made, for you, only when the block is saved, so cancelling leaves nothing behind.
- **⌘Enter** saves in Plan time, as in the new-task dialog, but not from inside its pickers and pop-ups.

## Finishing a task ticks off its blocks

Kyan first thought of disabling the "tick off automatically" switch for blocks with a task, then decided against it: you can work on a task in a block without finishing it. So finishing the task ticks off its blocks, and nothing else changes. The rule lives in the database (migration `20261007000100`), because the person finishing a task (a reviewer, an admin) often doesn't own its blocks, and row-level security would stop the app from changing them. The trigger stamps the blocks with the task's own finishing time, so reopening the task unticks exactly those and leaves alone any block someone ticked off by hand. Future blocks for a finished task are ticked off too, as asked; deleting them was considered and ruled out, since it would remove what someone planned.

## Copy my plan

The team pastes it into Teams every day, so one click still copies it, now worded each person's way. The arrow beside it holds a message before and after, which parts show (title line, times, task codes, tasks due), and how finished entries look (as they are, struck out, with ✓, with DONE), with a preview of exactly what will be pasted. It's saved in the person's profile preferences, so it follows them to any computer, with no database change. It copies rich text and plain text together, so Teams keeps a real strikethrough. In plain text the strikethrough uses a combining character. The toast offers "Change how it reads" only until someone has changed it once.

## Shared components

Kyan asked why the two colour pickers differed, and for an audit of what else should be shared. The principle, now in [`how-we-work.md`](../../../docs/how-we-work.md#build-for-scale-in-three-ways): share what means the same thing, keep in its domain what only one domain uses, and don't merge things that only look alike. Kyan's instinct that scoped components still matter is right.

Done now, because the fixes needed them:

- `NativeSelect` and `fieldClass` (`src/components/ui/field.tsx`). The select keeps native behaviour (phones' own pickers, the keyboard) with the app's arrow inset like any icon, and the field style replaces twelve copies.
- `SwatchPicker` (`src/components/app/swatch-picker.tsx`) for project and block colours, beside the name in both. Project colours also gained names for screen readers, in place of hex codes.
- `PeoplePicker` and `splitButton()`, above.

The rest is backlog item 33, with what was found so far.

## Sample data

The local database is now seeded with the real team, as Kyan listed them: Kenneth (CEO and co-founder) and Christian (COO and co-founder) as super admins, Kyan as an admin, and Joshua and Carl John (Client Solutions Associates) as staff. The clients are invented: Northline Nutrition in place of a real client, and Brightwater Dental, which hasn't started yet. Beyond that, it holds data for every option: coloured blocks, blocks past midnight and over three days, an hour with five things at once, a day with seven tasks due, each sign-off rule, private and repeating tasks, start dates, planned and archived projects, @mentions, templates of each kind, and two people's Copy my plan choices. In all: 9 projects, 73 tasks, 46 calendar entries and 13 templates. It's a rule now: local databases start full, and a feature isn't done until the seed has data for it (the repository's `CLAUDE.md`, rule 7).

The smoke test relies on a few facts in it, which the seed now says out loud: task numbers RTC-18 and RTC-36, the "Daily outreach" and "Outreach block" templates, nothing in Kyan's evenings, and nothing more on Carl John's mornings.

## Messages for people

Kyan asked that anything needed from someone land where they, or their Claude, will see it. `CLAUDE.md` rule 10 now says so: write it on the person's page in `docs/for-humans/`, say so in the pull request, and every session reads its person's page when it starts and passes on what's waiting. Kenneth's page lists the database updates; Kyan has a page now too.

## Decisions, and what was ruled out

| Decision | Chosen | Ruled out, and why |
|---|---|---|
| Where templates are made | A switch in the dialogs that make the work | A templates page: a second place to learn, which Kyan didn't want |
| Plan time's arrow | Kept, as one button in two parts | Removing it: the two-click path for a routine block is worth it |
| An entry's times | Starts and Ends, each a date and a time, always shown | An end date that appears only when needed: nobody found it |
| Crossing midnight on the grid | One piece per day; changed in its details | Dragging a piece: it's unclear what moving a part of a block means |
| Too many entries at once | Lanes at least 60 px wide, then "+N" | Ever-narrower slivers, as the PPM did and most calendars still do |
| A task's blocks when it's done | Ticked off by a trigger; unticked on reopening | Disabling auto tick-off for blocks with tasks (Kyan's second thought); deleting future blocks |
| Copy my plan's settings | Profile preferences, no database change | Browser storage: it wouldn't follow people to another computer |
| Block colours | Five names, drawn per theme | Free colour values: they can't follow dark and light, or the meanings |
| Templates of several days | Not possible: a calendar template keeps one day | Templates over days: the table stores a time of day, and nobody asked |

## Mistakes, and what they taught

- **A feature that can't be found doesn't exist.** The first version hid multi-day blocks behind a next-day choice. The standard layout, with both dates always visible, costs one row and is found at once.
- **Stage files by name.** A `git add ppm/docs` swept Kyan's untracked screenshots, with real task titles and an email, into a commit. They were taken out of the history before anything was pushed, and Kyan's page now suggests moving them to `ppm/docs/private/`.
- **No chip should wrap.** One long label broke out of its chip; every chip now stays on one line.

## How it was checked

All on Node 24 against the local database, reset from empty with all fifteen migrations and the new seed:

- `npm run typecheck` and `npm run lint`: clean. `npm run build`: succeeds.
- `npm run test:smoke`: **35 of 35**, three of them new: a task's blocks follow it to done and back; Save as template saves a template and makes no task; a block can end after midnight, for a task made in Plan time.
- `npm run test:menus`: every menu and popover opens cleanly on 16 screens as a super admin, an admin and staff.
- In a browser, with screenshots: every change above, at 1440 by 900 and 390 by 844, dark and light. The block trigger was also tried in a rolled-back transaction: blocks ticked by hand stay ticked when the task reopens, and meetings are never touched.

**Couldn't check:** the live database (only Kenneth can, item 1 of his page); a real paste into Microsoft Teams (the clipboard holds the right rich text and plain text, but the paste itself is Teams' doing); the Vercel preview; how selects look on Windows.

## For the next session

The backlog has what's left: the Handbook articles for templates (item 14, now for the new flow), a reading view for Handbook articles (29), the Gantt chart (30), the shared-components audit (33), and templates for every weekday at once (15).
