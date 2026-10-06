# How the PPM is built

The stack, the folders, how data moves, and where the rules live. For the database itself, see [database.md](database.md). Checked against the code on 2026-10-06.

## The stack

| Part | What | Notes |
|---|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack, React Compiler), React 19.2 | **This Next.js has breaking changes.** Read the guide in `node_modules/next/dist/docs/` before using any Next.js API (`AGENTS.md` says so too). Notable: `src/proxy.ts` replaces `middleware.ts`; route `params`, `searchParams` and `cookies()` are async; `after()` runs work once the response is sent |
| Styling | Tailwind CSS 4, with the design tokens in `src/app/globals.css` | See [design-system.md](design-system.md) |
| Components | shadcn on Base UI (`@base-ui/react`), restyled; Hugeicons; Inter through `next/font`; `next-themes` | Unstyled, accessible building blocks: Base UI handles keyboard, focus and screen readers, and our tokens decide every pixel |
| Data in the browser | TanStack Query 5 | A cache seeded by the server, with optimistic updates |
| Other libraries | `sonner` (toasts), `cmdk` (⌘K), `dnd-kit` (drag and drop), `motion` (the panel), `react-markdown` with `remark-gfm`, `react-day-picker`, `date-fns` with `@date-fns/tz`, `zod` | Add a library only when plain HTML, CSS or a small component can't do the job |
| Backend | Supabase project A, shared with the client portal: Postgres with row-level security, Auth, Storage, Realtime; `@supabase/ssr` for sign-in cookies | See [database.md](database.md) |
| Hosting | Vercel, functions in Singapore (`sin1`, next to the database); a daily cron at 00:00 UTC (8 AM Manila) | `vercel.json` |
| Runtime | Node 24 (`engines` in `package.json`) | Build and test on it: production uses it |

## The folders

Folders follow the business, not the framework (domain-driven):

```
src/
  app/                  routes only: thin pages that render a domain's screen
    (auth)/             sign-in and the welcome page (set your password)
    (app)/              everything behind sign-in; layout.tsx loads the workspace
    api/                the photo route, and the 8 AM reminder (cron)
    auth/confirm/       where invitation and reset links land
  proxy.ts              refreshes the session on every request; /login, /auth/* and /api/cron/* are public
  components/ui/        building blocks (shadcn on Base UI), restyled to our tokens
  components/app/       app-wide pieces: shell, sidebar, page frame, ModalShell, Avatar, Icon, charts,
                        the command menu, shortcuts, PasswordInput, ui-state (which dialogs are open)
  domains/<area>/       one folder per business area: auth, calendar, dashboard, handbook, inbox,
                        people, projects, tasks, templates, workspace
  lib/                  shared helpers: Supabase clients (client, server, admin), dates in Manila time,
                        email, settings (env), CSV, cn and safeNext
supabase/               migrations, local sample data (seed.sql), local email templates, config
tests/                  smoke.mjs (end to end) and menus.mjs (every menu opens)
```

Inside a domain, the usual files are:
- `data.ts`: the queries and changes, as TanStack Query hooks.
- `actions.ts`: server actions, for privileged work. Each checks the caller's role first.
- `server.ts`: loaders that run only on the server.
- `config.ts` or `types.ts`: types, labels and small pure rules (for example `canComplete` in `tasks/config.ts`).
- `components/`: the area's screens and pieces.

**Known debt:** the names and shapes aren't consistent yet across domains (`config.ts` in one, `types.ts` in another, `layout.ts` in the calendar), and nothing yet says where hooks and contexts go. Making every domain the same shape is a goal in the [backlog](../backlog.md). Until then, follow the nearest existing domain, and don't add barrel files (index files that only re-export).

## How data moves

1. **On the server,** `src/app/(app)/layout.tsx` calls `getBootstrap()` (`domains/workspace/server.ts`): the team, the projects and the live tasks, in one round of parallel queries. It records the person's `last_seen_at` after the page is sent (`after()`).
2. **In the browser,** `WorkspaceProvider` (`domains/workspace/provider.tsx`) puts that into the TanStack Query cache. Hooks read from it: `useMe`, `useMembers`, `useTasks`, `useProjects`, `useToday`, `useNow` and others.
3. **Changes are optimistic:** a hook like `useUpdateTask` changes the cache first, then writes to Supabase **as the signed-in person**, so row-level security applies. If the database refuses, the cache rolls back and `explain()` (`domains/tasks/data.ts`) turns the error into a plain sentence.
4. **Other people's changes arrive live** through a Realtime channel on `postgres_changes`. The channel has to join with the session's token (`supabase.realtime.setAuth`): without it, the database filters everything out without an error.
5. **Notifications** are written by the database (triggers), not by screens. After a change that may have made one, `nudgeDelivery()` calls the `deliverNotifications` server action, which claims unsent rows (sets `emailed_at`, so nothing is sent twice) and emails them through Microsoft 365. Locally, they land in the mail catcher.
6. **The 8 AM email** comes from `/api/cron/reminders`, which Vercel calls daily with the `CRON_SECRET`.
7. **Invitations and password resets** ask Supabase only for a link (`generateLink`) and send the email themselves, because Supabase project A's email templates belong to the portal too ([decision](../decisions/0006-the-app-sends-its-own-sign-in-emails.md)).

## Where the rules live

- **The database is the source of truth** for who may do what, and it writes the history and the notifications ([decision](../decisions/0002-rules-live-in-the-database.md)). A screen can't forget a rule it never had to apply.
- **Server actions** use the service role key only where they must (managing people, sending emails). That key skips row-level security, so each action checks the caller's role first (`caller()` and `mayManage()` in `domains/people/actions.ts`).
- **Screens mirror the rules,** to hide what someone can't do and to explain refusals early: `canComplete` in `tasks/config.ts` mirrors `ppm_can_complete` in the database. Where code mirrors the database, a comment says "Mirrors …": change both together.

## Settings

| Setting | What it is | Reaches the browser |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The Supabase project, and its public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | The key that skips row-level security: server only | No |
| `NEXT_PUBLIC_APP_URL` | The PPM's address, for links in emails | Yes |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_FROM` | Email through Microsoft 365 | No |
| `CRON_SECRET` | Protects the 8 AM route | No |
| `NEXT_PUBLIC_DEMO_MODE`, `MAIL_DEV_URL` | **Local only:** sample-account switching, and the local mail catcher. Never in production | |

Only `NEXT_PUBLIC_*` values may reach the browser. Never commit `.env` files, never print their values.

## Dates and time

The team works in Manila (UTC+8). Instants are stored in UTC and shown in Manila time; days are ISO dates (`2026-10-06`). The helpers in `src/lib/dates.ts` (`isoDay`, `addDays`, `weekday`, `shortDate`, `manilaInstant` and others) do this consistently: use them rather than `new Date()` arithmetic.

## Security, in brief

- Redirects after sign-in go only to paths on this site (`safeNext` in `src/lib/utils.ts`).
- `next.config.ts` sends security headers: no framing, no type sniffing, a strict referrer policy, no camera, microphone or location.
- Profile photos and task files are in private storage buckets: photos through an authenticated route, files through short-lived signed links.
- Switching between sample accounts only works in local demo mode.

## Gotchas

- **The React Compiler is on.** Don't change props, and name a prop that holds a ref with `Ref` at the end (`justMovedRef`), or the lint rule stops the build.
- **`next dev` and `next build` use separate folders** inside `.next`, so you can build while the dev server runs.
- **On a Mac, if `next dev` says Ready but pages never load,** the file watcher is stuck: `npm run dev:poll`.
- **dnd-kit needs a stable `id`** on each `DndContext`, or the server and browser disagree (a hydration error).
