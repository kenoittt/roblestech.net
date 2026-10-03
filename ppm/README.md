# RTC PPM (the revamp)

The new PPM for Robles Technologies Corp.: tasks people can find, a home dashboard, projects, the team calendar and the handbook, in one fast workspace. It replaces the Astro PPM at `ppm.roblestech.net` once it's ready to deploy.

**Kind:** CODE, with this README as its MAINTAINED guide. Plan and decisions: `../RTC-Website-Notes/docs/plans/ppm-build-plan.md`.
**Started:** 2026-10-02, by Kyan and Claude, from Kyan's voice plan (`../RTC-Website-Notes/docs/raw/2026-10-02_Kyan-voice-plan-for-the-revamp.md`).

## What works today

- **Sign-in** with the same roles as the live PPM: super admin, admin, staff. Clients are refused.
- **Home:** your work first (overdue, today, the next 7 days), your plan for today, what's waiting for your sign-off. Then the team: workload per person, tasks finished over 14 days, project health, what's late, recent activity.
- **Tasks:** list, board and calendar views of the same tasks, switchable per screen and remembered per person. Filters, search, grouping and ordering. Every property is editable where it sits. Select several rows to change them together. Drag on the board to change status, or on the calendar to change the due date. On the board, a card in review says who it's waiting on.
- **Assigning:** the assignee menu shows each person's open and late work, so you can see who has room before you assign.
- **The task panel:** opens beside the list without a page load. Title, status, priority, assignee, due date, a repeat (every day, weekday, week, two weeks or month: finishing one makes the next, with the same people and rules), project, reviewer, sign-off rule, description (Markdown), checklist, files (up to 25 MB each, private to whoever can see the task), history and comments, with @mentions that notify the person.
- **Sign-off rules:** each task says who can mark it done (anyone, not the assignee, the assigner, the reviewer, or chosen people). The database enforces it. Sending a task for sign-off notifies the people the rule names. Admins can sign off in that person's place (say, when a reviewer is away): the button reads "Sign off as admin" and the history records it as such.
- **People:** the team with roles and workload; invite by email, change roles, deactivate with a handover of open work, send password resets. Only super admins manage admins.
- **Projects:** a portfolio with health and progress, and a page per project with what's late and who's carrying it, above its tasks.
- **Calendar:** your week and the team's day; drag to block time, drag a block to move or resize it, link a task, invite people to meetings; each entry public, busy-only or private, and whole days or weeks hidden; ticked off by hand or automatically, with a line under each day showing done against planned. "Copy my plan" puts your day on the clipboard for the team chat.
- **Handbook:** a documentation layout with search, an outline per article, "Was this helpful?", and a Markdown editor for admins.
- **Inbox, activity log, command menu (Cmd K: pages, tasks, projects, people, handbook articles), keyboard shortcuts, settings** (including a profile photo).
- **Email:** each assignment, sign-off request, comment and meeting invitation is emailed once; an 8 AM digest of what's overdue, due and on the calendar. Locally they land in the mail catcher.
- **Import and export:** tasks from a CSV, checked in a preview first; all tasks to a CSV.
- **Live updates:** someone else's change appears without a refresh, in about half a second.
- **Dark first,** following the system setting; light works too.

Still being built: see "Status" in the build plan.

## Run it locally

You need Node 24, and Docker for the local database. On a Mac, Colima provides Docker.

```bash
# 1. Docker (once per restart of the Mac)
colima start --cpu 4 --memory 6

# 2. The local database: the live schema, the revamp's additions and sample data
npx supabase start          # first run downloads images; a few minutes
# Optional, to start over with fresh sample data:
npx supabase db reset

# 3. The app
npm install
npm run dev                 # or `npm run dev:poll` if the page never loads (see below)
```

Then open http://localhost:3000.

**`.env.local`** holds the local database's address and keys. They're the local stack's defaults, printed by `npx supabase status -o env`. Copy `API_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY` into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, and set `NEXT_PUBLIC_DEMO_MODE=true`. Never put production keys in it.

### Sample accounts

Every sample account uses the password `rtc-demo-2026`. The sign-in page lists them in demo mode, and the account menu can switch between them.

| Person | Email | Role |
|---|---|---|
| Kenneth Robles | kenneth@rtc.test | Super admin |
| Christian Panes | christian@rtc.test | Super admin |
| Kyan Lumanog | kyan@rtc.test | Admin |
| Andrei | andrei@rtc.test | Admin |
| Carl | carl@rtc.test | Staff |

The people are RTC's team; the tasks, comments and calendar entries are made up. Dates are relative to the day the sample data loads, so the demo always looks current.

### Local tools

| What | Where |
|---|---|
| The app | http://localhost:3000 |
| Emails (invitations, resets) land here | http://127.0.0.1:54324 |
| Database browser (Supabase Studio) | http://127.0.0.1:54323 |

### If something hangs on a Mac

- **`npx supabase …` prints nothing and never finishes:** macOS is asking whether the Supabase tool may read your Documents folder, and the prompt may be hidden behind other windows. Allow it in System Settings, Privacy and Security, Files and Folders.
- **`npm run dev` says Ready but pages never load:** the file watcher is stuck. Use `npm run dev:poll`, which watches by polling instead.

### Check it works

```bash
npm run test:smoke   # with npm run dev running: 23 end-to-end checks, about a minute
npm run test:menus   # opens every menu, popover and picker on every screen, as three roles; about seven minutes
```

The smoke test signs in as different people and checks the main flows against the database: creating and assigning, the panel, comments, delete and undo, dragging on the board and the calendar, the invitation email through to setting a password, the sign-off rules (who is asked to sign off, and an admin signing off in someone's place), repeating tasks, and live updates. The menu test catches a menu that breaks its screen when opened, which the smoke test can miss; it changes no data.

## A ten-minute demo

1. Sign in as **Kyan**. Home answers "what do I do today?" first: what's overdue and due, today's plan, what waits for your sign-off. The team's load and the projects come after.
2. Open **All tasks**. Switch List, Board, Calendar; the choice is remembered. Group by assignee from Display.
3. Press **C** to create a task. Assign it: the menu shows everyone's open and late work, and who has the most room. The email lands at http://127.0.0.1:54324.
4. Click a task: the panel opens beside the list. Change its status, comment (type @ to mention someone), attach a file, open the sign-off rule.
5. On the **board**, drag a card to In review. As an admin, Kyan can still mark it done in the reviewer's place: the panel's button says "Sign off as admin", and the history says so.
6. Open the **calendar**. My week: drag down an empty slot to block time, drag a block to move it, or its bottom edge to change when it ends; the line under each day shows how much of the plan is done. Team day: everyone's plan side by side; Christian's appointment shows only as "Busy".
7. Open **People**. Invite someone, open the email in the mail catcher, and set their password.
8. Switch to **Carl** (staff) from the account menu. He can't change roles, and dragging Christian's report (RTC-18) to Done is refused, with the reason: it needs Kenneth's sign-off.
9. Open a **project**: health, what's late, who's carrying it, then its board.
10. Open a second browser window as **Kenneth** and rename a task: it changes in Kyan's window by itself.

For the smoothest demo, run the production build: `npm run build && npm start`, then open http://localhost:3000 (stop `npm run dev` first, or use `npm start -- -p 3001`).

## How the code is organised

Folders follow the business, not the framework (domain-driven):

```
src/
  app/                 routes only: each page is a thin file that renders a domain screen
  components/ui/       shadcn components on Base UI, restyled to our tokens
  components/app/      app-wide pieces: shell, sidebar, page frame, charts, icons, avatars
  domains/
    workspace/         who's signed in, the team, projects, live updates, preferences
    tasks/             task model, rules, views (list, board, calendar), panel, pickers
    dashboard/         the home screen
    people/            user management, and its server actions
    projects/          portfolio, project pages, project form
    calendar/          the team calendar
    handbook/          the handbook (docs layout)
    inbox/             notifications
    auth/              sign-in, invitations, passwords
  lib/                 Supabase clients, dates (always Manila time), settings
supabase/
  migrations/          the live schema (baseline), then the revamp's additions
  seed.sql             sample data, local only
  templates/           invitation and password emails
```

**The design system** lives in `src/app/globals.css`: every colour, size, radius and motion curve as a token. Change a token there and it changes everywhere.

**Data:** the server loads the team, projects and live tasks in one round of parallel queries; after that the browser keeps them in a cache, so views switch instantly and edits show at once while they save. Writes go through row-level security and database triggers, which also write each task's history and the notifications.

## Before this replaces the live PPM

See [docs/DEPLOY.md](docs/DEPLOY.md): the two fixes first, the switch in one sitting (keeping the current database, or starting fresh), the production settings, accounts, the handbook, and how to roll back. What's left to do is in [docs/backlog.md](docs/backlog.md); [docs/](docs/README.md) is the project's knowledge base.
